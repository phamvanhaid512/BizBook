import json
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from common.api_response import ApiResponse
from common.decorators import jwt_required, role_required
from common.error_handler import handle_api_exception
from .services import ExpenseService

expense_service = ExpenseService()


class RequestData:
    @staticmethod
    def get_body(request):
        if request.content_type == "application/json":
            try:
                return json.loads(request.body.decode("utf-8"))
            except Exception:
                return {}
        return request.POST.dict()


@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
@role_required(["ADMIN", "OWNER"])
def list_categories(request):
    try:
        result = expense_service.get_categories()
        return ApiResponse.success(result.get("data"), result.get("message"), 200)
    except Exception as error:
        return handle_api_exception(error=error, api_name="list_categories", request=request)


@csrf_exempt
@require_http_methods(["GET", "POST"])
@jwt_required
@role_required(["ADMIN", "OWNER"])
def expenses_list_create(request):
    try:
        user = getattr(request, "current_user", getattr(request, "user", None))
        if request.method == "POST":
            data = RequestData.get_body(request)
            result = expense_service.create_expense(user=user, data=data)
            if not result.get("success"):
                return ApiResponse.error(result.get("message"), 400, result.get("data"))
            return ApiResponse.success(result.get("data"), result.get("message"), 201)

        # GET parameters
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")
        category_id = request.GET.get("category_id")

        # Đọc và ép kiểu page, page_size an toàn
        try:
            page = max(1, int(request.GET.get("page", 1)))
        except (ValueError, TypeError):
            page = 1

        try:
            page_size = max(1, min(100, int(request.GET.get("page_size", request.GET.get("limit", 10)))))
        except (ValueError, TypeError):
            page_size = 10

        result = expense_service.list_expenses(
            start_date=start_date,
            end_date=end_date,
            category_id=category_id,
            page=page,
            page_size=page_size,
        )
        return ApiResponse.success(result.get("data"), result.get("message"), 200)
    except Exception as error:
        return handle_api_exception(error=error, api_name="expenses_list_create", request=request)

@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
@jwt_required
@role_required(["ADMIN", "OWNER"])
def expense_detail(request, expense_id):
    try:
        if request.method == "DELETE":
            result = expense_service.delete_expense(expense_id)
            if not result.get("success"):
                return ApiResponse.error(result.get("message"), 404)
            return ApiResponse.success(None, result.get("message"), 200)

        if request.method == "PUT":
            data = RequestData.get_body(request)
            result = expense_service.update_expense(expense_id, data)
            if not result.get("success"):
                return ApiResponse.error(result.get("message"), 400, result.get("data"))
            return ApiResponse.success(result.get("data"), result.get("message"), 200)

        expense = expense_service.expense_repo.get_by_id(expense_id)
        if not expense:
            return ApiResponse.error("Khoản chi không tồn tại.", 404)
        from .serializers import ExpensesSerializer
        return ApiResponse.success(ExpensesSerializer(expense).data, "Thành công", 200)
    except Exception as error:
        return handle_api_exception(error=error, api_name="expense_detail", request=request)


@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
@role_required(["ADMIN", "OWNER"])
def expense_summary(request):
    try:
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")
        if not start_date or not end_date:
            return ApiResponse.error("Vui lòng cung cấp start_date và end_date (YYYY-MM-DD)", 400)

        result = expense_service.get_summary(start_date, end_date)
        return ApiResponse.success(result.get("data"), result.get("message"), 200)
    except Exception as error:
        return handle_api_exception(error=error, api_name="expense_summary", request=request)