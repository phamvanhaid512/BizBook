import logging
import traceback

from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from common.api_response import ApiResponse
from common.decorators import (
    jwt_required,
    role_required,
)
from common.untils import RequestData

from .services import AiAgentService


logger = logging.getLogger(__name__)

ai_agent_service = AiAgentService()


def handle_api_exception(
    error,
    api_name,
    request=None,
    extra_data=None,
):
    """
    Ghi log và tạo response khi API xảy ra lỗi ngoài dự kiến.
    """

    user_id = getattr(
        getattr(request, "user", None),
        "id",
        None,
    )

    logger.exception(
        "Lỗi API %s | user_id=%s | extra_data=%s | "
        "error_type=%s | error=%s",
        api_name,
        user_id,
        extra_data,
        type(error).__name__,
        str(error),
    )

    error_data = {
        "api": api_name,
        "error_type": type(error).__name__,
        "error": str(error),
    }

    if extra_data:
        error_data["context"] = extra_data

    # Chỉ trả traceback cho frontend khi DEBUG=True
    if settings.DEBUG:
        error_data["traceback"] = traceback.format_exc()

    return ApiResponse.error(
        "Có lỗi xảy ra khi xử lý yêu cầu",
        500,
        error_data,
    )


@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
@role_required(["ADMIN"])
def chat(request):
    try:
        data = RequestData.get_body(request)

        logger.info(
            "Bắt đầu API chat | user_id=%s | conversation_id=%s",
            getattr(request.user, "id", None),
            data.get("conversation_id"),
        )

        result = ai_agent_service.chat(
            data=data,
            user=request.current_user        
        )

        if not isinstance(result, dict):
            raise TypeError(
                "AIAgentService.chat() phải trả về dictionary, "
                f"nhưng nhận được {type(result).__name__}"
            )

        if not result.get("success"):
            logger.warning(
                "Chat thất bại | user_id=%s | message=%s | data=%s",
                getattr(request.user, "id", None),
                result.get("message"),
                result.get("data"),
            )

            return ApiResponse.error(
                result.get(
                    "message",
                    "Gửi tin nhắn thất bại",
                ),
                400,
                result.get("data"),
            )

        logger.info(
            "Chat thành công | user_id=%s | conversation_id=%s",
            getattr(request.user, "id", None),
            data.get("conversation_id"),
        )

        return ApiResponse.success(
            result.get("data"),
            result.get(
                "message",
                "Gửi tin nhắn thành công",
            ),
            200,
        )

    except Exception as error:
        return handle_api_exception(
            error=error,
            api_name="chat",
            request=request,
            extra_data={
                "conversation_id": (
                    data.get("conversation_id")
                    if "data" in locals()
                    and isinstance(data, dict)
                    else None
                ),
            },
        )


@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
# @role_required(["ADMIN"])
def list_conversations(request):
    try:
        logger.info(
            "Bắt đầu lấy danh sách cuộc trò chuyện | user_id=%s",
            getattr(request.user, "id", None),
        )

        result = ai_agent_service.get_conversations(
            user=request.user,
        )

        if not isinstance(result, dict):
            raise TypeError(
                "get_conversations() phải trả về dictionary, "
                f"nhưng nhận được {type(result).__name__}"
            )

        if not result.get("success"):
            logger.warning(
                "Lấy danh sách cuộc trò chuyện thất bại | "
                "user_id=%s | message=%s | data=%s",
                getattr(request.user, "id", None),
                result.get("message"),
                result.get("data"),
            )

            return ApiResponse.error(
                result.get(
                    "message",
                    "Không thể lấy danh sách cuộc trò chuyện",
                ),
                400,
                result.get("data"),
            )

        return ApiResponse.success(
            result.get("data"),
            result.get(
                "message",
                "Lấy danh sách cuộc trò chuyện thành công",
            ),
            200,
        )

    except Exception as error:
        return handle_api_exception(
            error=error,
            api_name="list_conversations",
            request=request,
        )


@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
# @role_required(["ADMIN"])
def get_messages(request, conversation_id):
    try:
        logger.info(
            "Bắt đầu lấy tin nhắn | user_id=%s | conversation_id=%s",
            getattr(request.user, "id", None),
            conversation_id,
        )

        result = ai_agent_service.get_messages(
            conversation_id=conversation_id,
            user=request.user,
        )

        if not isinstance(result, dict):
            raise TypeError(
                "get_messages() phải trả về dictionary, "
                f"nhưng nhận được {type(result).__name__}"
            )

        if not result.get("success"):
            logger.warning(
                "Lấy tin nhắn thất bại | user_id=%s | "
                "conversation_id=%s | message=%s | data=%s",
                getattr(request.user, "id", None),
                conversation_id,
                result.get("message"),
                result.get("data"),
            )

            return ApiResponse.error(
                result.get(
                    "message",
                    "Không thể lấy tin nhắn",
                ),
                404,
                result.get("data"),
            )

        return ApiResponse.success(
            result.get("data"),
            result.get(
                "message",
                "Lấy tin nhắn thành công",
            ),
            200,
        )

    except Exception as error:
        return handle_api_exception(
            error=error,
            api_name="get_messages",
            request=request,
            extra_data={
                "conversation_id": conversation_id,
            },
        )


@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
# @role_required(["ADMIN"])
def upload_ocr_document(request):
    try:
        uploaded_files = list(request.FILES.keys())

        logger.info(
            "Bắt đầu upload OCR | user_id=%s | files=%s",
            getattr(request.user, "id", None),
            uploaded_files,
        )

        if not request.FILES:
            return ApiResponse.error(
                "Vui lòng chọn tài liệu cần tải lên",
                400,
                {
                    "files": [
                        "Không tìm thấy file trong request."
                    ],
                },
            )

        result = ai_agent_service.upload_ocr_document(
            files=request.FILES,
            user=request.user,
        )

        if not isinstance(result, dict):
            raise TypeError(
                "upload_ocr_document() phải trả về dictionary, "
                f"nhưng nhận được {type(result).__name__}"
            )

        if not result.get("success"):
            logger.warning(
                "Upload OCR thất bại | user_id=%s | "
                "files=%s | message=%s | data=%s",
                getattr(request.user, "id", None),
                uploaded_files,
                result.get("message"),
                result.get("data"),
            )

            return ApiResponse.error(
                result.get(
                    "message",
                    "Không thể xử lý tài liệu OCR",
                ),
                400,
                result.get("data"),
            )

        logger.info(
            "Upload OCR thành công | user_id=%s | files=%s",
            getattr(request.user, "id", None),
            uploaded_files,
        )

        return ApiResponse.success(
            result.get("data"),
            result.get(
                "message",
                "Xử lý tài liệu OCR thành công",
            ),
            200,
        )

    except Exception as error:
        return handle_api_exception(
            error=error,
            api_name="upload_ocr_document",
            request=request,
            extra_data={
                "files": list(request.FILES.keys()),
            },
        )