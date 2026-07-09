from rest_framework import serializers
from .models import Bussiness_Tables


class BusinessTableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bussiness_Tables
        fields = [
            "id",
            "table_name",
            "qr_code",
            "status",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "qr_code",
            "created_at",
        ]