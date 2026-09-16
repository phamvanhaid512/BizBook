"""
URL configuration for config project.
"""
from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/", include("accounts.urls")),
    path("api/", include("customers.urls")),
    path("api/", include("categories.urls")),
    path("api/", include("products.urls")),
    path("api/", include("orders.urls")),
    path("api/", include("bussiness_tables.urls")),
    path("api/", include("public_ordering.urls")),
    path("api/", include("dashboard.urls")),
    path("api/", include("data_mining.urls")),
    path("api/", include("ai_agent.urls")),
    path("api/", include("expenses.urls")),
    path("api/", include("documents.urls")),
    path("api/", include("table_chat.urls")),   # <-- Thêm route này
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)