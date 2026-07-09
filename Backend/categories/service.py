
from common.base_service import BaseService
from .repository import CategoriesRepository
from .serializers import CategorySerializer
class CategoryService(BaseService):
    def __init__(self):
        super().__init__(CategoriesRepository(),CategorySerializer)