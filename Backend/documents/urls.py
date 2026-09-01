from django.urls import path
from . import controllers

urlpatterns = [
    path("documents/analyze/", controllers.analyze_document, name="documents_analyze"),
    path("documents/confirm/", controllers.confirm_document, name="documents_confirm"),
]