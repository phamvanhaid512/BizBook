from django.urls import path
from . import controllers

urlpatterns = [
    path('table-chat/<int:table_id>/history/', controllers.get_table_history),
    path('table-chat/request/', controllers.send_table_request),
]