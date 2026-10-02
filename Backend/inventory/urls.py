from django.urls import path
from . import controllers

urlpatterns = [
    # Tồn kho & Giao dịch
    path("inventory/stocks/", controllers.get_all_stocks),
    path("inventory/stocks/create/", controllers.create_stock),
    path("inventory/stocks/low-stock/", controllers.get_low_stocks),
    path("inventory/stocks/transaction/", controllers.process_stock_transaction),
    path("inventory/stocks/<int:id>/", controllers.get_detail_stock),
    path("inventory/stocks/<int:id>/update/", controllers.update_stock),
    path("inventory/stocks/<int:id>/delete/", controllers.delete_stock),
    path("inventory/stocks/<int:id>/movements/", controllers.get_stock_movements),

    # Danh mục kho
    path("inventory/warehouses/", controllers.get_all_warehouses),
    path("inventory/warehouses/active/", controllers.get_active_warehouses),
    path("inventory/warehouses/create/", controllers.create_warehouse),
    path("inventory/warehouses/<int:id>/", controllers.get_detail_warehouse),
    path("inventory/warehouses/<int:id>/update/", controllers.update_warehouse),
    path("inventory/warehouses/<int:id>/delete/", controllers.delete_warehouse),
]