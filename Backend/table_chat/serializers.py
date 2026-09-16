from rest_framework import serializers
from .models import TableChatMessage

class TableChatMessageSerializer(serializers.ModelSerializer):
    # Trả về giờ:phút giống Frontend yêu cầu
    time = serializers.DateTimeField(source="created_at", format="%H:%M", read_only=True)
    message = serializers.CharField(source="content") # Map 'content' trong DB ra 'message' cho FE
    
    class Meta:
        model = TableChatMessage
        fields = ["id", "sender_type", "customer_name", "message", "time"]