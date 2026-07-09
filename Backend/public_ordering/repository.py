from bussiness_tables.models import Bussiness_Tables
from common.base_repository import BaseRepository
from products.models import Product
from orders.models import Order, OrderDetail


class PublicOrderingRepository(BaseRepository):
    def __init__(self):
        super().__init__(Bussiness_Tables)
