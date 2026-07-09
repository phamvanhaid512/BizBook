from common.base_repository import BaseRepository
from  .models import Customer
class CustomerRepository(BaseRepository):
    def __init__(self):
        super().__init__(Customer)

    
    def search_filter(self, keyword="", status="ALL"):
        queryset = self.get_model().objects.all().order_by("-id")

        if keyword:
            queryset = queryset.filter(customer_name__icontains=keyword)

        if status != "ALL":
            queryset = queryset.filter(status=status)

        return queryset