from .models import Bussiness_Tables
from common.base_repository import BaseRepository


class BussinessTablesRepository(BaseRepository):
    def __init__(self):
        super().__init__(Bussiness_Tables)

    def get_active_tables(self):
        return self.get_model().objects.exclude(status="INACTIVE").oder_by("-id")
