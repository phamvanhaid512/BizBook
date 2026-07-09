from abc import ABC, abstractmethod


class AbstractRepository(ABC):

    @abstractmethod
    def get_all(self, params=None):
        pass

    @abstractmethod
    def get_by_id(self, id):
        pass

    @abstractmethod
    def create(self, data):
        pass

    @abstractmethod
    def update(self, id, data):
        pass

    @abstractmethod
    def delete(self, id):
        pass


class BaseRepository(AbstractRepository):
    def __init__(self, model):
        self.__model = model

    def get_model(self):
        return self.__model

    def get_all(self, params=None):
        queryset = self.__model.objects.all()

        # sau này muốn filter/search thì xử lý params ở đây
        return queryset

    def get_by_id(self, id):
        return self.__model.objects.filter(id=id).first()

    def create(self, data):
        return self.__model.objects.create(**data)

    def update(self, id, data):
        obj = self.get_by_id(id)

        if not obj:
            return None

        for key, value in data.items():
            setattr(obj, key, value)

        obj.save()
        return obj

    def delete(self, id):
        obj = self.get_by_id(id)

        if not obj:
            return False

        obj.delete()
        return True