import cv2
import numpy as np
import pytesseract
from pytesseract import Output
from ai_agent.repositories import DocumentAnalysisRepository
from ai_agent.serializers import DocumentAnalysisSerializer

class DocumentAnalysisService:
    def __init__(self):
        self.doc_repo = DocumentAnalysisRepository()

    def analyze(self, image_file, user=None):
        try:
            file_bytes = np.asarray(bytearray(image_file.read()), dtype=np.uint8)
            image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

            if image is None:
                return self._error("Không thể giải mã file ảnh.")

            # 1. Phát hiện bất thường quang học
            is_anomaly, anomaly_reasons = self._detect_anomalies(image)

            # 2. Xử lý ảnh nâng cao trước OCR
            preprocessed_image = self._preprocess_for_ocr(image)

            # 3. Trích xuất text và chấm điểm tin cậy
            ocr_data = pytesseract.image_to_data(
                preprocessed_image, lang="vie", output_type=Output.DICT
            )
            extracted_text, confidence_score = self._calculate_ocr_accuracy(ocr_data)

            # 4. Quyết định Human-in-the-loop
            needs_review = confidence_score < 85.0 or is_anomaly

            # 5. Lưu kết quả vào DB
            record = self.doc_repo.create(
                user=user,
                image_name=image_file.name,
                extracted_text=extracted_text,
                confidence_score=confidence_score,
                anomaly_detected=is_anomaly,
                anomaly_reasons=anomaly_reasons,
                needs_human_review=needs_review,
            )

            return {
                "success": True,
                "message": "Phân tích văn bản thành công.",
                "data": DocumentAnalysisSerializer(record).data,
            }
        except Exception as e:
            return self._error(f"Lỗi phân tích văn bản: {str(e)}")

    def _preprocess_for_ocr(self, image):
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        # Khử nhiễu và tăng độ tương phản cục bộ
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        binary = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        return binary

    def _detect_anomalies(self, image):
        reasons = []
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Kiểm tra độ mờ (Blur detection qua Laplacian Variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 80.0:
            reasons.append(f"Chất lượng ảnh mờ/nhiễu (Score: {round(laplacian_var, 2)})")

        # Kiểm tra bất thường về chiếu sáng (Quá tối hoặc cháy sáng)
        mean_brightness = np.mean(gray)
        if mean_brightness < 40:
            reasons.append("Ảnh quá tối, thiếu ánh sáng nghiêm trọng.")
        elif mean_brightness > 245:
            reasons.append("Ảnh bị cháy sáng cục bộ hoặc toàn phần.")

        return len(reasons) > 0, reasons

    def _calculate_ocr_accuracy(self, ocr_data):
        valid_words = []
        valid_confidences = []

        total_entries = len(ocr_data["text"])
        for i in range(total_entries):
            text = ocr_data["text"][i].strip()
            conf = int(ocr_data["conf"][i])

            if text and conf != -1:
                valid_words.append(text)
                valid_confidences.append(conf)

        extracted_text = " ".join(valid_words)
        avg_score = (
            round(sum(valid_confidences) / len(valid_confidences), 2)
            if valid_confidences
            else 0.0
        )
        return extracted_text, avg_score

    @staticmethod
    def _error(message):
        return {"success": False, "message": message, "data": None}