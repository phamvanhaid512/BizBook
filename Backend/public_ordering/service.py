import uuid
from decimal import Decimal

from common.base_service import BaseService

from .repository import PublicOrderingRepository
from .serializers import PublicCreateOrderSerializer

from products.serializers import ProductSerializer
from orders.serializers import OrderSerializer


class PublicOrderingService(BaseService):
    def __init__(self):
        super().__init__(PublicOrderingRepository(),PublicCreateOrderSerializer)

    def get_menu_by_table(self, table_id):
        table = self._repository.get_by_id(table_id)

        if not table:
            return {
                "success": False,
                "message": "Bàn không tồn tại hoặc đã ngừng sử dụng",
                "data": None
            }

        return {
            "success": True,
            "message": "Lấy menu thành công",
            "data": {
                    "table": {
                        "id": table.id,
                        "qr_code": table.qr_code.url if table.qr_code else None,
                        "table_name": table.table_name,
                        "status": table.status
                    }
            }
    }

    def create_order_from_qr(self, data):
        serializer = PublicCreateOrderSerializer(data=data)

        if not serializer.is_valid():
            return {
                "success": False,
                "message": "Dữ liệu đặt món không hợp lệ",
                "data": serializer.errors
            }

        validated_data = serializer.validated_data

        table = self.__repository.get_table_by_id(
            validated_data["table_id"]
        )

        if not table:
            return {
                "success": False,
                "message": "Bàn không tồn tại hoặc đã ngừng sử dụng",
                "data": None
            }

        order = self.__repository.create_order({
            "order_code": "ORD-" + str(uuid.uuid4()).replace("-", "")[:8].upper(),
            "table": table,
            "customer": None,
            "created_by": None,
            "total_amount": 0,
            "status": "PENDING",
            "payment_status": "UNPAID",
            "note": validated_data.get("note", "")
        })

        total_amount = Decimal("0")

        for item in validated_data["items"]:
            product = self.__repository.get_active_product_by_id(
                item["product_id"]
            )

            if not product:
                order.delete()

                return {
                    "success": False,
                    "message": f"Sản phẩm ID {item['product_id']} không tồn tại hoặc đã ngừng bán",
                    "data": None
                }

            quantity = item["quantity"]
            unit_price = product.price
            total_price = unit_price * quantity

            self.__repository.create_order_detail({
                "order": order,
                "product": product,
                "quantity": quantity,
                "unit_price": unit_price,
                "total_price": total_price
            })

            total_amount += total_price

        order.total_amount = total_amount
        order.save()

        self.__repository.update_table_status(table, "OCCUPIED")

        return {
            "success": True,
            "message": "Đặt món thành công",
            "data": OrderSerializer(order).data
        }