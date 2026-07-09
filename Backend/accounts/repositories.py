from common.base_repository import BaseRepository
from .models import Account

class AccountRepository(BaseRepository):
    def __init__(self):
        super().__init__(Account)

    def get_by_username(self, username):
        return self.get_model().objects.filter(username=username).first()

    def get_active_accounts(self):
        return self.get_model().objects.filter(status="ACTIVE")