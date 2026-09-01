import os
import re
import cv2
import numpy as np
import pytesseract
from pytesseract import Output
from datetime import datetime
from django.db import transaction

from common.base_service import BaseService
from expenses.models import Expenses, ExpenseCategory
from .repositories import DocumentAnalysisRepository
from .serializers import DocumentAnalysisSerializer, ConfirmDocumentRequestSerializer

# Tùy chỉnh đường dẫn Tesseract nếu chạy trên Windows
if os.path.exists(r"C:\Program Files\Tesseract-OCR\tesseract.exe"):
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


class DocumentAnalysisService(BaseService):
    def __init__(self):
        self.doc_repo = DocumentAnalysisRepository()

        super().__init__(self.doc_repo,DocumentAnalysisSerializer)

    def analyze(self, image_file, user=None):
        try:
            file_bytes = np.asarray(bytearray(image_file.read()), dtype=np.uint8)
            image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

            if image is None:
                return self._error("Không thể giải mã file ảnh.")

            # 1. Kiểm tra dị thường quang học (Blur / Exposure)
            is_anomaly, anomaly_reasons = self._detect_anomalies(image)

            # 2. Tiền xử lý ảnh tăng độ nét
            preprocessed_image = self._preprocess_for_ocr(image)

            # 3. Trích xuất text & tính confidence_score
            ocr_data = pytesseract.image_to_data(
                preprocessed_image, lang="vie", output_type=Output.DICT
            )
            extracted_text, confidence_score = self._calculate_ocr_accuracy(ocr_data)

            # 4. Tự động bóc tách các trường hóa đơn
            parsed_data = self._extract_invoice_fields(extracted_text)

            # 5. Đánh giá cờ Human-in-the-loop
            needs_review = (
                confidence_score < 85.0
                or is_anomaly
                or (parsed_data.get("amount", 0) <= 0)
                or (not parsed_data.get("expense_date"))
            )
            if parsed_data.get("amount", 0) <= 0:
                anomaly_reasons.append("Không nhận diện được số tiền hoặc số tiền bằng 0.")
                is_anomaly = True

            # 6. Ghi log kiểm định vào database
            record = self.doc_repo.create_analysis(
                user=user,
                image_name=image_file.name,
                extracted_text=extracted_text,
                confidence_score=confidence_score,
                anomaly_detected=is_anomaly,
                anomaly_reasons=anomaly_reasons,
                needs_human_review=needs_review,
                parsed_data=parsed_data,
            )

            return {
                "success": True,
                "message": "Phân tích và kiểm định chứng từ thành công.",
                "data": DocumentAnalysisSerializer(record).data,
            }
        except Exception as e:
            return self._error(f"Lỗi phân tích chứng từ: {str(e)}")

    @transaction.atomic
    def confirm_and_commit_expense(self, user, data):
        serializer = ConfirmDocumentRequestSerializer(data=data)
        if not serializer.is_valid():
            return {"success": False, "message": "Dữ liệu xác nhận không hợp lệ.", "data": serializer.errors}

        val = serializer.validated_data
        doc = self.doc_repo.get_by_id_and_user(val["document_id"], user)
        if not doc:
            return {"success": False, "message": "Không tìm thấy chứng từ kiểm định tương ứng.", "data": None}

        category = None
        if val.get("category_id"):
            category = ExpenseCategory.objects.filter(id=val["category_id"]).first()

        # Tạo bản ghi chi phí chính thức
        expense = Expenses.objects.create(
            user=user if getattr(user, "is_authenticated", False) else None,
            category=category,
            supplier_name=val.get("supplier_name", ""),
            expense_date=val["expense_date"],
            amount=val["amount"],
            description=val.get("description") or f"Số hóa tự động từ chứng từ {doc.image_name}",
            receipt_image=doc.image_name,
            status=Expenses.Status.CONFIRMED,
        )

        doc.status = doc.Status.CONFIRMED
        doc.save(update_fields=["status"])

        return {
            "success": True,
            "message": "Xác nhận và ghi nhận vào sổ chi phí thành công.",
            "data": {"expense_id": expense.id, "amount": float(expense.amount)},
        }

    def _preprocess_for_ocr(self, image):
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        return cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )

    def _detect_anomalies(self, image):
        reasons = []
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 80.0:
            reasons.append(f"Ảnh mờ nét/rung tay (Laplacian Score: {round(laplacian_var, 1)} < 80.0)")

        mean_brightness = np.mean(gray)
        if mean_brightness < 40:
            reasons.append("Ảnh quá tối, thiếu ánh sáng.")
        elif mean_brightness > 240:
            reasons.append("Ảnh bị lóa sáng/cháy sáng cục bộ.")

        return len(reasons) > 0, reasons

    def _calculate_ocr_accuracy(self, ocr_data):
        valid_words, valid_confidences = [], []
        for i in range(len(ocr_data["text"])):
            text = ocr_data["text"][i].strip()
            conf = int(ocr_data["conf"][i])
            if text and conf != -1:
                valid_words.append(text)
                valid_confidences.append(conf)

        extracted_text = " ".join(valid_words)
        avg_score = round(sum(valid_confidences) / len(valid_confidences), 2) if valid_confidences else 0.0
        return extracted_text, avg_score

    def _extract_invoice_fields(self, text):
        lines = [line.strip() for line in text.split("\n") if line.strip()]

        # 1. Tìm số tiền
        amount = 0.0
        money_matches = re.findall(
            r"(?:tổng cộng|thanh toán|tiền|tổng|vnd|vnđ|đ)?\s*[:=]?\s*([\d\.\,]+)\s*(?:vnđ|vnd|đ|k)?",
            text,
            re.IGNORECASE,
        )
        for match in money_matches:
            cleaned = match.replace(".", "").replace(",", "")
            if cleaned.isdigit() and float(cleaned) > amount:
                amount = float(cleaned)

        # 2. Tìm ngày tháng
        expense_date = datetime.now().date().strftime("%Y-%m-%d")
        date_match = re.search(r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})", text)
        if date_match:
            raw_date = date_match.group(1).replace(".", "/").replace("-", "/")
            try:
                expense_date = datetime.strptime(raw_date, "%d/%m/%Y").date().strftime("%Y-%m-%d")
            except ValueError:
                pass

        # 3. Tìm tên nhà cung cấp
        supplier_name = "Nhà cung cấp tự do"
        for line in lines[:5]:
            if any(k in line.lower() for k in ["công ty", "cửa hàng", "ncc", "đại lý", "tiệm"]):
                supplier_name = line
                break

        return {
            "expense_date": expense_date,
            "amount": amount,
            "supplier_name": supplier_name,
            "description": f"Nhập hàng từ {supplier_name}",
        }

    @staticmethod
    def _error(message):
        return {"success": False, "message": message, "data": None}