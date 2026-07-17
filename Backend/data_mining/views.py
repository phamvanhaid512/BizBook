from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from common.api_response import ApiResponse
from common.decorators import (
    jwt_required,
    role_required,
)
from common.untils import RequestData

from .service import DataMiningService


data_mining_service = DataMiningService()


def get_request_user(request):
    user = getattr(
        request,
        "current_user",
        None,
    )

    if user is None:
        user = getattr(
            request,
            "user",
            None,
        )

    return user


@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
@role_required(["ADMIN"])
def run_apriori(request):
    data = RequestData.get_body(request)

    result = data_mining_service.run_apriori(
        data=data,
        user=get_request_user(request),
    )

    if not result["success"]:
        return ApiResponse.error(
            result["message"],
            400,
            result.get("data"),
        )

    return ApiResponse.success(
        result["data"],
        result["message"],
        200,
    )


@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
@role_required(["ADMIN"])
def run_forecasting(request):
    data = RequestData.get_body(request)

    result = (
        data_mining_service
        .run_forecasting(
            data=data,
            user=get_request_user(request),
        )
    )

    if not result["success"]:
        return ApiResponse.error(
            result["message"],
            400,
            result.get("data"),
        )

    return ApiResponse.success(
        result["data"],
        result["message"],
        200,
    )


@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
@role_required(["ADMIN"])
def get_business_overview(request):
    result = (
        data_mining_service
        .get_business_overview(
            history_days=request.GET.get(
                "history_days",
                90,
            ),
            top_product_limit=request.GET.get(
                "top_product_limit",
                10,
            ),
        )
    )

    if not result["success"]:
        return ApiResponse.error(
            result["message"],
            400,
            result.get("data"),
        )

    return ApiResponse.success(
        result["data"],
        result["message"],
        200,
    )


@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
@role_required(["ADMIN"])
def get_mining_runs(request):
    result = (
        data_mining_service
        .get_mining_runs(
            run_type=request.GET.get(
                "run_type"
            ),
            limit=request.GET.get(
                "limit",
                20,
            ),
        )
    )

    if not result["success"]:
        return ApiResponse.error(
            result["message"],
            400,
            result.get("data"),
        )

    return ApiResponse.success(
        result["data"],
        result["message"],
        200,
    )