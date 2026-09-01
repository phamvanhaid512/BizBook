from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class ExpenseCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "expense_categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Expenses(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Bản nháp"
        CONFIRMED = "CONFIRMED", "Đã xác nhận"
        CANCELLED = "CANCELLED", "Đã hủy"

    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses"
    )
    category = models.ForeignKey(
        ExpenseCategory, on_delete=models.PROTECT, related_name="expenses", null=True, blank=True
    )
    
    # Bổ sung duy nhất trường này: Tên nơi bán / người nhận tiền bóc tách từ OCR
    supplier_name = models.CharField(
        max_length=255, blank=True, default="", verbose_name="Nhà cung cấp / Bên nhận"
    )
    
    expense_date = models.DateField(default=timezone.now)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.CONFIRMED
    )
    receipt_image = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "expenses"
        ordering = ["-expense_date", "-created_at"]

    def __str__(self):
        cat_name = self.category.name if self.category else "Chưa phân loại"
        supp = f" ({self.supplier_name})" if self.supplier_name else ""
        return f"{cat_name}{supp} - {self.amount:,.0f} VNĐ ({self.expense_date})"

