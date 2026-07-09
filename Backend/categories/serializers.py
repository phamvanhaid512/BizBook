from rest_framework import serializers
from .models import Categories


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Categories
        fields = "__all__"

    def validate_category_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Tên danh mục không được để trống")
        return value