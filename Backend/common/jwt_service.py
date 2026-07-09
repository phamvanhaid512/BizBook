import jwt
from datetime import datetime, timedelta
from django.conf import settings

class JWTService:
    @staticmethod
    def generate_token(user):
        payload = {
            "user_id":user.id,
            "username":user.username,
                        "role": user.role,
            "exp": datetime.utcnow() + timedelta(
                minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
            ),
            "iat": datetime.utcnow()
        }
        token = jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )

        return token
    
    @staticmethod
    def verify_token(token):
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )

            return {
                "valid": True,
                "payload": payload
            }

        except jwt.ExpiredSignatureError:
            return {
                "valid": False,
                "message": "Token đã hết hạn"
            }

        except jwt.InvalidTokenError:
            return {
                "valid": False,
                "message": "Token không hợp lệ"
            }