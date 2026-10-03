from common.base_repository import BaseRepository
from .models import Warehouse, Stock, StockMovement


class WarehouseRepository(BaseRepository):
    def __init__(self):
        super().__init__(Warehouse)

    def get_active_warehouses(self):
        return self.get_model().objects.filter(status="ACTIVE").order_by("-id")

    def get_by_code(self, code):
        return self.get_model().objects.filter(code=code).first()


class StockRepository(BaseRepository):
    def __init__(self):
        super().__init__(Stock)

    def get_all(self, params=None):
        queryset = self.get_model().objects.select_related("warehouse").all().order_by("-id")
        if params:
            warehouse_code = params.get("warehouse_code")
            if warehouse_code and warehouse_code != "ALL":
                queryset = queryset.filter(warehouse__code=warehouse_code)

            search = params.get("search")
            if search:
                queryset = queryset.filter(product_name__icontains=search) | queryset.filter(sku__icontains=search)
        return queryset

    def get_by_id_for_update(self, id):
        """Khóa dòng tránh race condition khi bán hàng hoặc nhập xuất đồng thời."""
        return self.get_model().objects.select_for_update().select_related("warehouse").filter(id=id).first()

    def get_by_sku_and_warehouse(self, sku, warehouse_code):
        return self.get_model().objects.select_for_update().filter(sku=sku, warehouse__code=warehouse_code).first()

    def get_low_stocks(self):
        from django.db.models import F
        return self.get_model().objects.select_related("warehouse").filter(quantity__lte=F("min_threshold")).order_by("quantity")


class StockMovementRepository(BaseRepository):
    def __init__(self):
        super().__init__(StockMovement)

    def get_by_stock_id(self, stock_id):
        return self.get_model().objects.filter(stock_id=stock_id).order_by("-created_at")