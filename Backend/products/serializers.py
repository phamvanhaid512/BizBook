from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.category_name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "product_name",
            "category",
            "category_name",
            "price",
            "stock_quantity",
            "unit",
            "description",
            "status",
            "created_at"
        ]