from common.base_repository import BaseRepository
from .models import DocumentAnalysis


class DocumentAnalysisRepository(BaseRepository):
    def __init__(self):
        super().__init__(DocumentAnalysis)

    def create_analysis(self, user, image_name, extracted_text, confidence_score, anomaly_detected, anomaly_reasons, needs_human_review, parsed_data=None):
        return self.get_model().objects.create(
            user=user if getattr(user, "is_authenticated", False) else None,
            image_name=image_name,
            extracted_text=extracted_text,
            confidence_score=confidence_score,
            anomaly_detected=anomaly_detected,
            anomaly_reasons=anomaly_reasons,
            needs_human_review=needs_human_review,
            parsed_data=parsed_data or {},
            status=DocumentAnalysis.Status.PENDING,
        )

    def get_by_id_and_user(self, document_id, user):
        qs = self.get_model().objects.filter(id=document_id)
        if user and getattr(user, "is_authenticated", False):
            qs = qs.filter(user=user)
        return qs.first()

    def get_all_by_user(self, user):
        return self.get_model().objects.filter(user=user).order_by("-created_at")