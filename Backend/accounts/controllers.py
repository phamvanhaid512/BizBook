from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from common.api_response import ApiResponse
from common.untils import RequestData
from common.decorators import jwt_required, role_required
from .services import AccountService

account_service = AccountService()


@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    data = RequestData.get_body(request)
    result = account_service.login(data)

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result.get("data"))

    return ApiResponse.success(
        result["data"],
        result["message"],
        200
    )


@require_http_methods(["GET"])
@jwt_required
def profile(request):
    result = account_service.get_profile(request.current_user)

    return ApiResponse.success(
        result,
        "Thông tin tài khoản",
        200
    )


@require_http_methods(["GET"])
@jwt_required
@role_required(["ADMIN"])
def get_accounts(request):
    result = account_service.get_all()

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result.get("data"))

    return ApiResponse.success(
        result["data"],
        result["message"],
        200
    )


@csrf_exempt
@require_http_methods(["POST"])
# @jwt_required
# @role_required(["ADMIN"])
def create_account(request):
    data = RequestData.get_body(request)
    result = account_service.create_account(data)

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result.get("data"))

    return ApiResponse.success(
        result["data"],
        result["message"],
        201
    )


@csrf_exempt
@require_http_methods(["PUT"])
@jwt_required
@role_required(["ADMIN"])
def update_account(request, id):
    data = RequestData.get_body(request)
    result = account_service.update_account(id, data)

    if not result["success"]:
        return ApiResponse.error(result["message"], 400, result.get("data"))

    return ApiResponse.success(
        result["data"],
        result["message"],
        200
    )


@csrf_exempt
@require_http_methods(["DELETE"])
@jwt_required
@role_required(["ADMIN"])
def delete_account(request, id):
    result = account_service.delete(id)

    if not result["success"]:
        return ApiResponse.error(result["message"], 404, result.get("data"))

    return ApiResponse.success(
        result["data"],
        result["message"],
        200
    )