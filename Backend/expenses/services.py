import re
from django.core.paginator import Paginator, EmptyPage
from datetime import datetime, date
from common.base_service import BaseService
from .models import Expenses
from .repositories import ExpenseCategoryRepository, ExpensesRepository
from .serializers import (
    ExpenseCategorySerializer,
    ExpensesSerializer,
    CreateExpenseSerializer,
    UpdateExpenseSerializer,
)


class ExpenseService(BaseService):
    def __init__(self):
        self.category_repo = ExpenseCategoryRepository()
        self.expense_repo = ExpensesRepository()
        super().__init__(self.expense_repo, ExpensesSerializer)

    def _normalize_date(self, date_str):
        """Làm sạch và chuẩn hóa chuỗi ngày tháng về dạng datetime.date"""
        if not date_str:
            return None
        if isinstance(date_str, datetime):
            return date_str.date()
        if isinstance(date_str, date):
            return date_str

        # Xóa bỏ dấu nháy kép, nháy đơn và khoảng trắng thừa
        cleaned = re.sub(r'["\'\s]', "", str(date_str))

        formats = [
            "%Y-%m-%d",  # 2026-07-20
            "%d-%m-%Y",  # 20-07-2026
            "%d/%m/%Y",  # 20/07/2026
            "%Y/%m/%d",  # 2026/07/20
        ]
        for fmt in formats:
            try:
                return datetime.strptime(cleaned, fmt).date()
            except ValueError:
                continue

        return cleaned

    def get_categories(self):
        categories = self.category_repo.get_all()
        return {
            "success": True,
            "message": "Lấy danh mục chi phí thành công.",
            "data": ExpenseCategorySerializer(categories, many=True).data,
        }

    def list_expenses(self, start_date=None, end_date=None, category_id=None, page=1, page_size=10):    
        valid_start = self._normalize_date(start_date)
        valid_end = self._normalize_date(end_date)

        # Giả định get_filtered trả về một Django QuerySet
        expenses = self.expense_repo.get_filtered(
            start_date=valid_start, end_date=valid_end, category_id=category_id
        )

        paginator = Paginator(expenses, page_size)
        try:
            paginated_page = paginator.page(page)
        except EmptyPage:
            paginated_page = paginator.page(paginator.num_pages if paginator.num_pages > 0 else 1)

        return {
            "success": True,
            "message": "Lấy danh sách chi phí thành công.",
            "data": {
                "items": ExpensesSerializer(paginated_page.object_list, many=True).data,
                "pagination": {
                    "current_page": paginated_page.number,
                    "page_size": page_size,
                    "total_items": paginator.count,
                    "total_pages": paginator.num_pages,
                    "has_next": paginated_page.has_next(),
                    "has_previous": paginated_page.has_previous(),
                },
            },
        }

    def create_expense(self, user, data):
        serializer = CreateExpenseSerializer(data=data)
        if not serializer.is_valid():
            return {
                "success": False,
                "message": "Dữ liệu không hợp lệ.",
                "data": serializer.errors,
            }

        val = serializer.validated_data
        category = self.category_repo.get_by_id(val["category_id"])
        if not category:
            return {
                "success": False,
                "message": "Danh mục chi phí không tồn tại.",
                "data": None,
            }

        expense = self.expense_repo.create(
            user=user if getattr(user, "is_authenticated", False) else None,
            category=category,
            expense_date=val["expense_date"],
            amount=val["amount"],
            description=val.get("description", ""),
            receipt_image=val.get("receipt_image"),
            status=Expenses.Status.CONFIRMED,
        )
        return {
            "success": True,
            "message": "Ghi nhận chi phí thành công.",
            "data": ExpensesSerializer(expense).data,
        }

    def update_expense(self, expense_id, data):
        expense = self.expense_repo.get_by_id(expense_id)
        if not expense:
            return {
                "success": False,
                "message": "Khoản chi không tồn tại.",
                "data": None,
            }

        serializer = UpdateExpenseSerializer(data=data)
        if not serializer.is_valid():
            return {
                "success": False,
                "message": "Dữ liệu không hợp lệ.",
                "data": serializer.errors,
            }

        val = serializer.validated_data
        if "category_id" in val:
            category = self.category_repo.get_by_id(val["category_id"])
            if not category:
                return {
                    "success": False,
                    "message": "Danh mục chi phí không tồn tại.",
                    "data": None,
                }
            expense.category = category

        if "expense_date" in val:
            expense.expense_date = val["expense_date"]
        if "amount" in val:
            expense.amount = val["amount"]
        if "description" in val:
            expense.description = val["description"]
        if "status" in val:
            expense.status = val["status"]

        expense.save()
        return {
            "success": True,
            "message": "Cập nhật chi phí thành công.",
            "data": ExpensesSerializer(expense).data,
        }

    def delete_expense(self, expense_id):
        expense = self.expense_repo.get_by_id(expense_id)
        if not expense:
            return {
                "success": False,
                "message": "Khoản chi không tồn tại.",
                "data": None,
            }

        self.expense_repo.delete(expense)
        return {"success": True, "message": "Xóa khoản chi thành công.", "data": None}

    def get_summary(self, start_date, end_date):
        valid_start = self._normalize_date(start_date)
        valid_end = self._normalize_date(end_date)
        summary_data = self.expense_repo.get_summary_by_date_range(valid_start, valid_end)
        return {
            "success": True,
            "message": "Lấy tổng hợp chi phí thành công.",
            "data": summary_data,
        }