import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .repository import TableChatRepository

class TableChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.table_id = self.scope['url_route']['kwargs']['table_id']
        self.room_group_name = f'chat_table_{self.table_id}'
        self.staff_group_name = 'pos_staff_notifications'

        # Đăng ký tham gia vào Group của bàn này
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """ Xử lý khi Khách hoặc Nhân viên gõ chat bình thường gửi lên """
        data = json.loads(text_data)
        message = data.get('message')
        sender_type = data.get('sender_type', 'CUSTOMER') # CUSTOMER hoặc STAFF
        customer_name = data.get('customer_name', 'Khách hàng')

        # 1. Lưu vào Database
        saved_msg = await self.save_message(self.table_id, sender_type, customer_name, message)

        if saved_msg:
            payload = {
                'type': 'chat_message',
                'id': saved_msg.id,
                'table_id': self.table_id,
                'sender': 'user' if sender_type == 'CUSTOMER' else 'system',
                'text': message,
                'time': saved_msg.created_at.strftime("%H:%M")
            }

            # 2. Bắn cho khách xem
            await self.channel_layer.group_send(self.room_group_name, payload)
            
            # 3. Bắn cho nhân viên xem (nếu khách gửi)
            if sender_type == 'CUSTOMER':
                await self.channel_layer.group_send(self.staff_group_name, payload)

    async def chat_message(self, event):
        """ Gửi event về lại Frontend qua WebSocket """
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def save_message(self, table_id, sender_type, customer_name, content):
        repo = TableChatRepository()
        return repo.create_message(table_id, sender_type, customer_name, content)

# (Giữ nguyên class TableChatConsumer cũ của bạn ở trên)

class StaffChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Kênh tổng cho toàn bộ màn hình POS/Admin
        self.staff_group_name = 'pos_staff_notifications'

        # Đăng ký tham gia vào Group tổng
        await self.channel_layer.group_add(self.staff_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        # Rời group khi Admin đóng web
        await self.channel_layer.group_discard(self.staff_group_name, self.channel_name)

    async def receive(self, text_data):
        """ Xử lý khi Admin gõ tin nhắn trả lời khách """
        data = json.loads(text_data)
        table_id = data.get('table_id')
        message = data.get('message')
        sender_type = data.get('sender_type', 'STAFF')

        # 1. Lưu tin nhắn của Admin vào Database
        saved_msg = await self.save_message(table_id, sender_type, "Nhân viên", message)

        if saved_msg:
            payload = {
                'type': 'chat_message',
                'id': saved_msg.id,
                'table_id': table_id,
                'sender': 'staff',
                'text': message,
                'time': saved_msg.created_at.strftime("%H:%M")
            }
            
            # 2. Bắn tin nhắn này về lại đúng Bàn của khách đó
            await self.channel_layer.group_send(f'chat_table_{table_id}', payload)
            
            # 3. Bắn đồng bộ cho các màn hình Admin khác (nếu quán có nhiều máy POS)
            await self.channel_layer.group_send(self.staff_group_name, payload)

    async def chat_message(self, event):
        """ Gửi event về lại Frontend qua WebSocket """
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def save_message(self, table_id, sender_type, customer_name, content):
        from .repository import TableChatRepository
        repo = TableChatRepository()
        return repo.create_message(table_id, sender_type, customer_name, content)