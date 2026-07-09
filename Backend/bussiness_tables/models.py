from django.db import models

# Create your models here.
class Bussiness_Tables(models.Model):
    STATUS_CHOICES = (
        ("AVAILABLE", "Trống"),
        ("OCCUPIED", "Đang có khách"),
        ("INACTIVE", "Ngừng sử dụng"),
    )
    table_name = models.CharField(max_length=100)
    qr_code = models.ImageField(
        upload_to="qr_codes/",
        null=True,
        blank=True
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="AVAILABLE")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bussiness_table"

    def __str__(self):
        return self.table_name
    
    def to_dict(self):
        return {
            "id": self.id,
            "table_name": self.table_name,
            "qr_code": self.qr_code.url if self.qr_code else None,
            "status": self.status,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }