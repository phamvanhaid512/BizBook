from django.urls import path
from . import controllers


urlpatterns = [
    path("tables/",controllers.get_all_tables),
    path("tables/active/",controllers.get_active_tables),
    path("tables/create/",controllers.create_table),
    path("tables/<int:id>/",controllers.get_detail_table),
    path("tables/<int:id>/update/",controllers.update_table),
    path("tables/<int:id>/delete/",controllers.delete_table),
    path("tables/<int:id>/generate-qr/",controllers.generate_qr),
]