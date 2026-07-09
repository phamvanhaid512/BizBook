from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from .service import BussinessService
from common.api_response import ApiResponse
from common.untils import RequestData
from common.decorators import jwt_required, role_required

business_service = BussinessService()


@csrf_exempt
@require_http_methods(["GET"])
# @jwt_required
# @role_required(["ADMIN", "OWNER", "STAFF"])
def get_all_tables(request):
    result = business_service.get_all()

    if not result["success"]:
        return ApiResponse.error(result["message"], 400)

    return ApiResponse.success(
        result["data"],
        result["message"]
    )
@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
@role_required(["ADMIN", "OWNER", "STAFF"])
def get_detail_table(request, id):
    result = business_service.get_by_id(id)

    if not result["success"]:
        return ApiResponse.error(result["message"], 404)

    return ApiResponse.success(
        result["data"],
        result["message"]
    )

@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
@role_required(["ADMIN", "OWNER"])
def create_table(request):
    
    data = RequestData.get_body(request)
    result = business_service.create(data)

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

@csrf_exempt
@require_http_methods(["PUT"])
@jwt_required
@role_required(["ADMIN", "OWNER"])
def update_table(request, id):
    data = RequestData.get_body(request)
    result = business_service.update(id, data)

    if not result["success"]:
        return ApiResponse.error(
            result["message"],
            400,
            result["data"]
        )

    return ApiResponse.success(
        result["data"],
        result["message"],
        200
    )

@csrf_exempt
@require_http_methods(["DELETE"])
@jwt_required
@role_required(["ADMIN", "OWNER"])
def delete_table(request, id):
    result = business_service.delete(id)

    if not result["success"]:
        return ApiResponse.error(
            result["message"],
            404
        )

    return ApiResponse.success(
        None,
        result["message"],
        200
    )

@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
# @role_required(["ADMIN", "OWNER"])
def generate_qr(request, id):
    result = business_service.generate_qr(id)

    if not result["success"]:
        return ApiResponse.error(
            result["message"],
            404,
            result["data"]
        )

    return ApiResponse.success(
        result["data"],
        result["message"],
        200
    )

@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
@role_required(["ADMIN", "OWNER", "STAFF"])
def get_active_tables(request):
    result = business_service.get_active_tables()

    return ApiResponse.success(
        result["data"],
        result["message"],
        200
    )