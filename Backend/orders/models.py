from django.db import models

from customers.models import Customer
from bussiness_tables.models import Bussiness_Tables
from accounts.models import Account
from products.models import Product


class Order(models.Model):
    STATUS_CHOICES = (
        ("PENDING", "Chờ xử lý"),
        ("PROCESSING", "Đang xử lý"),
        ("COMPLETED", "Hoàn thành"),
        ("CANCELLED", "Đã hủy"),
    )

    PAYMENT_STATUS_CHOICES = (
        ("UNPAID", "Chưa thanh toán"),
        ("PAID", "Đã thanh toán"),
    )

    order_code = models.CharField(
        max_length=50,
        unique=True
    )

    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders"
    )

    table = models.ForeignKey(
        Bussiness_Tables,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders"
    )

    created_by = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_orders"
    )

    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="UNPAID"
    )

    note = models.TextField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        db_table = "orders"
        ordering = ["-id"]

    def __str__(self):
        return f"{self.id} - {self.order_code}"


class OrderDetail(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="details"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        related_name="order_details"
    )

    quantity = models.PositiveIntegerField(default=1)

    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    class Meta:
        db_table = "order_details"
        ordering = ["id"]

    def __str__(self):
        product_name = self.product.product_name if self.product else "Unknown Product"
        return f"Order #{self.order.id} - {product_name} x {self.quantity}"