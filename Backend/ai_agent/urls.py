from django.urls import path
from . import controllers

urlpatterns = [
    path("ai-agents/chat/",controllers.chat),
    # path(
    #     "documents/analyze",
    #     controllers.analyze_document
    # ),
    # path(
    #     "conversations",
    #     controllers.list_converstions
    # ),
    path(
        "ai-agents/conversations/<int:conversation_id>/messages/",
        controllers.get_messages,
    )
]