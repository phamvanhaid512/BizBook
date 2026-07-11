class AppException(Exception):
    def __init__(
        self,
        message="Có lỗi xảy ra",
        status_code=400,
        data=None
    ):
        self.message = message
        self.status_code = status_code
        self.data = data

        super().__init__(message)


class ValidationException(AppException):
    def __init__(self, message="Dữ liệu không hợp lệ", data=None):
        super().__init__(
            message=message,
            status_code=400,
            data=data
        )


class UnauthorizedException(AppException):
    def __init__(self, message="Bạn chưa đăng nhập", data=None):
        super().__init__(
            message=message,
            status_code=401,
            data=data
        )


class ForbiddenException(AppException):
    def __init__(self, message="Bạn không có quyền truy cập", data=None):
        super().__init__(
            message=message,
            status_code=403,
            data=data
        )


class NotFoundException(AppException):
    def __init__(self, message="Không tìm thấy dữ liệu", data=None):
        super().__init__(
            message=message,
            status_code=404,
            data=data
        )