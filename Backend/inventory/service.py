from django.db import transaction
from common.base_service import BaseService
from .repositories import WarehouseRepository, StockRepository, StockMovementRepository
from .serializers import WarehouseSerializer, StockSerializer, StockMovementSerializer


class WarehouseService(BaseService):
    def __init__(self):
        super().__init__(WarehouseRepository(), WarehouseSerializer)

    def get_active_warehouses(self):
        objects = self._repository.get_active_warehouses()
        data = self._serializer_class(objects, many=True).data
        return {
            "success": True,
            "message": "Lấy danh sách kho hoạt động thành công",
            "data": data,
        }


class StockService(BaseService):
    def __init__(self):
        super().__init__(StockRepository(), StockSerializer)
        self._warehouse_repo = WarehouseRepository()
        self._movement_repo = StockMovementRepository()

    def get_low_stocks(self):
        objects = self._repository.get_low_stocks()
        data = self._serializer_class(objects, many=True).data
        return {
            "success": True,
            "message": "Lấy danh sách hàng sắp hết thành công",
            "data": data,
        }
    @transaction.atomic
    def deduct_stock_for_order(self, order_items, order_code, warehouse_code=None):
        """
        Khấu trừ tồn kho cho các mặt hàng trong đơn hàng.
        - order_items: List các dict [{'product_id': ..., 'sku': ..., 'quantity': ...}] 
                       hoặc nhận queryset/model Product.
        - order_code: Mã tham chiếu đơn hàng (reference_code).
        """
        # Nếu hệ thống có kho mặc định
        default_warehouse = None
        if warehouse_code:
            default_warehouse = self._warehouse_repo.get_by_code(warehouse_code)

        for item in order_items:
            quantity = item.get("quantity", 0)
            sku = item.get("sku")
            product_id = item.get("product_id")

            # Tìm stock theo SKU hoặc Product ID và lock dòng dữ liệu tránh race condition
            if sku:
                stock = self._repository.get_by_sku_for_update(sku)
            elif product_id:
                # Truyền warehouse_code (nếu có) vào để xác định đúng kho cần trừ
                stock = self._repository.get_by_product_id_for_update(
                    product_id, warehouse_code=warehouse_code
                )
            else:
                stock = None

            if not stock:
                raise ValueError(f"Không tìm thấy tồn kho cho sản phẩm (Mã: {sku or product_id})")

            if stock.quantity < quantity:
                raise ValueError(
                    f"Sản phẩm {stock.product_name} không đủ tồn kho (Hiện có: {stock.quantity}, Cần: {quantity})"
                )

            # 1. Trừ tồn kho
            stock.quantity -= quantity
            stock.save()

            # 2. Ghi vết xuất kho bán hàng
            self._movement_repo.create({
                "stock": stock,
                "movement_type": "EXPORT",
                "quantity": quantity,
                "reference_code": order_code,
                "note": f"Xuất bán cho đơn hàng {order_code}",
            })

        return {"success": True, "message": f"Trừ kho đơn hàng {order_code} thành công"}

    @transaction.atomic
    def restore_stock_for_order(self, order_items, order_code):
        """
        Hoàn lại tồn kho khi đơn hàng bị hủy (CANCELLED).
        """
        for item in order_items:
            quantity = item.get("quantity", 0)
            sku = item.get("sku")
            product_id = item.get("product_id")

            if sku:
                stock = self._repository.get_by_sku_for_update(sku)
            elif product_id:
                stock = self._repository.get_by_product_id_for_update(product_id)
            else:
                stock = None

            if not stock:
                continue

            # Hoàn lại tồn kho
            stock.quantity += quantity
            stock.save()

            # Ghi vết hoàn trả kho
            self._movement_repo.create({
                "stock": stock,
                "movement_type": "IMPORT",
                "quantity": quantity,
                "reference_code": order_code,
                "note": f"Hoàn tồn do hủy đơn hàng {order_code}",
            })

        return {"success": True, "message": f"Hoàn tồn đơn hàng {order_code} thành công"}
    @transaction.atomic
    def process_transaction(self, data):
        stock_id = data.get("stock_id")
        action_type = data.get("action_type")
        quantity = data.get("quantity")
        reference_code = data.get("reference_code", "")
        note = data.get("note", "")
        target_warehouse_code = data.get("target_warehouse_code")

        stock = self._repository.get_by_id_for_update(stock_id)
        if not stock:
            return {"success": False, "message": "Không tìm thấy mặt hàng trong kho", "data": None}

        # 1. Nhập kho
        if action_type == "IMPORT":
            stock.quantity += quantity
            stock.save()
            self._movement_repo.create({
                "stock": stock,
                "movement_type": "IMPORT",
                "quantity": quantity,
                "reference_code": reference_code,
                "note": note or "Nhập kho",
            })

        # 2. Xuất kho
        elif action_type == "EXPORT":
            if stock.quantity < quantity:
                return {
                    "success": False,
                    "message": f"Tồn kho không đủ! Hiện tại: {stock.quantity}, cần xuất: {quantity}",
                    "data": None,
                }
            stock.quantity -= quantity
            stock.save()
            self._movement_repo.create({
                "stock": stock,
                "movement_type": "EXPORT",
                "quantity": quantity,
                "reference_code": reference_code,
                "note": note or "Xuất kho",
            })

        # 3. Chuyển kho
        elif action_type == "TRANSFER":
            if not target_warehouse_code:
                return {"success": False, "message": "Vui lòng chọn kho đích", "data": None}
            if stock.warehouse.code == target_warehouse_code:
                return {"success": False, "message": "Kho đích không được trùng kho hiện tại", "data": None}
            if stock.quantity < quantity:
                return {"success": False, "message": f"Tồn kho không đủ để chuyển! Hiện tại: {stock.quantity}", "data": None}

            # Trừ kho nguồn
            stock.quantity -= quantity
            stock.save()
            self._movement_repo.create({
                "stock": stock,
                "movement_type": "TRANSFER",
                "quantity": quantity,
                "reference_code": reference_code,
                "note": f"Chuyển sang kho {target_warehouse_code}. {note}",
            })

            # Cộng kho đích
            target_stock = self._repository.get_by_sku_and_warehouse(stock.sku, target_warehouse_code)
            if not target_stock:
                target_warehouse = self._warehouse_repo.get_by_code(target_warehouse_code)
                if not target_warehouse:
                    return {"success": False, "message": f"Không tìm thấy kho {target_warehouse_code}", "data": None}
                target_stock = self._repository.create({
                    "sku": stock.sku,
                    "product_name": stock.product_name,
                    "warehouse": target_warehouse,
                    "quantity": 0,
                    "min_threshold": stock.min_threshold,
                })

            target_stock.quantity += quantity
            target_stock.save()
            self._movement_repo.create({
                "stock": target_stock,
                "movement_type": "TRANSFER",
                "quantity": quantity,
                "reference_code": reference_code,
                "note": f"Nhận từ kho {stock.warehouse.code}. {note}",
            })

        return {
            "success": True,
            "message": "Thao tác kho thành công",
            "data": self._serializer_class(stock).data,
        }


class StockMovementService(BaseService):
    def __init__(self):
        super().__init__(StockMovementRepository(), StockMovementSerializer)

    def get_history_by_stock(self, stock_id):
        objects = self._repository.get_by_stock_id(stock_id)
        data = self._serializer_class(objects, many=True).data
        return {
            "success": True,
            "message": "Lấy lịch sử giao dịch thành công",
            "data": data,
        }