from rest_framework import serializers

from .models import ChatMessage, ChatSession


class CreateSessionRequestSerializer(serializers.Serializer):
    title = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
    )


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(
        allow_blank=False,
        trim_whitespace=True,
        max_length=2000,
    )
    session_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
    )


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "role",
            "content",
            "metadata",
            "created_at",
        ]


class ChatSessionSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    message_count = serializers.IntegerField(
        read_only=True,
        required=False,
    )

    class Meta:
        model = ChatSession
        fields = [
            "id",
            "title",
            "last_message",
            "message_count",
            "created_at",
            "updated_at",
        ]

    def get_last_message(self, obj):
        message = obj.messages.order_by("-created_at").first()
        return message.content if message else None
