from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from common.api_response import ApiResponse
from common.decorators import jwt_required, role_required

from .service import DashBoardService


dashboard_service = DashBoardService()


@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
@role_required(["ADMIN"])
def get_dashboard_summary(request):
    result = dashboard_service.get_dashboard_summary(
        filter_type=request.GET.get("filter", "day"),
        date_value=request.GET.get("date"),
        month=request.GET.get("month"),
        year=request.GET.get("year"),
    )

    if not result["success"]:
        return ApiResponse.error(
            result["message"],
            400,
            result.get("data")
        )

    return ApiResponse.success(
        result["data"],
        result["message"],
        200
    )