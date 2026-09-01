from rest_framework import serializers
from .models import DocumentAnalysis


class DocumentAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentAnalysis
        fields = "__all__"


class ConfirmDocumentRequestSerializer(serializers.Serializer):
    document_id = serializers.IntegerField(required=True)
    category_id = serializers.IntegerField(required=False, allow_null=True)
    expense_date = serializers.DateField(required=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    supplier_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")