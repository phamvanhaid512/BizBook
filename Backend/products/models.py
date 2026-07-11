from django.db import models
from categories.models import Categories


class Product(models.Model):
    STATUS_CHOICES = (
        ("ACTIVE", "Đang bán"),
        ("INACTIVE", "Ngừng bán"),
    )

    product_name = models.CharField(max_length=255)
    category = models.ForeignKey(
        Categories,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products"
    )
    price = models.DecimalField(max_digits=12, decimal_places=2)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2,default=0)
    stock_quantity = models.IntegerField(default=0)
    unit = models.CharField(max_length=50, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIVE")
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )
    class Meta:
        db_table = "products"

    def __str__(self):
        return self.product_name

    def to_dict(self):
        return {
            "id": self.id,
            "product_name": self.product_name,
            "category_id": self.category.id if self.category else None,
            "category_name": self.category.category_name if self.category else None,
            "price": float(self.price),
            "stock_quantity": self.stock_quantity,
            "unit": self.unit,
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }