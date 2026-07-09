
import qrcode
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from .serializers import BusinessTableSerializer
from common.base_service import BaseService
from .repository import BussinessTablesRepository

class BussinessService(BaseService):
    def __init__(self):
        super().__init__(BussinessTablesRepository(),BusinessTableSerializer)

    def generate_qr(self, id):
        table = self._repository.get_by_id(id)

        if not table:
            return {
                "success": False,
                "message": "Không tìm thấy bàn",
                "data": None
            }

        menu_url = f"{settings.FRONTEND_URL}/menu/table/{table.id}"

        qr = qrcode.make(menu_url)

        buffer = BytesIO()
        qr.save(buffer, format="PNG")

        file_name = f"table_{table.id}_qr.png"

        table.qr_code.save(
            file_name,
            ContentFile(buffer.getvalue()),
            save=True
        )

        return {
            "success": True,
            "message": "Tạo mã QR thành công",
            "data": self._serializer_class(table).data
        }
    def get_active_tables(self):
        tables = self._repository.get_active_tables()

        return {
            "success": True,
            "message": "Lấy danh sách bàn đang hoạt động thành công",
            "data": self._serializer_class(tables, many=True).data
        }
