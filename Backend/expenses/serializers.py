from rest_framework import serializers
from .models import ExpenseCategory, Expenses


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ["id", "name", "description", "created_at"]


class ExpensesSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Expenses
        fields = [
            "id",
            "category",
            "category_name",
            "expense_date",
            "amount",
            "description",
            "status",
            "receipt_image",
            "created_at",
            "updated_at",
        ]


class CreateExpenseSerializer(serializers.Serializer):
    category_id = serializers.IntegerField(required=True)
    expense_date = serializers.DateField(required=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    receipt_image = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class UpdateExpenseSerializer(serializers.Serializer):
    category_id = serializers.IntegerField(required=False)
    expense_date = serializers.DateField(required=False)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=Expenses.Status.choices, required=False)



class ConfirmDocumentRequestSerializer(serializers.Serializer):
    document_id = serializers.IntegerField(required=True)
    category_id = serializers.IntegerField(required=True)
    expense_date = serializers.DateField(required=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    description = serializers.CharField(required=False, allow_blank=True, default="")