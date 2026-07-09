from common.base_service import BaseService
from .repository import CustomerRepository
from .serializers import CustomerSerializer
from django.core.paginator import Paginator

class CustomerService(BaseService):
    def __init__(self):
        super().__init__(CustomerRepository(),CustomerSerializer)
        self.__repository = CustomerRepository()

    def get_paginated(self, params):
        page = int(params.get("page", 1))
        page_size = int(params.get("page_size", 5))
        keyword = params.get("keyword", "")
        status = params.get("status", "ALL")

        queryset = self._repository.search_filter(
            keyword=keyword,
            status=status
        )

        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)

        return {
            "success": True,
            "message": "Lấy danh sách khách hàng thành công",
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