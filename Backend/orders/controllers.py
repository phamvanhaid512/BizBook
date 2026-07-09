from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from numpy import convolve

from .service import OrderService

from common.api_response import ApiResponse
from common.untils import RequestData
from common.decorators import jwt_required, role_required

order_service = OrderService()


@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
@role_required(["ADMIN", "OWNER", "STAFF"])
def get_all_orders(request):
    result = order_service.get_paginated(request.GET)

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
def get_detail_order(request, id):

    result = order_service.get_by_id(id)

    if not result["success"]:
        return ApiResponse.error(
            result["message"],
            404
        )

    return ApiResponse.success(
        result["data"],
        result["message"]
    )


@csrf_exempt
@require_http_methods(["POST"])
def create_order(request):

    data = RequestData.get_body(request)

    result = order_service.create_order(data)

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
@role_required(["ADMIN", "OWNER", "STAFF"])
def update_order(request, id):

    data = RequestData.get_body(request)

    result = order_service.update(id, data)

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
@require_http_methods(["PATCH"])
@jwt_required
@role_required(["ADMIN", "OWNER", "STAFF"])
def update_order_status(request, id):
    data = RequestData.get_body(request)
    print("Cay toi da",data)

    status = data.get("status")

    result = order_service.update_order_status(id, status)

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
@require_http_methods(["PATCH"])
@jwt_required
@role_required(["ADMIN", "OWNER", "STAFF"])
def update_payment_status(request, id):

    data = RequestData.get_body(request)

    result = order_service.update_payment_status(id, data)

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
@require_http_methods(["DELETE"])
@jwt_required
@role_required(["ADMIN"])
def delete_order(request, id):

    result = order_service.delete(id)

    if not result["success"]:
        return ApiResponse.error(
            result["message"],
            404
        )

    return ApiResponse.success(
        None,
        result["message"]
    )


# Controller-Users
@csrf_exempt
@require_http_methods(["GET"])
def get_detail_order_status(request,id):
    result = order_service.get_by_id(id)
    print("result",result)
    if not result["success"]:
        return ApiResponse.error(
            result["message"],
            404
        )

    return ApiResponse.success(
        result["data"],
        result["message"]
    )