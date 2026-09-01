from common.base_service import BaseService
from ..models import ChatMessage
from ..repositories import ChatMessageRepository, ChatSessionRepository
from ..serializers import (
    ChatMessageSerializer,
    ChatRequestSerializer,
    ChatSessionSerializer,
    CreateSessionRequestSerializer,
)
from ..context_builder import ContextBuilder


class AiAgentService():
    def __init__(self, intent_router=None, data_analysis_agent=None, business_advisor_agent=None):
        super().__init__()
        self.session_repository = ChatSessionRepository()
        self.message_repository = ChatMessageRepository()
        self.context_builder = ContextBuilder()
        self.intent_router = intent_router
        self.data_analysis_agent = data_analysis_agent
        self.business_advisor_agent = business_advisor_agent

    def create_session(self, user, data):
        serializer = CreateSessionRequestSerializer(data=data)
        if not serializer.is_valid():
            return {"success": False, "message": "Dữ liệu không hợp lệ.", "data": serializer.errors}

        title = serializer.validated_data.get("title", "").strip() or "Cuộc trò chuyện mới"
        session = self.session_repository.create(user=user, title=title)
        return {
            "success": True,
            "message": "Tạo cuộc trò chuyện thành công.",
            "data": ChatSessionSerializer(session).data,
        }

    def get_sessions(self, user):
        sessions = self.session_repository.get_all_by_user(user)
        return {
            "success": True,
            "message": "Lấy danh sách cuộc trò chuyện thành công.",
            "data": ChatSessionSerializer(sessions, many=True).data,
        }

    def get_messages(self, user, session_id):
        session = self.session_repository.get_owned_by_user(session_id, user)
        if not session:
            return {"success": False, "message": "Không tìm thấy cuộc trò chuyện.", "data": None}

        messages = self.message_repository.get_all_by_session(session)
        return {
            "success": True,
            "message": "Lấy lịch sử chat thành công.",
            "data": {
                "session": ChatSessionSerializer(session).data,
                "messages": ChatMessageSerializer(messages, many=True).data,
            },
        }

    def delete_session(self, user, session_id):
        session = self.session_repository.get_owned_by_user(session_id, user)
        if not session:
            return {"success": False, "message": "Không tìm thấy cuộc trò chuyện.", "data": None}

        self.session_repository.delete(session)
        return {"success": True, "message": "Xóa cuộc trò chuyện thành công.", "data": None}

    def chat(self, user, data):
        serializer = ChatRequestSerializer(data=data)
        if not serializer.is_valid():
            return {"success": False, "message": "Dữ liệu đầu vào không hợp lệ.", "data": serializer.errors}

        validated = serializer.validated_data
        message_text = validated["message"].strip()
        session_id = validated.get("session_id")

        if session_id:
            session = self.session_repository.get_owned_by_user(session_id, user)
            if not session:
                return {"success": False, "message": "Không tìm thấy cuộc trò chuyện.", "data": None}
        else:
            session = self.session_repository.create(
                user=user, title=self._build_title(message_text)
            )

        recent_messages = self.message_repository.get_recent_by_session(session, limit=20)
        previous_intent = self._find_previous_intent(recent_messages)

        # 1. Lưu tin nhắn người dùng
        user_message = self.message_repository.create_message(
            session=session,
            role=ChatMessage.Role.USER,
            content=message_text,
        )

        # 2. Xử lý Multi-Agent Pipeline
        route = self.intent_router.route(message_text, previous_intent=previous_intent)
        analysis = self.data_analysis_agent.execute(route)
        context = self.context_builder.build_prompt_context(route, analysis)
        advisor_output = self.business_advisor_agent.respond(route, analysis)

        assistant_metadata = {
            "intent": route.get("intent"),
            "entities": route.get("entities", {}),
            "tool": analysis.get("tool"),
            "context": context,
            "presentation": advisor_output.get("presentation", {}),
            "suggested_questions": advisor_output.get("suggested_questions", []),
        }

        # 3. Lưu tin nhắn Assistant
        assistant_message = self.message_repository.create_message(
            session=session,
            role=ChatMessage.Role.ASSISTANT,
            content=advisor_output.get("reply", ""),
            metadata=assistant_metadata,
        )

        return {
            "success": True,
            "message": "Trợ lý ảo đã trả lời.",
            "data": {
                "session": ChatSessionSerializer(session).data,
                "user_message": ChatMessageSerializer(user_message).data,
                "assistant_message": ChatMessageSerializer(assistant_message).data,
            },
        }

    @staticmethod
    def _find_previous_intent(messages):
        for message in reversed(messages):
            if message.role == ChatMessage.Role.ASSISTANT:
                intent = message.metadata.get("intent")
                if intent:
                    return intent
        return None

    @staticmethod
    def _build_title(message):
        normalized = " ".join(message.split())
        return normalized if len(normalized) <= 60 else normalized[:57] + "..."