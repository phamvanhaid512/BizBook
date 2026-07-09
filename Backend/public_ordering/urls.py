from django.urls import path
from . import controllers


urlpatterns = [
    path("public/menu/table/<int:table_id>/",controllers.get_menu_by_table),
    path("public/orders/create/",controllers.create_public_order),
    
]