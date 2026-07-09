import uuid
from decimal import Decimal
from django.core.paginator import Paginator

from common.base_service import BaseService
from customers.models import Customer
from accounts.models import Account
from products.models import Product
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Order, OrderDetail
from .repository import OrderRepository
from .serializers import OrderSerializer, CreateOrderSerializer


class OrderService(BaseService):
    def __init__(self):
        super().__init__(OrderRepository(), OrderSerializer)


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
        print("serializer",serializer)
        if not serializer.is_valid():
            return {
                "success": False,
                "message": "Dữ liệu đơn hàng không hợp lệ",
                "data": serializer.errors
        }

        validated_data = serializer.validated_data

        customer = None
        created_by = None

        customer_id = validated_data.get("customer")
        created_by_id = validated_data.get("created_by")

        if customer_id:
            customer = Customer.objects.filter(id=customer_id).first()

            if not customer:
                return {
                    "success": False,
                    "message": "Khách hàng không tồn tại",
                    "data": None
                }

        if created_by_id:
            created_by = Account.objects.filter(id=created_by_id).first()

            if not created_by:
                return {
                    "success": False,
                    "message": "Tài khoản tạo đơn không tồn tại",
                    "data": None
                }

        order = Order.objects.create(
            order_code="ORD-" + str(uuid.uuid4()).replace("-", "")[:8].upper(),
            customer= customer,
            created_by=created_by,
            note=validated_data.get("note", ""),
            total_amount=0,
            status="PENDING",
            payment_status="UNPAID"
        )
        total_amount = Decimal("0")
        for item in validated_data["items"]:
            product = Product.objects.filter(id=item["product_id"]).first()

            if not product:
                order.delete()
                return {
                    "success": False,
                    "message": f"Sản phẩm ID {item['product_id']} không tồn tại",
                    "data": None
                }

            quantity = item["quantity"]
            unit_price = product.price
            total_price = unit_price * quantity

            OrderDetail.objects.create(
                order=order,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
                total_price=total_price
            )

            total_amount += total_price

        order.total_amount = total_amount
        order.save()

        return {
            "success": True,
            "message": "Tạo đơn hàng thành công",
            "data": self._serializer_class(order).data
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
        order = self._repository.get_by_id(id)

        if not order:
            return {
                "success": False,
                "message": "Không tìm thấy đơn hàng",
                "data": None
            }

        valid_payment_status = ["UNPAID", "PAID"]

        if payment_status not in valid_payment_status:
            return {
                "success": False,
                "message": "Trạng thái thanh toán không hợp lệ",
                "data": None
            }

        order.payment_status = payment_status
        order.save()

        return {
            "success": True,
            "message": "Cập nhật trạng thái thanh toán thành công",
            "data": self._serializer_class(order).data
        }