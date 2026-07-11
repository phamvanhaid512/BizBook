from rest_framework import serializers


class DashboardChartSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    month = serializers.DateTimeField(required=False)

    revenue = serializers.DecimalField(
        max_digits=15,
        decimal_places=2
    )

    order_count = serializers.IntegerField()


class DashboardSummarySerializer(serializers.Serializer):
    filter = serializers.CharField()

    start_date = serializers.DateField()
    end_date = serializers.DateField()

    total_revenue = serializers.DecimalField(
        max_digits=15,
        decimal_places=2
    )
    total_cost = serializers.DecimalField(
        max_digits=15,
        decimal_places=2
    )
    total_profit = serializers.DecimalField(
        max_digits=15,
        decimal_places=2
    )
    total_orders = serializers.IntegerField()

    average_order_value = serializers.DecimalField(
        max_digits=15,
        decimal_places=2
    )

    chart_data = DashboardChartSerializer(many=True)