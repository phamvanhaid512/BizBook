from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/chat/table/(?P<table_id>\w+)/$', consumers.TableChatConsumer.as_asgi()),
    re_path(r'ws/chat/staff/$', consumers.StaffChatConsumer.as_asgi()),
]