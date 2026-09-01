from common.base_repository import BaseRepository
from django.db.models import Sum, Count
from .models import ExpenseCategory, Expenses


class ExpenseCategoryRepository(BaseRepository):
    def __init__(self):
        super().__init__(ExpenseCategory)

    def get_all(self):
        return self.get_model().objects.all()

    def get_by_id(self, category_id):
        return self.get_model().objects.filter(id=category_id).first()


class ExpensesRepository(BaseRepository):
    def __init__(self):
        super().__init__(Expenses)

    def create(self, **kwargs):
        # Hỗ trợ cả truyền dict payload lẫn kwargs rời
        data = kwargs.get("data", kwargs)
        return self.get_model().objects.create(**data)

    def get_filtered(self, start_date=None, end_date=None, category_id=None, status="CONFIRMED"):
        qs = self.get_model().objects.select_related("category").all()
        if status:
            qs = qs.filter(status=status)
        if start_date and end_date:
            qs = qs.filter(expense_date__range=(start_date, end_date))
        elif start_date:
            qs = qs.filter(expense_date__gte=start_date)
        elif end_date:
            qs = qs.filter(expense_date__lte=end_date)
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs.order_by("-expense_date", "-created_at")

    def get_summary_by_date_range(self, start_date, end_date):
        qs = self.get_model().objects.filter(
            status="CONFIRMED", expense_date__range=(start_date, end_date)
        )
        total_amount = qs.aggregate(total=Sum("amount"))["total"] or 0
        by_category = list(
            qs.values("category__id", "category__name")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )
        return {"total_amount": float(total_amount), "by_category": by_category}

    def get_by_id(self, expense_id):
        return self.get_model().objects.select_related("category").filter(id=expense_id).first()