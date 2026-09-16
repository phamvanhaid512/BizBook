from common.base_service import BaseService
from .repository import TableChatRepository
from .serializers import TableChatMessageSerializer

class TableChatService(BaseService):
    def __init__(self):
        self.chat_repo = TableChatRepository()
        super().__init__(self.chat_repo, TableChatMessageSerializer)

    def get_history(self, table_id):
        messages = self.chat_repo.get_history_by_table(table_id)
        return {
            "success": True,
            "message": "Lấy lịch sử chat thành công",
            "data": TableChatMessageSerializer(messages, many=True).data
        }