from rest_framework import serializers
from .models import Warehouse, Stock, StockMovement


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ["id", "code", "name", "location", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class StockSerializer(serializers.ModelSerializer):
    warehouse_code = serializers.CharField(source="warehouse.code", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_price = serializers.DecimalField(
        source="product.price", max_digits=12, decimal_places=0, read_only=True
    )
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Stock
        fields = [
            "id",
            "product",
            "product_name",
            "product_price",
            "warehouse",
            "warehouse_code",
            "warehouse_name",
            "quantity",
            "min_threshold",
            "is_low_stock",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="stock.product.name", read_only=True)
    warehouse_code = serializers.CharField(source="stock.warehouse.code", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "stock",
            "product_name",
            "warehouse_code",
            "movement_type",
            "quantity",
            "reference_code",
            "note",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class StockTransactionRequestSerializer(serializers.Serializer):
    stock_id = serializers.IntegerField(required=True)
    action_type = serializers.ChoiceField(choices=["IMPORT", "EXPORT", "TRANSFER"], required=True)
    quantity = serializers.IntegerField(min_value=1, required=True)
    reference_code = serializers.CharField(required=False, allow_blank=True, default="")
    note = serializers.CharField(required=False, allow_blank=True, default="")
    # SỬA DÒNG NÀY: null=True -> allow_null=True
    target_warehouse_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)