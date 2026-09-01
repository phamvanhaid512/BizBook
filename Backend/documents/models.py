from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class DocumentAnalysis(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Chờ xác nhận"
        CONFIRMED = "CONFIRMED", "Đã xác nhận"
        REJECTED = "REJECTED", "Đã từ chối"

    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="document_analyses"
    )
    image_name = models.CharField(max_length=255)
    extracted_text = models.TextField(blank=True, default="")
    confidence_score = models.FloatField(default=0.0)
    anomaly_detected = models.BooleanField(default=False)
    anomaly_reasons = models.JSONField(default=list, blank=True)
    needs_human_review = models.BooleanField(default=False)
    parsed_data = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "document_analyses"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.image_name} - Score: {self.confidence_score}%"