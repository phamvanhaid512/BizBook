import uuid
from decimal import Decimal
from django.core.paginator import Paginator
from common.base_service import BaseService
from customers.models import Customer
from accounts.models import Account
from products.models import Product
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Order, OrderDetail,Bussiness_Tables
from .repository import OrderRepository
from .serializers import OrderSerializer, CreateOrderSerializer
from django.db import transaction
from django.utils import timezone
import uuid
from django.db import transaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from decimal import Decimal
from inventory.service import StockService
class OrderService(BaseService):
    def __init__(self):
        super().__init__(OrderRepository(), OrderSerializer)
        self._stock_service = StockService()

    def get_paginated(self, params):
        page = int(params.get("page", 1))
        page_size = int(params.get("page_size", 5))
        keyword = params.get("keyword", "")
        status = params.get("status", "ALL")
        payment_status = params.get("payment_status", "ALL")

        queryset = self._repository.search_filter(
            keyword=keyword,
            status=status,
            payment_status=payment_status
        )

        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)

        return {
            "success": True,
            "message": "Lấy danh sách đơn hàng thành công",
            "data": {
                "items": self._serializer_class(
                    page_obj.object_list,
                    many=True
                ).data,
                "pagination": {
                    "current_page": page_obj.number,
                    "page_size": page_size,
                    "total_items": paginator.count,
                    "total_pages": paginator.num_pages,
                    "has_next": page_obj.has_next(),
                    "has_previous": page_obj.has_previous(),
                }
            }
        }
    
    def filter_orders(self,params):
        filters={}
        status = params.get("status")
        payment_status = params.get("payment_status")
        customer_id = params.get("customer_id")
        created_by_id = params.get("created_by_id")

        if status:
            filters["status"] = status
        if payment_status:
            filters["payment_status"] = payment_status
            
        
        if filters:
            orders = self._repository.filters_orders()
        else:
            orders = self._repository.get
    def get_orders(self, params):
        filters = {}

        status = params.get("status")
        payment_status = params.get("payment_status")
        customer_id = params.get("customer_id")
        created_by_id = params.get("created_by_id")

        if status:
            filters["status"] = status

        if payment_status:
            filters["payment_status"] = payment_status

        if customer_id:
            filters["customer_id"] = customer_id

        if created_by_id:
            filters["created_by_id"] = created_by_id

        if filters:
            orders = self._repository.filter_orders(filters)
        else:
            orders = self._repository.get_all()

        return self._serializer_class(orders, many=True).data

    def create_order(self, data):
        serializer = CreateOrderSerializer(data=data)
        if not serializer.is_valid():
            return {
                "success": False,
                "message": "Dữ liệu đơn hàng không hợp lệ",
                "data": serializer.errors,
            }

        validated_data = serializer.validated_data

        # 1. Xử lý thông tin bàn
        table = None
        table_id = validated_data.get("table") or validated_data.get("table_id")
        if table_id:
            if isinstance(table_id, Bussiness_Tables):
                table = table_id
            else:
                table = Bussiness_Tables.objects.filter(id=table_id).first()
                if not table:
                    return {
                        "success": False,
                        "message": f"Bàn với ID {table_id} không tồn tại",
                        "data": None,
                    }

        # 2. Xử lý thông tin khách hàng
        customer = None
        customer_phone = validated_data.get("customer_phone")
        customer_name = validated_data.get("customer_name") or "Khách tại bàn"
        customer_id = validated_data.get("customer")

        if customer_id:
            customer = Customer.objects.filter(id=customer_id).first()
            if not customer:
                return {
                    "success": False,
                    "message": "Khách hàng không tồn tại",
                    "data": None,
                }
        elif customer_phone:
            customer, created = Customer.objects.get_or_create(
                phone=customer_phone,
                defaults={"customer_name": customer_name},
            )
            if not created and customer_name != "Khách tại bàn" and customer.customer_name != customer_name:
                customer.customer_name = customer_name
                customer.save(update_fields=["customer_name"])

        # 3. Xử lý người tạo đơn
        created_by = None
        created_by_id = validated_data.get("created_by")
        if created_by_id:
            created_by = Account.objects.filter(id=created_by_id).first()
            if not created_by:
                return {
                    "success": False,
                    "message": "Tài khoản tạo đơn không tồn tại",
                    "data": None,
                }

        # 4. Tạo Order và OrderDetail (Chưa trừ kho ở bước này)
        try:
            with transaction.atomic():
                order = Order.objects.create(
                    order_code="ORD-" + str(uuid.uuid4()).replace("-", "")[:8].upper(),
                    table=table,
                    customer=customer,
                    created_by=created_by,
                    note=validated_data.get("note", ""),
                    total_amount=Decimal("0"),
                    status="PENDING",
                    payment_status="UNPAID",
                    created_at=timezone.now(),
                )

                total_amount = Decimal("0")
                for item in validated_data["items"]:
                    product = Product.objects.filter(id=item["product_id"]).first()
                    if not product:
                        raise ValueError(f"Sản phẩm ID {item['product_id']} không tồn tại")

                    quantity = item["quantity"]
                    unit_price = product.price
                    total_price = unit_price * quantity

                    OrderDetail.objects.create(
                        order=order,
                        product=product,
                        quantity=quantity,
                        unit_price=unit_price,
                        total_price=total_price,
                    )
                    total_amount += total_price

                order.total_amount = total_amount
                order.save(update_fields=["total_amount"])

                if table and table.status == "AVAILABLE":
                    table.status = "OCCUPIED"
                    table.save(update_fields=["status"])

        except ValueError as e:
            return {
                "success": False,
                "message": str(e),
                "data": None,
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Lỗi hệ thống: {str(e)}",
                "data": None,
            }

        return {
            "success": True,
            "message": "Tạo đơn hàng thành công",
            "data": self._serializer_class(order).data,
        }
        # customers = Customer._repository.create({
        #    data.customer_name = customer_name
        # })
        # if not data:
        #     return {
        #         "success": False,
        #         "message": "Dữ liệu nhập chưa hợp lệ",
        #         "data": None
        #     }
        # order = self._repository.create({

        # })

        # orderDetail = OrderDetail._repository.create({
        #     quantity = data.quantity,
        #     total_price = data.total_price,
        #     order_id = order.id,
        #     product_id = 
        # })

        
    def update_order_status(self, id, status):
        print("status:", status)

        order = self._repository.get_by_id(id)
        print("order:", order)

        if not order:
            return {
                "success": False,
                "message": "Không tìm thấy đơn hàng",
                "data": None,
            }

        valid_status = [
            "PENDING",
            "PROCESSING",
            "COMPLETED",
            "CANCELLED",
        ]

        if status not in valid_status:
            return {
                "success": False,
                "message": "Trạng thái đơn hàng không hợp lệ",
                "data": None,
            }

        # Cập nhật trạng thái đơn hàng
        order.status = status
        order.save()

        # Lấy Channel Layer
        channel_layer = get_channel_layer()

        # Gửi sự kiện tới group WebSocket của đơn hàng
        async_to_sync(channel_layer.group_send)(
            f"order_{order.id}",
            {
                "type": "order_status",
                "data": {
                    "id": order.id,
                    "status": order.status,
                    "payment_status": order.payment_status,
                },
            },
        )

        return {
            "success": True,
            "message": "Cập nhật trạng thái đơn hàng thành công",
            "data": self._serializer_class(order).data,
        }

    def update_payment_status(self, id, payment_status):
        # 1. Chuẩn hóa giá trị status
        new_status = (
            payment_status.get("payment_status")
            if isinstance(payment_status, dict)
            else payment_status
        )
        valid_payment_status = {"UNPAID", "PAID"}

        if new_status not in valid_payment_status:
            return {
                "success": False,
                "message": "Trạng thái thanh toán không hợp lệ",
                "data": None,
            }

        try:
            with transaction.atomic():
                # Khóa đơn hàng ngay từ đầu để tránh 2 webhook/request cùng đọc trạng thái UNPAID
                # Lưu ý: nếu repository chưa có hàm get_by_id_for_update, hãy dùng Order.objects.select_for_update().get(id=id)
                order = getattr(
                    self._repository, "get_by_id_for_update", None
                ) and self._repository.get_by_id_for_update(id)
                if not order:
                    order = self._repository.get_by_id(id)

                if not order:
                    return {
                        "success": False,
                        "message": "Không tìm thấy đơn hàng",
                        "data": None,
                    }

                # Idempotency check: Nếu đơn đã PAID trước đó rồi thì bỏ qua, không trừ lại
                if order.payment_status == new_status:
                    return {
                        "success": True,
                        "message": f"Đơn hàng vốn đã ở trạng thái {new_status}",
                        "data": self._serializer_class(order).data,
                    }

                # Thực hiện trừ kho khi đơn chuyển sang PAID
                if new_status == "PAID":
                    # Kiểm tra chính xác related_name giữa 'details' hoặc 'items' trong model Order của bạn
                    details_manager = getattr(
                        order, "details", None
                    ) or getattr(order, "items", None)
                    if not details_manager:
                        raise ValueError(
                            "Không tìm thấy danh sách chi tiết món/sản phẩm trong đơn hàng"
                        )

                    items_to_deduct = [
                        {
                            "product_id": detail.product_id,
                            "sku": getattr(detail.product, "sku", None),
                            "quantity": detail.quantity,
                        }
                        for detail in details_manager.select_related(
                            "product"
                        ).all()
                    ]

                    # Gọi StockService
                    self._stock_service.deduct_stock_for_order(
                        order_items=items_to_deduct,
                        order_code=getattr(order, "order_code", str(order.id)),
                    )

                order.payment_status = new_status
                order.save(update_fields=["payment_status"])

        except ValueError as e:
            return {
                "success": False,
                "message": f"Không thể thanh toán do lỗi kho: {str(e)}",
                "data": None,
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Lỗi cập nhật thanh toán: {str(e)}",
                "data": None,
            }

        # Bắn thông báo Realtime (nằm ngoài block transaction để tránh nghẽn DB)
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"order_{order.id}",
                {
                    "type": "order_status",
                    "data": {
                        "id": order.id,
                        "status": order.status,
                        "payment_status": order.payment_status,
                    },
                },
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": "Cập nhật trạng thái thanh toán và khấu trừ kho thành công",
            "data": self._serializer_class(order).data,
        }