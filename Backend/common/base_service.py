from abc import ABC, abstractmethod

class AbstractService(ABC):

    @abstractmethod
    def get_all(self):
        pass

    @abstractmethod
    def get_by_id(self):
        pass 
    
    @abstractmethod
    def create(self):
        pass

    @abstractmethod
    def update(self):
        pass 

    @abstractmethod
    def delete(self):
        pass

class BaseService:
    def __init__(self, repository, serializer_class):
        self._repository = repository
        self._serializer_class = serializer_class

    def get_all(self, params=None):
        objects = self._repository.get_all(params)

        data = self._serializer_class(
            objects,
            many=True
        ).data

        return {
            "success": True,
            "message": "Lấy danh sách thành công",
            "data": data
        }

    def get_by_id(self, id):
        obj = self._repository.get_by_id(id)

        if not obj:
            return {
                "success": False,
                "message": "Không tìm thấy dữ liệu",
                "data": None
            }

        return {
            "success": True,
            "message": "Lấy chi tiết thành công",
            "data": self._serializer_class(obj).data
        }

    def create(self, data):
        serializer = self._serializer_class(data=data)

        if serializer.is_valid():
            obj = self._repository.create(serializer.validated_data)

            return {
                "success": True,
                "message": "Tạo dữ liệu thành công",
                "data": self._serializer_class(obj).data
            }

        return {
            "success": False,
            "message": "Dữ liệu không hợp lệ",
            "data": serializer.errors
        }

    def update(self, id, data):
        obj = self._repository.get_by_id(id)

        if not obj:
            return {
                "success": False,
                "message": "Không tìm thấy dữ liệu",
                "data": None
            }

        serializer = self._serializer_class(obj, data=data, partial=True)

        if serializer.is_valid():
            obj = self._repository.update(obj, serializer.validated_data)

            return {
                "success": True,
                "message": "Cập nhật dữ liệu thành công",
                "data": self._serializer_class(obj).data
            }

        return {
            "success": False,
            "message": "Dữ liệu không hợp lệ",
            "data": serializer.errors
        }

    def delete(self, id):
        obj = self._repository.get_by_id(id)

        if not obj:
            return {
                "success": False,
                "message": "Không tìm thấy dữ liệu",
                "data": None
            }

        self._repository.delete(id)

        return {
            "success": True,
            "message": "Xóa dữ liệu thành công",
            "data": None
        }