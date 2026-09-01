from rest_framework import serializers

from .models import AIConversation


class AIConversationSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = AIConversation
        fields = [
            "id",
            "title",
            "created_at",
            "updated_at",
        ]


class ChatRequestSerializer(
    serializers.Serializer
):
    conversation_id = serializers.IntegerField(
        required=False,
        allow_null=True,
    )

    message = serializers.CharField(
        required=True,
        max_length=2000,
        trim_whitespace=True,
    )


class OCRRequestSerializer(
    serializers.Serializer
):
    image = serializers.ImageField(
        required=True,
    )