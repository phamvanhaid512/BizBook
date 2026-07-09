from rest_framework import serializers
from .models import Order, OrderDetail
from products.models import Product


class OrderDetailSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.product_name",
        read_only=True
    )

    class Meta:
        model = OrderDetail
        fields = [
            "id",
            "order",
            "product",
            "product_name",
            "quantity",
            "unit_price",
            "total_price"
        ]
        read_only_fields = ["order", "unit_price", "total_price"]


class OrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.customer_name",
        read_only=True
    )

    created_by_name = serializers.CharField(
        source="created_by.full_name",
        read_only=True
    )

    details = OrderDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = "__all__"


class CreateOrderItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class CreateOrderSerializer(serializers.Serializer):
    customer = serializers.IntegerField(required=False, allow_null=True)
    created_by = serializers.IntegerField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True)
    items = CreateOrderItemSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Đơn hàng phải có ít nhất một sản phẩm")
        return value