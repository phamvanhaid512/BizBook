import os
from django.core.asgi import get_asgi_application

# BƯỚC 1: Cấu hình settings module trước tiên
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# BƯỚC 2: Khởi tạo Django ASGI application ngay tại đây
# Dòng này kích hoạt Django nạp xong toàn bộ INSTALLED_APPS và Models
django_asgi_app = get_asgi_application()

# BƯỚC 3: SAU ĐÓ MỚI IMPORT Channels, Routing và Consumers
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from orders.routing import websocket_urlpatterns as orders_ws_urlpatterns
from table_chat.routing import websocket_urlpatterns as table_chat_ws_urlpatterns

# BƯỚC 4: Gộp router và cấu hình application
combined_websocket_urlpatterns = orders_ws_urlpatterns + table_chat_ws_urlpatterns

application = ProtocolTypeRouter({
    # Xử lý HTTP (API, Admin, Web thường)
    "http": django_asgi_app,
    
    # Xử lý WebSocket
    "websocket": AuthMiddlewareStack(
        URLRouter(
            combined_websocket_urlpatterns
        )
    ),
})