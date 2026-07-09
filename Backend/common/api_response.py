from django.http import JsonResponse


class ApiResponse:
    @staticmethod
    def success(data=None, message="Thành công", status_code=200):
        return JsonResponse({
            "success": True,
            "message": message,
            "data": data
        }, status=status_code)

    @staticmethod  
    def error(message="Thất bại", status_code=400, data=None):
        return JsonResponse({
            "success": False,
            "message": message,
            "data": data
        }, status=status_code)