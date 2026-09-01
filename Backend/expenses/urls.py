from django.urls import path
from . import controllers

urlpatterns = [
    path("expenses/categories/", controllers.list_categories, name="expense_categories"),
    path("expenses/", controllers.expenses_list_create, name="expenses_list_create"),
    path("expenses/<int:expense_id>/", controllers.expense_detail, name="expense_detail"),
    path("expenses/summary/", controllers.expense_summary, name="expense_summary"),
]