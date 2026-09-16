from django.db import models
from bussiness_tables.models import Bussiness_Tables

class TableChatMessage(models.Model):
    class SenderType(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Khách hàng"
        STAFF = "STAFF", "Nhân viên"
        SYSTEM = "SYSTEM", "Hệ thống" # Dùng cho thông báo Gọi phục vụ/Thanh toán

    table = models.ForeignKey(
        Bussiness_Tables, on_delete=models.CASCADE, related_name="chat_messages"
    )
    sender_type = models.CharField(
        max_length=20, choices=SenderType.choices, default=SenderType.CUSTOMER
    )
    customer_name = models.CharField(max_length=100, blank=True, null=True)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "table_chat_messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.sender_type}] Bàn {self.table.table_name}: {self.content[:30]}"