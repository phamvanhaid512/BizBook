from common.base_repository import BaseRepository
from django.db.models import Count
from .models import ChatMessage, ChatSession


class ChatSessionRepository(BaseRepository):
    def __init__(self):
        super().__init__(ChatSession)
    # Thêm hàm create nhận user và title
    def create(self, user, title):
        return self.get_model().objects.create(user=user, title=title)

    def get_owned_by_user(self, session_id, user):
        return (
            self.get_model().objects
            .filter(id=session_id, user=user)
            .first()
        )

    def get_all_by_user(self, user):
        return (
            self.get_model().objects
            .filter(user=user)
            .annotate(message_count=Count("messages"))
            .order_by("-updated_at")
        )

    def update_title(self, session, title):
        session.title = title
        session.save(update_fields=["title", "updated_at"])
        return session

    def touch(self, session):
        session.save(update_fields=["updated_at"])


class ChatMessageRepository(BaseRepository):
    def __init__(self):
        super().__init__(ChatMessage)

    def create_message(self, session, role, content, metadata=None):
        message = self.get_model().objects.create(
            session=session,
            role=role,
            content=content,
            metadata=metadata or {},
        )
        session.save(update_fields=["updated_at"])
        return message

    def get_all_by_session(self, session):
        return (
            self.get_model().objects
            .filter(session=session)
            .order_by("created_at")
        )

    def get_recent_by_session(self, session, limit=20):
        messages = list(
            self.get_model().objects
            .filter(session=session)
            .order_by("-created_at")[:limit]
        )
        messages.reverse()
        return messages