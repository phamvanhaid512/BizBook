from django.urls import path
from . import controllers

urlpatterns = [
    path("categories/", controllers.get_all_categories),
    path("categories/<int:id>/", controllers.get_detail_categories),
    path("categories/create/", controllers.create_categories),
    path("categories/<int:id>/update/", controllers.update_categories),
    path("categories/<int:id>/delete/", controllers.delete_categories),
]