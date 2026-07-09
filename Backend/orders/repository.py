from common.base_repository import BaseRepository
from .models import Order, OrderDetail


class OrderRepository(BaseRepository):
    def __init__(self):
        super().__init__(Order)

    def filter_orders(self, filters):
        return self.get_model().objects.filter(**filters).order_by("-id")

    # def get_by_order_code(self, order_code):
    #     return self.get_model().objects.filter(order_code=order_code).first()

    def get_by_id(self, id):
        return self.get_model().objects.filter(id=id).first()
    
    def search_filter(self, keyword="", status="ALL", payment_status="ALL"):
        queryset = self.get_model().objects.all().order_by("-id")

        if keyword:
            queryset = queryset.filter(order_code__icontains=keyword)

        if status != "ALL":
            queryset = queryset.filter(status=status)

        if payment_status != "ALL":
            queryset = queryset.filter(payment_status=payment_status)

        return queryset
class OrderDetailRepository(BaseRepository):
    def __init__(self):
        super().__init__(OrderDetail)

    def get_by_order_id(self, order_id):
        return self.get_model().objects.filter(order_id=order_id)