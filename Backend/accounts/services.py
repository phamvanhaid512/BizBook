from django.contrib.auth import authenticate
from common.base_service import BaseService
from common.jwt_service import JWTService
from .repositories import AccountRepository
from .models import Account
from .serializers import AccountSerializer
class AccountService(BaseService):
    def __init__(self):
        super().__init__(AccountRepository(),AccountSerializer)
        self.__repository = AccountRepository()

    def login(self,data):
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return {
                "success":False,
                "message":"Vui long nhap username va password"
            }
        user = authenticate(username = username, password= password)
        if not user:
            return {
                "success": False,
                "message": "Tên đăng nhập hoặc mật khẩu không đúng"
            }
        if user.status != "ACTIVE":
            return {
                "success": False,
                "message": "Tài khoản đã bị khóa"
            }
        
        token = JWTService.generate_token(user)

        return {
            "success":True,
            "message":"Dang nhap thanh cong",
            "data": {
                "access_token":token,
                "token_type":"Bearer",
                "user": user.to_dict()
            }
        }
    
    def create_account(self,data):
        username = data.get("username")
        password = data.get("password")
        full_name = data.get("full_name")
        email = data.get("email", "")
        phone = data.get("phone", "")
        role = data.get("role", "OWNER")
        status = data.get("status", "ACTIVE")

        if not username or not password or not full_name:
            return {
                "success": False,
                "message": "Username, password và full_name là bắt buộc"
            }

        if self.__repository.get_by_username(username):
            return {
                "success": False,
                "message": "Username đã tồn tại"
            }
        
        account = Account(
            username=username,
            full_name=full_name,
            email=email,
            phone=phone,
            role=role,
            status=status
        )

        account.set_password(password)
        account.save()

        return {
            "success": True,
            "message": "Tạo tài khoản thành công",
            "data": account.to_dict()
        }
    
    def update_account(self, id, data):
        account = self.__repository.get_by_id(id)

        if not account:
            return {
                "success": False,
                "message": "Không tìm thấy tài khoản"
            }

        for field in ["full_name", "email", "phone", "role", "status"]:
            if field in data:
                setattr(account, field, data[field])

        if "password" in data and data["password"]:
            account.set_password(data["password"])

        account.save()

        return {
            "success": True,
            "data": account.to_dict()
        }

    def get_profile(self, user):
        return user.to_dict()