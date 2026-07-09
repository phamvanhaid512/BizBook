from rest_framework import serializers
from .models import Customer

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id",
            "customer_name",
            "phone",
            "email",
            "address",
            "status",
            "created_at"
        ]