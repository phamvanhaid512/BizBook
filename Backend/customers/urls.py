from django.urls import path
from . import controllers

urlpatterns = [
    # path("customers/", controllers.get_all),
    path("customers/", controllers.get_all_customers),

    path("customers/create/", controllers.create_customer),
    path("customers/<int:id>/update/", controllers.update_customer),
    path("customers/<int:id>/delete/", controllers.delete_customer),
]