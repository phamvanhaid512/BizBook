from .models import Categories
from common.base_repository import BaseRepository
class CategoriesRepository(BaseRepository):
    def __init__(self):
        super().__init__(Categories)
        
