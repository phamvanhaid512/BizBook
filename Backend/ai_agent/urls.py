from django.urls import path
from . import controllers

urlpatterns = [
    path("ai-agents/chat/",controllers.chat,name="ai_agents_chat"),
    path("ai-agents/conversations/",controllers.conversations,name="ai_agents_conversations"),
    path("ai-agents/conversations/<int:conversation_id>/",controllers.conversation_detail,name="ai_agents_conversation_detail"),
    path("ai-agents/conversations/<int:conversation_id>/messages/",controllers.get_messages,name="ai_agents_messages"),
]