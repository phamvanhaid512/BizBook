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

from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from common.api_response import ApiResponse
from common.untils import RequestData
from common.error_handler import handle_api_exception
from .service import TableChatService

chat_service = TableChatService()

@csrf_exempt
@require_http_methods(["GET"])
def get_table_history(request, table_id):
    """ Tải lịch sử chat khi khách mới mở trang Menu """
    try:
        result = chat_service.get_history(table_id)
        if not result["success"]:
            return ApiResponse.error(result["message"], 400)
        return ApiResponse.success(result["data"], result["message"])
    except Exception as error:
        return handle_api_exception(error=error, api_name="get_table_history", request=request)


@csrf_exempt
@require_http_methods(["POST"])
def send_table_request(request):
    """ API nhận lệnh Gọi nhân viên / Gọi thanh toán """
    try:
        data = RequestData.get_body(request)
        table_id = data.get("table_id")
        request_type = data.get("request_type") # 'CALL_STAFF' hoặc 'CALL_PAYMENT'
        payment_method = data.get("payment_method") # 'CASH' hoặc 'TRANSFER'
        customer_name = data.get("customer_name", "Khách hàng")

        # 1. Định dạng thông báo
        if request_type == "CALL_PAYMENT":
            method_str = "Tiền mặt" if payment_method == "CASH" else "Chuyển khoản"
            msg_content = f"🔔 Yêu cầu THANH TOÁN bằng {method_str}."
        else:
            msg_content = f"🔔 Đang GỌI NHÂN VIÊN hỗ trợ."

        # 2. Lưu vào Database
        saved_msg = chat_service.chat_repo.create_message(
            table_id=table_id,
            sender_type="SYSTEM",
            customer_name=customer_name,
            content=msg_content
        )

        # 3. Bắn Real-time qua Channels
        if saved_msg:
            channel_layer = get_channel_layer()
            payload = {
                "type": "chat_message",
                "id": saved_msg.id,
                "table_id": table_id,
                "sender": "system",
                "text": msg_content,
                "time": saved_msg.created_at.strftime("%H:%M")
            }
            # Bắn về lại cho khách (để hiện lên chat)
            async_to_sync(channel_layer.group_send)(f'chat_table_{table_id}', payload)
            # Bắn lên màn hình POS cho thu ngân
            async_to_sync(channel_layer.group_send)('pos_staff_notifications', payload)

        return ApiResponse.success(None, "Đã gửi yêu cầu thành công")
    except Exception as error:
        return handle_api_exception(error=error, api_name="send_table_request", request=request)