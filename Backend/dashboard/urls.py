from django.urls import path
from . import controllers

urlpatterns = [
    path("dashboard/revenue_summary/",controllers.get_dashboard_summary)
]