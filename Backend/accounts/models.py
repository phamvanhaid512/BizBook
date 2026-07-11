from django.utils import timezone
from django.db import models
from django.contrib.auth.models import AbstractUser


class Account(AbstractUser):
    ROLE_CHOICES = (
        ("ADMIN", "Quản trị viên"),
        ("OWNER", "Chủ hộ kinh doanh"),
        ("STAFF", "Nhân viên"),
    )

    STATUS_CHOICES = (
        ("ACTIVE", "Đang hoạt động"),
        ("LOCKED", "Đã khóa"),
    )

    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="OWNER")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIVE")
    created_at = models.DateTimeField(
    default=timezone.now
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )
    class Meta:
        db_table = "accounts"

    def __str__(self):
        return self.username

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "status": self.status,
            "is_active": self.is_active,
            "date_joined": self.date_joined.strftime("%Y-%m-%d %H:%M:%S")
        }