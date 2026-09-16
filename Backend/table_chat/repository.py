from common.base_repository import BaseRepository
from .models import TableChatMessage
from bussiness_tables.models import Bussiness_Tables

class TableChatRepository(BaseRepository):
    def __init__(self):
        super().__init__(TableChatMessage)

    def get_history_by_table(self, table_id):
        return self.get_model().objects.filter(table_id=table_id).order_by("created_at")

    def create_message(self, table_id, sender_type, customer_name, content):
        table = Bussiness_Tables.objects.filter(id=table_id).first()
        if not table:
            return None
        return self.get_model().objects.create(
            table=table,
            sender_type=sender_type,
            customer_name=customer_name,
            content=content
        )