from rest_framework import serializers


class PublicOrderItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class PublicCreateOrderSerializer(serializers.Serializer):
    table_id = serializers.IntegerField()
    note = serializers.CharField(required=False, allow_blank=True)
    items = PublicOrderItemSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError(
                "Đơn hàng phải có ít nhất một sản phẩm"
            )
        return value