from common.base_service import BaseService

from .models import (
    AIMessage,
    OCRDocument,
)
from .repositories import AIAgentRepository
from .serializers import (
    AIConversationSerializer,
    ChatRequestSerializer,
    OCRRequestSerializer,
)
import json

from django.conf import settings

from openai import OpenAI
from openai import OpenAIError

class AIAgentService(BaseService):
    def __init__(self):
        super().__init__(
            AIAgentRepository(),
            AIConversationSerializer,
        )

    # ==========================================
    # CHAT
    # ==========================================

    def chat(
        self,
        data,
        user,
    ):
        serializer = ChatRequestSerializer(data=data)

        if not serializer.is_valid():
            return {
                "success": False,
                "message": "Dữ liệu chat không hợp lệ",
                "data": serializer.errors,
            }

        validated_data = serializer.validated_data
        print("validated_data",validated_data)
        conversation_id = validated_data.get(
            "conversation_id"
        )

        message = validated_data.get("message")

        conversation = self.get_or_create_conversation(
            conversation_id=conversation_id,
            user=user,
            first_message=message,
        )

        if not conversation:
            return {
                "success": False,
                "message": "Không tìm thấy cuộc trò chuyện",
                "data": None,
            }

        # 1. Lưu tin nhắn người dùng
        self._repository.create_message(
            conversation=conversation,
            role=AIMessage.Role.USER,
            content=message,
        )
        intent = self.__detect_intent(
        message=message
        )

        business_context = self.__get_business_context(
        intent=intent
        )

        # 2. Tạm phản hồi mẫu.
        # Sau khi API này chạy ổn, ta thay hàm này
        # bằng gọi OpenAI thật.
        assistant_answer = self._generate_sample_answer(
            message=message
        )

        # 3. Lưu phản hồi AI
        assistant_message = (
            self._repository.create_message(
                conversation=conversation,
                role=AIMessage.Role.ASSISTANT,
                content=assistant_answer,
            )
        )

        return {
            "success": True,
            "message": "AI phản hồi thành công",
            "data": {
                "conversation_id": conversation.id,
                "message": {
                    "id": assistant_message.id,
                    "role": assistant_message.role,
                    "content": assistant_message.content,
                    "created_at": (
                        assistant_message.created_at.isoformat()
                    ),
                },
            },
        }

    def get_or_create_conversation(
        self,
        conversation_id,
        user,
        first_message,
    ):
        # Có conversation_id: tiếp tục chat cũ
        if conversation_id:
            return (
                self._repository
                .get_conversation_by_id_and_user(
                    conversation_id=conversation_id,
                    user=user,
                )
            )

        # Không có conversation_id: tạo chat mới
        return self._repository.create_conversation(
            user=user,
            title=first_message[:50],
        )

    def _generate_sample_answer(
        self,
        message,
    ):
        message = message.lower()

        if "doanh thu" in message:
            return (
                "Tôi đã nhận câu hỏi về doanh thu. "
                "Khi kết nối dữ liệu bán hàng, tôi sẽ "
                "phân tích doanh thu và xu hướng cho bạn."
            )

        if (
            "bán kèm" in message
            or "mua kèm" in message
            or "apriori" in message
        ):
            return (
                "Tôi sẽ dựa vào kết quả Apriori gần nhất "
                "để gợi ý sản phẩm nên bán kèm."
            )

        if (
            "dự báo" in message
            or "forecast" in message
        ):
            return (
                "Tôi sẽ dựa vào kết quả Forecasting "
                "để tư vấn doanh thu trong thời gian tới."
            )

        return (
            "Tôi đã nhận câu hỏi của bạn. "
            "Bạn có thể hỏi về doanh thu, sản phẩm, "
            "gợi ý bán kèm hoặc dự báo doanh thu."
        )

    # ==========================================
    # HISTORY CHAT
    # ==========================================

    def get_conversations(self, user):
        conversations = (
            self._repository.get_conversations_by_user(
                user=user
            )
        )

        result = []

        for conversation in conversations:
            result.append(
                {
                    "id": conversation.id,
                    "title": conversation.title,
                    "created_at": (
                        conversation.created_at.isoformat()
                    ),
                    "updated_at": (
                        conversation.updated_at.isoformat()
                    ),
                }
            )

        return {
            "success": True,
            "message": "Lấy lịch sử chat thành công",
            "data": result,
        }

    def get_messages(
        self,
        conversation_id,
        user,
    ):
        conversation = (
            self._repository
            .get_conversation_by_id_and_user(
                conversation_id=conversation_id,
                user=user,
            )
        )

        if not conversation:
            return {
                "success": False,
                "message": "Không tìm thấy cuộc trò chuyện",
                "data": None,
            }

        messages = (
            self._repository
            .get_messages_by_conversation(
                conversation=conversation
            )
        )

        result = []

        for message in messages:
            result.append(
                {
                    "id": message.id,
                    "role": message.role,
                    "content": message.content,
                    "created_at": (
                        message.created_at.isoformat()
                    ),
                }
            )

        return {
            "success": True,
            "message": "Lấy tin nhắn thành công",
            "data": {
                "conversation": {
                    "id": conversation.id,
                    "title": conversation.title,
                },
                "messages": result,
            },
        }

    # ==========================================
    # OCR - BƯỚC 1: UPLOAD VÀ LƯU ẢNH
    # ==========================================

    def upload_ocr_document(
        self,
        files,
        user,
    ):
        serializer = OCRRequestSerializer(data=files)

        if not serializer.is_valid():
            return {
                "success": False,
                "message": "Ảnh hóa đơn không hợp lệ",
                "data": serializer.errors,
            }

        image = serializer.validated_data.get("image")

        if image.size > 5 * 1024 * 1024:
            return {
                "success": False,
                "message": "Ảnh không được lớn hơn 5MB",
                "data": None,
            }

        document = (
            self.__repository.create_ocr_document(
                user=user,
                image=image,
            )
        )

        # Hiện tại mới lưu ảnh, chưa OCR thật.
        # Bước sau sẽ thay phần dữ liệu mẫu này
        # bằng OpenAI Vision hoặc Tesseract OCR.
        document = (
            self.__repository.update_ocr_document(
                document=document,
                extracted_data={},
                confidence_score=0,
                status=OCRDocument.Status.WARNING,
                warnings=[
                    "Ảnh đã tải lên thành công.",
                    "OCR chưa được kết nối.",
                ],
            )
        )

        return {
            "success": True,
            "message": "Tải ảnh hóa đơn thành công",
            "data": {
                "document_id": document.id,
                "file_name": document.file_name,
                "image_url": document.image.url,
                "status": document.status,
                "warnings": document.warnings,
                "created_at": document.created_at.isoformat(),
            },
        }