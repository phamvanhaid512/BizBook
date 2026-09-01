from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class ChatSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="chat_sessions")
    title = models.CharField(max_length=255, default="Cuộc trò chuyện mới")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "chat_sessions"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.title} ({self.user})"


class ChatMessage(models.Model):
    class Role(models.TextChoices):
        USER = "USER", "User"
        ASSISTANT = "ASSISTANT", "Assistant"
        SYSTEM = "SYSTEM", "System"

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "chat_messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.role}] {self.content[:30]}..."