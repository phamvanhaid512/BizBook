from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

from accounts.models import Account


class AIConversation(models.Model):
    user = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name="ai_conversations",
    )

    title = models.CharField(
        max_length=255,
        default="Cuộc trò chuyện mới",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_conversations"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.title} - {self.user_id}"


class AIMessage(models.Model):
    class Role(models.TextChoices):
        USER = "USER", "Người dùng"
        ASSISTANT = "ASSISTANT", "AI"

    conversation = models.ForeignKey(
        AIConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
    )

    content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.role} - {self.conversation_id}"


class OCRDocument(models.Model):
    class Status(models.TextChoices):
        PROCESSING = "PROCESSING", "Đang xử lý"
        COMPLETED = "COMPLETED", "Hoàn thành"
        WARNING = "WARNING", "Cần kiểm tra"
        FAILED = "FAILED", "Thất bại"

    user = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name="ocr_documents",
    )

    # Dùng FileField nếu muốn nhận cả ảnh và PDF
    file = models.FileField(
        upload_to="ocr_documents/%Y/%m/",
    )

    file_name = models.CharField(max_length=255)

    # Lưu toàn bộ văn bản OCR nhận diện được
    extracted_text = models.TextField(
        blank=True,
        default="",
    )

    # Lưu dữ liệu đã tách như tổng tiền, ngày, tên cửa hàng...
    extracted_data = models.JSONField(
        default=dict,
        blank=True,
    )

    # Quy ước điểm từ 0 đến 100
    confidence_score = models.FloatField(
        null=True,
        blank=True,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100),
        ],
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PROCESSING,
    )

    warnings = models.JSONField(
        default=list,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ocr_documents"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.file_name} - {self.status}"