from rest_framework import serializers

from .models import MiningRun


class AprioriRequestSerializer(
    serializers.Serializer
):
    start_date = serializers.DateField(
        required=False
    )

    end_date = serializers.DateField(
        required=False
    )

    min_support = serializers.FloatField(
        required=False,
        default=0.02,
        min_value=0.001,
        max_value=1,
    )
    min_confidence = serializers.FloatField(
        required=False,
        default=0.3,
        min_value=0.001,
        max_value=1
    )
    min_lift=serializers.FloatField(
        required=False,
        default=1,
        min_value=0
    )
    max_len=serializers.IntegerField(
        required=False,
        default=3,
        min_value=2,
        max_value=5
    )
    limit= serializers.IntegerField(
        required=False,
        default=20,
        min_value=1,
        max_value=100
    )
    def validate(self,attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if (
            start_date
            and end_date
            and start_date > end_date
        ):
            raise serializers.ValidationError({
                "end_date":(
                    "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu"
                )
            })
        return attrs

    

# class AprioriRequestSerializer(
#     serializers.Serializer
# ):
#     start_date = serializers.DateField(
#         required=False
#     )

#     end_date = serializers.DateField(
#         required=False
#     )

#     min_support = serializers.FloatField(
#         required=False,
#         default=0.02,
#         min_value=0.001,
#         max_value=1,
#     )

#     min_confidence = serializers.FloatField(
#         required=False,
#         default=0.3,
#         min_value=0.001,
#         max_value=1,
#     )

#     min_lift = serializers.FloatField(
#         required=False,
#         default=1,
#         min_value=0,
#     )

#     max_len = serializers.IntegerField(
#         required=False,
#         default=3,
#         min_value=2,
#         max_value=5,
#     )

#     limit = serializers.IntegerField(
#         required=False,
#         default=20,
#         min_value=1,
#         max_value=100,
#     )

#     def validate(self, attrs):
#         start_date = attrs.get("start_date")
#         end_date = attrs.get("end_date")

#         if (
#             start_date
#             and end_date
#             and start_date > end_date
#         ):
#             raise serializers.ValidationError({
#                 "end_date": (
#                     "Ngày kết thúc phải lớn hơn "
#                     "hoặc bằng ngày bắt đầu"
#                 )
#             })

#         return attrs


class ForecastRequestSerializer(
    serializers.Serializer
):
    history_days = serializers.IntegerField(
        required=False,
        default=180,
        min_value=14,
        max_value=1095,
    )

    forecast_days = serializers.IntegerField(
        required=False,
        default=7,
        min_value=1,
        max_value=90,
    )


class MiningRunSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = MiningRun
        fields = "__all__"