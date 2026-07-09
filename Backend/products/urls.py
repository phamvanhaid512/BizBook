from django.urls import path
from . import controllers

urlpatterns = [
    # path("products/", controllers.get_all_products),
    path("products/", controllers.get_paginated),
    path("products/<int:id>/", controllers.get_detail_product),
    path("products/create/", controllers.create_product),
    path("products/update/<int:id>/", controllers.update_product),
    path("products/delete/<int:id>/", controllers.delete_product),
]