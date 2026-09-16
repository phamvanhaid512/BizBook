import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

# 1. Import các pattern WebSocket và đổi tên (alias) để không bị đụng độ nhau
from orders.routing import websocket_urlpatterns as orders_ws_urlpatterns
from table_chat.routing import websocket_urlpatterns as table_chat_ws_urlpatterns

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_asgi_app = get_asgi_application()

# 2. Gộp tất cả các đường dẫn WebSocket của dự án lại thành một danh sách chung
combined_websocket_urlpatterns = orders_ws_urlpatterns + table_chat_ws_urlpatterns

application = ProtocolTypeRouter({
    # Xử lý API, Admin, HTTP thường
    "http": django_asgi_app,
    
    # Xử lý WebSocket Realtime
    "websocket": AuthMiddlewareStack(
        URLRouter(
            combined_websocket_urlpatterns
        )
    ),
})