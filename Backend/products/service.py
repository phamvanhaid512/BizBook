from common.base_service import BaseService
from .repository import ProductsRepository
from .serializers import ProductSerializer
from django.core.paginator import Paginator


class ProductService(BaseService):
    def __init__(self):
        super().__init__(
            ProductsRepository(),
            ProductSerializer
        )
    def get_paginated(self, params):
        page = int(params.get("page", 1))
        page_size = int(params.get("page_size", 5))
        keyword = params.get("keyword", "")
        status = params.get("status", "ALL")
        category_id = params.get("category_id")

        queryset = self._repository.search_filter(
            keyword=keyword,
            status=status,
            category_id=category_id
        )

        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)

        return {
            "success": True,
            "message": "Lấy danh sách sản phẩm thành công",
            "data": {
                "items": self._serializer_class(
                    page_obj.object_list,
                    many=True
                ).data,
                "pagination": {
                    "current_page": page_obj.number,
                    "page_size": page_size,
                    "total_items": paginator.count,
                    "total_pages": paginator.num_pages,
                    "has_next": page_obj.has_next(),
                    "has_previous": page_obj.has_previous(),
                }
            }
        }