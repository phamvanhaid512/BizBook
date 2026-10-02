from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from common.api_response import ApiResponse
from common.untils import RequestData
from common.decorators import jwt_required, role_required
from .service import StockService, WarehouseService, StockMovementService

stock_service = StockService()
warehouse_service = WarehouseService()
movement_service = StockMovementService()


def _extract_data(request):
    """Trích xuất dữ liệu body an toàn qua RequestData hoặc json fallback."""
    if hasattr(RequestData, "get_data"):
        return RequestData.get_data(request)
    if hasattr(RequestData, "get_json_data"):
        return RequestData.get_json_data(request)
    import json
    try:
        return json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        return request.POST.dict()


# ==============================================================================
# 1. QUẢN LÝ TỒN KHO (STOCKS)
# ==============================================================================

@csrf_exempt
@require_http_methods(["GET"])
def get_all_stocks(request):
    result = stock_service.get_all(request.GET)

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result["data"])

    return ApiResponse.success(result["data"], result["message"])


@csrf_exempt
@require_http_methods(["GET"])
def get_detail_stock(request, id):
    result = stock_service.get_by_id(id)

    if not result["success"]:
        return ApiResponse.error(result["message"], 404, result["data"])

    return ApiResponse.success(result["data"], result["message"])


@csrf_exempt
@require_http_methods(["POST"])
def create_stock(request):
    data = _extract_data(request)
    result = stock_service.create(data)

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result["data"])

    return ApiResponse.success(result["data"], result["message"])


@csrf_exempt
@require_http_methods(["PUT", "POST"])
def update_stock(request, id):
    data = _extract_data(request)
    result = stock_service.update(id, data)

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result["data"])

    return ApiResponse.success(result["data"], result["message"])


@csrf_exempt
@require_http_methods(["DELETE", "POST"])
def delete_stock(request, id):
    result = stock_service.delete(id)

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result["data"])

    return ApiResponse.success(result["data"], result["message"])


@csrf_exempt
@require_http_methods(["POST"])
def process_stock_transaction(request):
    """Xử lý Nhập / Xuất / Chuyển kho."""
    data = _extract_data(request)
    result = stock_service.process_transaction(data)

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result["data"])

    return ApiResponse.success(result["data"], result["message"])


@csrf_exempt
@require_http_methods(["GET"])
def get_low_stocks(request):
    """Lấy danh sách các sản phẩm dưới ngưỡng tối thiểu."""
    result = stock_service.get_low_stocks()

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result["data"])

    return ApiResponse.success(result["data"], result["message"])


@csrf_exempt
@require_http_methods(["GET"])
def get_stock_movements(request, id):
    """Lấy lịch sử nhập / xuất của một mặt hàng tồn kho."""
    result = movement_service.get_history_by_stock(id)

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result["data"])

    return ApiResponse.success(result["data"], result["message"])


# ==============================================================================
# 2. QUẢN LÝ DANH MỤC KHO HÀNG (WAREHOUSES)
# ==============================================================================

@csrf_exempt
@require_http_methods(["GET"])
def get_all_warehouses(request):
    result = warehouse_service.get_all(request.GET)

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result["data"])

    return ApiResponse.success(result["data"], result["message"])


@csrf_exempt
@require_http_methods(["GET"])
def get_active_warehouses(request):
    result = warehouse_service.get_active_warehouses()

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result["data"])

    return ApiResponse.success(result["data"], result["message"])


@csrf_exempt
@require_http_methods(["GET"])
def get_detail_warehouse(request, id):
    result = warehouse_service.get_by_id(id)

    if not result["success"]:
        return ApiResponse.error(result["message"], 404, result["data"])

    return ApiResponse.success(result["data"], result["message"])


@csrf_exempt
@require_http_methods(["POST"])
def create_warehouse(request):
    data = _extract_data(request)
    result = warehouse_service.create(data)

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result["data"])

    return ApiResponse.success(result["data"], result["message"])


@csrf_exempt
@require_http_methods(["PUT", "POST"])
def update_warehouse(request, id):
    data = _extract_data(request)
    result = warehouse_service.update(id, data)

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result["data"])

    return ApiResponse.success(result["data"], result["message"])


@csrf_exempt
@require_http_methods(["DELETE", "POST"])
def delete_warehouse(request, id):
    result = warehouse_service.delete(id)

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result["data"])

    return ApiResponse.success(result["data"], result["message"])