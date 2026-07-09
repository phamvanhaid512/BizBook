from .models import Product
from common.base_repository import BaseRepository


class ProductsRepository(BaseRepository):
    def __init__(self):
        super().__init__(Product)

    def get_queryset(self):
        return self.get_model().objects.all().order_by("-id")
    
    def search_filter(self, keyword="", status="ALL", category_id=None):
        queryset = self.get_queryset()

        if keyword:
            queryset = queryset.filter(product_name__icontains=keyword)

        if status != "ALL":
            queryset = queryset.filter(status=status)

        if category_id:
            queryset = queryset.filter(category_id=category_id)

        return queryset