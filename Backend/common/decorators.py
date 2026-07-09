from functools import wraps
from common.api_response import ApiResponse
from common.jwt_service import JWTService
from accounts.models import Account

# decorate la ham boc ham , de xu li truoc hoac sau khi goi 1 ham khac

def jwt_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return ApiResponse.error("Bạn chưa đăng nhập hoặc thiếu Bearer token", 401)

        token = auth_header.replace("Bearer ", "", 1).strip()
        result = JWTService.verify_token(token)

        if not result["valid"]:
            return ApiResponse.error(result["message"], 401)

        user_id = result["payload"].get("user_id")
        user = Account.objects.filter(id=user_id, status="ACTIVE").first()

        if not user:
            return ApiResponse.error("Tài khoản không tồn tại hoặc đã bị khóa", 401)

        request.current_user = user

        return view_func(request, *args, **kwargs)

    return wrapper


def role_required(roles):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = getattr(request, "current_user", None)

            if not user:
                return ApiResponse.error("Bạn chưa đăng nhập", 401)

            if user.role not in roles:
                return ApiResponse.error("Bạn không có quyền truy cập chức năng này", 403)

            return view_func(request, *args, **kwargs)

        return wrapper

    return decorator