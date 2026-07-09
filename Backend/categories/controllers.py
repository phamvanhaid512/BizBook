from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from .service import CategoryService
from common.api_response import ApiResponse
from common.untils import RequestData
from common.decorators import jwt_required, role_required

categories_service = CategoryService()


@csrf_exempt
@require_http_methods(["GET"])
def get_all_categories(request):
    result = categories_service.get_all()

    if not result["success"]:
        return ApiResponse.error(result["message"], 400)

    return ApiResponse.success(
        result["data"],
        result["message"]
    )


@csrf_exempt
@require_http_methods(["GET"])
def get_detail_categories(request, id):
    result = categories_service.get_by_id(id)

    if not result["success"]:
        return ApiResponse.error(result["message"], 404)

    return ApiResponse.success(
        result["data"],
        result["message"]
    )


@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
@role_required(["ADMIN"])
def create_categories(request):
    data = RequestData.get_body(request)
    result = categories_service.create(data)

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
@role_required(["ADMIN"])
def update_categories(request, id):
    data = RequestData.get_body(request)

    result = categories_service.update(id, data)

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
@role_required(["ADMIN"])
def delete_categories(request, id):
    result = categories_service.delete(id)

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