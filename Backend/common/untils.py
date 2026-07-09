import json


class RequestData:
    @staticmethod
    def get_body(request):
        try:
            if request.body:
                return json.loads(request.body.decode("utf-8"))
            return {}
        except json.JSONDecodeError:
            return {}