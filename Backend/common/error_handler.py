import traceback
from django.conf import settings
from common.api_response import ApiResponse
from common.exceptions import AppException


class ErrorHandler:
    @staticmethod
    def handle(error, api_name=None, extra_data=None, *args, **kwargs):
        print("\n================ API ERROR ================")
        if api_name:
            print(f"API: {api_name}")
        print("Error type:", type(error).__name__)
        print("Error message:", str(error))
        if extra_data:
            print("Extra data:", extra_data)
        print("Traceback:")
        traceback.print_exc()
        print("==========================================\n")

        if isinstance(error, AppException):
            return ApiResponse.error(
                message=error.message,
                status=error.status_code,
                data=error.data
            )

        error_data = None
        if settings.DEBUG:
            error_data = {
                "error_type": type(error).__name__,
                "error": str(error),
                "extra_data": extra_data,
                "traceback": traceback.format_exc()
            }

        return ApiResponse.error(
            message="Lỗi hệ thống",
            status=500,
            data=error_data
        )


def handle_api_exception(error, *args, **kwargs):
    return ErrorHandler.handle(error, *args, **kwargs)