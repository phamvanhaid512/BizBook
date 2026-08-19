from common.base_repository import BaseRepository

from .models import (
    AIConversation,
    AIMessage,
    OCRDocument,
)


class AIAgentRepository(BaseRepository):
    def __init__(self):
        super().__init__(AIConversation)

    # ==========================================
    # AI CONVERSATION
    # ==========================================

    def create_conversation(
        self,
        user,
        title,
    ):
        return self.get_model().objects.create(
            user=user,
            title=title,
        )

    def get_conversation_by_id_and_user(
        self,
        conversation_id,
        user,
    ):
        return (
            self.get_model()
            .objects
            .filter(
                id=conversation_id,
                user=user,
            )
            .first()
        )

    def get_conversations_by_user(self, user):
        return (
            self.get_model()
            .objects
            .filter(user=user)
            .order_by("-updated_at")
        )

    # ==========================================
    # AI MESSAGE
    # ==========================================

    def create_message(
        self,
        conversation,
        role,
        content,
    ):
        return AIMessage.objects.create(
            conversation=conversation,
            role=role,
            content=content,
        )

    def get_messages_by_conversation(
        self,
        conversation,
    ):
        return (
            AIMessage.objects
            .filter(conversation=conversation)
            .order_by("created_at")
        )

    # ==========================================
    # OCR DOCUMENT
    # ==========================================

    def create_ocr_document(
        self,
        user,
        image,
    ):
        return OCRDocument.objects.create(
            user=user,
            image=image,
            file_name=image.name,
        )

    def update_ocr_document(
        self,
        document,
        extracted_data,
        confidence_score,
        status,
        warnings,
    ):
        document.extracted_data = extracted_data
        document.confidence_score = confidence_score
        document.status = status
        document.warnings = warnings

        document.save(
            update_fields=[
                "extracted_data",
                "confidence_score",
                "status",
                "warnings",
            ]
        )

        return document