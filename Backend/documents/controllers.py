import json
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from common.api_response import ApiResponse
from common.decorators import jwt_required, role_required
from common.error_handler import handle_api_exception
from .services import DocumentAnalysisService

doc_service = DocumentAnalysisService()


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
@require_http_methods(["POST"])
@jwt_required
@role_required(["ADMIN", "OWNER"])
def analyze_document(request):
    try:
        if "file" not in request.FILES:
            return ApiResponse.error("Vui lòng đính kèm tệp hình ảnh ('file').", 400)

        image_file = request.FILES["file"]
        user = getattr(request, "current_user", getattr(request, "user", None))
        result = doc_service.analyze(image_file=image_file, user=user)

        if not result.get("success"):
            return ApiResponse.error(result.get("message"), 400, result.get("data"))

        return ApiResponse.success(result.get("data"), result.get("message"), 200)
    except Exception as error:
        return handle_api_exception(error=error, api_name="analyze_document", request=request)


@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
@role_required(["ADMIN", "OWNER"])
def confirm_document(request):
    try:
        data = RequestData.get_body(request)
        user = getattr(request, "current_user", getattr(request, "user", None))
        result = doc_service.confirm_and_commit_expense(user=user, data=data)

        if not result.get("success"):
            return ApiResponse.error(result.get("message"), 400, result.get("data"))

        return ApiResponse.success(result.get("data"), result.get("message"), 201)
    except Exception as error:
        return handle_api_exception(error=error, api_name="confirm_document", request=request)