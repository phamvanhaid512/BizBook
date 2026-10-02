from django.db import models
from django.utils import timezone


class Warehouse(models.Model):
    STATUS_CHOICES = (
        ("ACTIVE", "Đang hoạt động"),
        ("INACTIVE", "Ngừng hoạt động"),
    )

    code = models.CharField(max_length=50, unique=True, verbose_name="Mã kho")
    name = models.CharField(max_length=255, verbose_name="Tên kho")
    location = models.CharField(max_length=255, null=True, blank=True, verbose_name="Vị trí/Địa chỉ")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIVE")
    created_at = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = "inventory_warehouses"
        verbose_name = "Kho hàng"
        verbose_name_plural = "Danh sách kho hàng"

    def __str__(self):
        return f"{self.code} - {self.name}"

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "location": self.location,
            "status": self.status,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
        }


class Stock(models.Model):
    # Khóa ngoại sinh ra cột 'product_id' trong database MySQL/MariaDB
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="stocks",
        verbose_name="Sản phẩm"
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name="stocks",
        verbose_name="Kho lưu trữ"
    )
    quantity = models.IntegerField(default=0, verbose_name="Số lượng tồn")
    min_threshold = models.IntegerField(default=10, verbose_name="Ngưỡng cảnh báo tối thiểu")
    created_at = models.DateTimeField(default=timezone.now, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventory_stocks"
        # Ràng buộc: Mỗi sản phẩm tại 1 kho chỉ có đúng 1 bản ghi tồn kho
        unique_together = ("product", "warehouse")
        verbose_name = "Tồn kho sản phẩm"
        verbose_name_plural = "Danh sách tồn kho"

    @property
    def is_low_stock(self):
        return self.quantity <= self.min_threshold

    def __str__(self):
        prod_name = getattr(self.product, "name", f"SP #{self.product_id}")
        return f"[{self.warehouse.code}] {prod_name} - Tồn: {self.quantity}"

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": getattr(self.product, "name", None),
            "product_price": getattr(self.product, "price", 0),
            "warehouse_id": self.warehouse_id,
            "warehouse_code": self.warehouse.code if self.warehouse else None,
            "warehouse_name": self.warehouse.name if self.warehouse else None,
            "quantity": self.quantity,
            "min_threshold": self.min_threshold,
            "is_low_stock": self.is_low_stock,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S") if self.updated_at else None,
        }


class StockMovement(models.Model):
    MOVEMENT_TYPES = (
        ("IMPORT", "Nhập kho"),
        ("EXPORT", "Xuất kho / Bán hàng"),
        ("TRANSFER", "Chuyển kho"),
    )

    stock = models.ForeignKey(
        Stock,
        on_delete=models.CASCADE,
        related_name="movements",
        verbose_name="Bản ghi tồn kho"
    )
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES, verbose_name="Loại giao dịch")
    quantity = models.IntegerField(verbose_name="Số lượng")
    reference_code = models.CharField(max_length=100, blank=True, null=True, verbose_name="Mã tham chiếu (Đơn hàng/Phiếu nhập)")
    note = models.TextField(blank=True, null=True, verbose_name="Ghi chú")
    created_at = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = "inventory_stock_movements"
        verbose_name = "Biến động kho"
        verbose_name_plural = "Lịch sử biến động kho"

    def __str__(self):
        prod_name = getattr(self.stock.product, "name", f"SP #{self.stock.product_id}")
        return f"{self.get_movement_type_display()} - {prod_name} ({self.quantity})"