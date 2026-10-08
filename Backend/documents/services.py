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

if os.path.exists(r"C:\Program Files\Tesseract-OCR\tesseract.exe"):
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


class DocumentAnalysisService(BaseService):
    def __init__(self):
        self.doc_repo = DocumentAnalysisRepository()
        super().__init__(self.doc_repo, DocumentAnalysisSerializer)

    def analyze(self, image_file, user=None):
        try:
            file_bytes = np.asarray(bytearray(image_file.read()), dtype=np.uint8)
            image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

            if image is None:
                return self._error("Không thể giải mã file ảnh.")

            # 1. Kiểm tra dị thường quang học (Khắc phục lỗi nhận định nhầm cháy sáng)
            is_anomaly, anomaly_reasons = self._detect_anomalies(image)

            # 2. Tiền xử lý xoay nghiêng & tăng độ tương phản cục bộ
            preprocessed_image = self._preprocess_for_ocr(image)

            # 3. Trích xuất text & tính confidence_score từ Tesseract
            custom_config = r"--oem 3 --psm 6"
            ocr_data = pytesseract.image_to_data(
                preprocessed_image, lang="vie", config=custom_config, output_type=Output.DICT
            )
            extracted_text, confidence_score = self._calculate_ocr_accuracy(ocr_data)

            # 4. Tự động bóc tách các trường chi tiết
            parsed_data = self._extract_invoice_fields(extracted_text)

            # 5. Đánh giá cờ duyệt Human-in-the-loop
            needs_review = (
                confidence_score < 75.0
                or is_anomaly
                or (parsed_data.get("amount", 0) <= 0)
                or (not parsed_data.get("expense_date"))
            )
            if parsed_data.get("amount", 0) <= 0:
                anomaly_reasons.append("Không nhận diện được số tiền thanh toán.")
                is_anomaly = True

            # 6. Ghi log kiểm định vào cơ sở dữ liệu
            record = self.doc_repo.create_analysis(
                user=user,
                image_name=getattr(image_file, "name", "receipt.jpg"),
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

        # Tạo bản ghi chi phí chính thức kèm thông tin mở rộng
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

    def _detect_anomalies(self, image):
        """Kiểm định quang học chuẩn xác, tránh dương tính giả trên giấy trắng"""
        reasons = []
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # 1. Kiểm tra mờ nét (Laplacian)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 70.0:
            reasons.append(f"Ảnh mờ nét/rung tay (Độ nét: {round(laplacian_var, 1)} < 70.0)")

        # 2. Kiểm tra cháy sáng thật (True Glare)
        glare_mask = gray >= 252
        glare_ratio = np.sum(glare_mask) / gray.size
        # Chỉ cảnh báo nếu trên 15% diện tích bị bão hòa trắng và mất tương phản (vùng phẳng)
        if glare_ratio > 0.15:
            glare_std = np.std(gray[glare_mask])
            if glare_std < 5.0:
                reasons.append(f"Vùng chói sáng/lóa đèn Flash làm mất chi tiết ({round(glare_ratio * 100, 1)}% diện tích).")

        # 3. Kiểm tra thiếu sáng
        mean_brightness = np.mean(gray)
        if mean_brightness < 45.0:
            reasons.append(f"Ảnh quá tối, thiếu ánh sáng ({round(mean_brightness, 1)} < 45).")

        return len(reasons) > 0, reasons

    def _preprocess_for_ocr(self, image):
        """Xoay thẳng góc nghiêng và tăng cường độ sắc nét cục bộ"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Cân chỉnh góc nghiêng nếu tài liệu bị chụp xéo
        coords = np.column_stack(np.where(gray < 190))
        if len(coords) > 50:
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            if 0.5 < abs(angle) < 30:
                h, w = image.shape[:2]
                center = (w // 2, h // 2)
                mat = cv2.getRotationMatrix2D(center, angle, 1.0)
                gray = cv2.warpAffine(gray, mat, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

        # Nâng cao độ tương phản tương thích (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        contrast = clahe.apply(gray)

        # Nhị phân hóa thích ứng
        blurred = cv2.GaussianBlur(contrast, (3, 3), 0)
        return cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 13, 2
        )

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

        # 1. Trích xuất Ngày (dd/mm/yyyy hoặc dd-mm-yyyy)
        expense_date = datetime.now().date().strftime("%Y-%m-%d")
        date_match = re.search(r"(\b\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}\b)", text)
        if date_match:
            raw_date = date_match.group(1).replace(".", "/").replace("-", "/")
            for fmt in ("%d/%m/%Y", "%d/%m/%y"):
                try:
                    expense_date = datetime.strptime(raw_date, fmt).date().strftime("%Y-%m-%d")
                    break
                except ValueError:
                    pass

        # 2. Trích xuất Tổng tiền thanh toán
        amount = 0.0
        money_matches = re.findall(
            r"(?:tổng cộng|thanh toán|tiền mặt|total|amount|tổng)?[\s:=]*([\d\.\,]{4,15})\s*(?:vnđ|vnd|đ|k)?",
            text,
            re.IGNORECASE,
        )
        for match in money_matches:
            cleaned = re.sub(r"[^\d]", "", match)
            if cleaned.isdigit() and float(cleaned) > amount:
                amount = float(cleaned)

        if amount == 0:
            numbers = re.findall(r"\b\d{1,3}(?:[\.\,]\d{3})+(?:\s*(?:đ|vnđ|vnd))?\b", text, re.IGNORECASE)
            if numbers:
                candidates = [float(re.sub(r"[^\d]", "", n)) for n in numbers]
                amount = max(candidates)

        # 3. Trích xuất Tên đơn vị / Nhà cung cấp
        supplier_name = "Nhà cung cấp tự do"
        supplier_keywords = ["công ty", "cửa hàng", "ncc", "đại lý", "tiệm", "siêu thị", "winmart", "bách hóa"]
        for line in lines[:8]:
            if any(k in line.lower() for k in supplier_keywords):
                supplier_name = line
                break

        # 4. Trích xuất Số hóa đơn / Mã chứng từ
        invoice_number = ""
        inv_match = re.search(r"(?:số hđ|số|no\.|shđ|hóa đơn số|mã hđ)[\s:=]*([a-zA-Z0-9\-_/]{4,20})", text, re.IGNORECASE)
        if inv_match:
            invoice_number = inv_match.group(1).strip()

        # 5. Nhận diện Phương thức thanh toán
        payment_method = "TIỀN MẶT"
        text_lower = text.lower()
        if any(w in text_lower for w in ["chuyển khoản", "qr", "banking", "ck"]):
            payment_method = "CHUYỂN KHOẢN"
        elif any(w in text_lower for w in ["thẻ", "pos", "visa", "mastercard"]):
            payment_method = "THẺ"

        # 6. Gợi ý Danh mục chi phí phù hợp
        suggested_category_id = ""
        categories = list(ExpenseCategory.objects.all().values("id", "name"))
        for cat in categories:
            cat_name = cat["name"].lower()
            if "điện" in cat_name and any(w in text_lower for w in ["điện", "evn", "kwh"]):
                suggested_category_id = cat["id"]
                break
            if "nguyên vật liệu" in cat_name and any(w in text_lower for w in ["thịt", "sữa", "đường", "rau", "bách hóa"]):
                suggested_category_id = cat["id"]
                break
            if "viễn thông" in cat_name and any(w in text_lower for w in ["internet", "fpt", "viettel", "vnpt"]):
                suggested_category_id = cat["id"]
                break

        return {
            "expense_date": expense_date,
            "amount": amount,
            "supplier_name": supplier_name,
            "invoice_number": invoice_number,
            "payment_method": payment_method,
            "category_id": suggested_category_id,
            "description": f"Số hóa chi phí từ {supplier_name}" + (f" (HĐ: {invoice_number})" if invoice_number else ""),
        }

    @staticmethod
    def _error(message):
        return {"success": False, "message": message, "data": None}