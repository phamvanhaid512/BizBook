from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from common.api_response import ApiResponse
from common.untils import RequestData
from common.decorators import jwt_required, role_required
from .service import CustomerService

customer_service = CustomerService()


@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
@role_required(["ADMIN", "OWNER", "STAFF"])
def get_all_customers(request):
    result = customer_service.get_paginated(request.GET)

    if not result["success"]:
        return ApiResponse.error(
            result["message"],
            400,
            result["data"]
        )

    return ApiResponse.success(
        result["data"],
        result["message"]
    )
@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
@role_required(["ADMIN"])
def get_all(request):
    result = customer_service.get_all()

    if not result["success"]:
        return ApiResponse.error(result["message"], 400)

    return ApiResponse.success(
        result["data"],
        result["message"],
        200
    )


@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
def get_detail(request, id):
    result = customer_service.get_by_id(id)

    if not result["success"]:
        return ApiResponse.error(result["message"], 404)

    return ApiResponse.success(
        result["data"],
        result["message"],
        200
    )


@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
@role_required(["ADMIN"])
def create_customer(request):
    data = RequestData.get_body(request)
    result = customer_service.create(data)

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
def update_customer(request, id):
    data = RequestData.get_body(request)
    result = customer_service.update(id, data)

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
def delete_customer(request, id):
    result = customer_service.delete(id)

    if not result["success"]:
        return ApiResponse.error(
            result["message"],
            404
        )

    return ApiResponse.success(
        result["data"],
        result["message"],
        200
    )