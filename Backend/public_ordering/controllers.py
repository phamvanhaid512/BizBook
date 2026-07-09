from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from common.api_response import ApiResponse
from common.untils import RequestData
from .service import PublicOrderingService

public_ordering_service = PublicOrderingService()


@csrf_exempt
@require_http_methods(["GET"])
def get_menu_by_table(request, table_id):
    result = public_ordering_service.get_menu_by_table(table_id)
    if not result["success"]:
        return ApiResponse.error(
            result["message"],
            404,
            result["data"]
        )
    return ApiResponse.success(
        result["data"],
        result["message"]
    )


@csrf_exempt
@require_http_methods(["POST"])
def create_public_order(request):
    data = RequestData.get_body(request)

    result = public_ordering_service.create_order_from_qr(data)

    if not result["success"]:
        return ApiResponse.error(
            result["message"],
            400,
            result["data"]
        )

    return ApiResponse.success(
        result["data"],
        result["message"],
        201
    )