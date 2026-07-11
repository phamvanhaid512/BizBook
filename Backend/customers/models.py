from django.db import models

# Create your models here.
class Customer(models.Model):
    STATUS_CHOICES = (
        ("ACTIVE", "Đang hoạt động"),
        ("INACTIVE", "Ngừng hoạt động"),
    )
    
    customer_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIVE")
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        db_table = "customers"
    
    def __str__(self):
        return self.customer_name

        