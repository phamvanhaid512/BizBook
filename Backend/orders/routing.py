from django.urls import re_path
from .consumer import OrderConsumers
websocket_urlpatterns = [
    # Đảm bảo regex sử dụng \d+ (chỉ chấp nhận số) và kết thúc bằng dấu gạch chéo /
    re_path(r"^ws/orders/(?P<order_id>\d+)/$", OrderConsumers.as_asgi()),
]