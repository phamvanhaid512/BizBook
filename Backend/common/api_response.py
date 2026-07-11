from django.http import JsonResponse


class ApiResponse:
    @staticmethod
    def success(data=None, message="Thành công", status=200):
        return JsonResponse(
            {
                "success": True,
                "message": message,
                "data": data
            },
            status=status,
            safe=False
        )

    @staticmethod
    def error(message="Có lỗi xảy ra", status=400, data=None):
        return JsonResponse(
            {
                "success": False,
                "message": message,
                "data": data
            },
            status=status,
            safe=False
        )