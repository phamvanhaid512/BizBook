import json
import logging
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from common.api_response import ApiResponse
from common.decorators import jwt_required, role_required
from common.error_handler import handle_api_exception

from .agents.business_advisor_agent import BusinessAdvisorAgent
from .agents.intent_router import IntentRouter
from .agents.data_analysis_agent import DataAnalysisAgent
from .services import  AiAgentService

logger = logging.getLogger(__name__)

# Khởi tạo Service kèm DataMiningService (nếu có)
try:
    from data_mining.service import DataMiningService
    dm_service = DataMiningService()
except Exception:
    dm_service = None

# Khởi tạo Service và truyền vào DataAnalysisAgent
dm_service = DataMiningService()
ai_agent_service = AiAgentService(
    intent_router=IntentRouter(),
    data_analysis_agent=DataAnalysisAgent(data_mining_service=dm_service),
    business_advisor_agent=BusinessAdvisorAgent(),
)


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
def chat(request):
    data = RequestData.get_body(request)
    result = ai_agent_service.chat(user=request.current_user, data=data)

    if not result.get("success"):
        return ApiResponse.error(
            result.get("message", "Gửi tin nhắn thất bại"),
            400,
            result.get("data"),
        )

    return ApiResponse.success(
        result.get("data"),
        result.get("message", "Gửi tin nhắn thành công"),
        200,
    )

@csrf_exempt
@require_http_methods(["GET", "POST"])
@jwt_required
@role_required(["ADMIN", "OWNER"])
def conversations(request):
    try:
        user = getattr(request, "current_user", getattr(request, "user", None))
        if request.method == "POST":
            data = RequestData.get_body(request)
            result = ai_agent_service.create_session(user=user, data=data)
            return ApiResponse.success(result.get("data"), result.get("message"), 201)

        result = ai_agent_service.get_sessions(user=user)
        return ApiResponse.success(result.get("data"), result.get("message"), 200)
    except Exception as error:
        return handle_api_exception(error=error, api_name="conversations", request=request)


@csrf_exempt
@require_http_methods(["GET", "DELETE"])
@jwt_required
@role_required(["ADMIN", "OWNER"])
def conversation_detail(request, conversation_id):
    try:
        user = getattr(request, "current_user", getattr(request, "user", None))
        if request.method == "DELETE":
            result = ai_agent_service.delete_session(user=user, session_id=conversation_id)
            if not result.get("success"):
                return ApiResponse.error(result.get("message"), 404)
            return ApiResponse.success(None, result.get("message"), 200)

        result = ai_agent_service.get_messages(user=user, session_id=conversation_id)
        if not result.get("success"):
            return ApiResponse.error(result.get("message"), 404)
        return ApiResponse.success(result.get("data"), result.get("message"), 200)
    except Exception as error:
        return handle_api_exception(error=error, api_name="conversation_detail", request=request)


@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
@role_required(["ADMIN", "OWNER"])
def get_messages(request, conversation_id):
    try:
        user = getattr(request, "current_user", getattr(request, "user", None))
        result = ai_agent_service.get_messages(user=user, session_id=conversation_id)
        if not result.get("success"):
            return ApiResponse.error(result.get("message"), 404)
        return ApiResponse.success(result.get("data"), result.get("message"), 200)
    except Exception as error:
        return handle_api_exception(error=error, api_name="get_messages", request=request)

# ai_agent/controllers.py
@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
@role_required(["ADMIN", "OWNER"])
def voice_chat(request):
    data = RequestData.get_body(request)
    user_text = data.get("text", "").strip()
    session_id = data.get("session_id")

    if not user_text:
        return ApiResponse.error("Không nhận diện được giọng nói", 400)

    # 1. Gọi trực tiếp pipeline AI Agent hiện tại
    chat_result = ai_agent_service.chat(
        user=request.current_user,
        data={"message": user_text, "session_id": session_id}
    )

    if not chat_result.get("success"):
        return ApiResponse.error(chat_result.get("message"), 400, chat_result.get("data"))

    # 2. Tạo âm thanh phản hồi (TTS) bằng gTTS
    res_data = chat_result.get("data", {})
    assistant_msg = res_data.get("assistant_message", {})
    reply_text = assistant_msg.get("content", "")

    audio_url = ""
    if reply_text:
        try:
            audio_url = ai_agent_service.voice_service.text_to_speech(reply_text)
        except Exception:
            audio_url = ""

    res_data["user_text"] = user_text
    res_data["audio_url"] = audio_url

    return ApiResponse.success(res_data, "Phản hồi giọng nói thành công", 200)