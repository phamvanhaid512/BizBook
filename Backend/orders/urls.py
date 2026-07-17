from django.urls import path
from . import controllers

urlpatterns = [
    path("orders/", controllers.get_all_orders),
    path("orders/create/", controllers.create_order),
    # Api-User    

    path("orders/<int:id>/status/",controllers.get_detail_order_status),

    path("orders/<int:id>/", controllers.get_detail_order),
    path("orders/<int:id>/update/", controllers.update_order),
    path("orders/<int:id>/delete/", controllers.delete_order),
    path("orders/filter",controllers.filter_orders),
    path("orders/<int:id>/update-status/", controllers.update_order_status),
    path("orders/<int:id>/payment-status/", controllers.update_payment_status),

]