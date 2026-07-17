from decimal import Decimal

from django.db.models import (
    Count,
    DecimalField,
    ExpressionWrapper,
    F,
    Sum,
)
from django.db.models.functions import (
    Coalesce,
    TruncDate,
    TruncMonth,
)

from common.base_repository import BaseRepository
from orders.models import Order, OrderDetail


class DashBoardRepository(BaseRepository):
    def __init__(self):
        super().__init__(Order)

    def get_completed_orders_by_range(
        self,
        start_date,
        end_date,
    ):
        """
        Lấy các đơn hàng hoàn thành trong khoảng ngày.
        """

        return self.get_model().objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            status="COMPLETED",
        )

    def get_daily_revenue(
        self,
        start_date,
        end_date,
    ):
        """
        Gom doanh thu theo từng ngày.
        Dùng cho filter=day, filter=month và Forecasting.
        """

        orders = self.get_completed_orders_by_range(
            start_date=start_date,
            end_date=end_date,
        )

        return list(
            orders
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(
                revenue=Coalesce(
                    Sum("total_amount"),
                    Decimal("0"),
                    output_field=DecimalField(
                        max_digits=18,
                        decimal_places=2,
                    ),
                ),
                order_count=Count("id"),
            )
            .order_by("date")
        )

    def get_monthly_revenue(self, year):
        """
        Gom doanh thu theo từng tháng.
        Dùng cho filter=year.
        """

        orders = self.get_model().objects.filter(
            created_at__year=year,
            status="COMPLETED",
        )

        return list(
            orders
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(
                revenue=Coalesce(
                    Sum("total_amount"),
                    Decimal("0"),
                    output_field=DecimalField(
                        max_digits=18,
                        decimal_places=2,
                    ),
                ),
                order_count=Count("id"),
            )
            .order_by("month")
        )

    def get_revenue_summary(
        self,
        start_date,
        end_date,
    ):
        """
        Tính tổng doanh thu, chi phí, lợi nhuận và số đơn.
        """

        orders = self.get_completed_orders_by_range(
            start_date=start_date,
            end_date=end_date,
        )

        order_summary = orders.aggregate(
            total_revenue=Coalesce(
                Sum("total_amount"),
                Decimal("0"),
                output_field=DecimalField(
                    max_digits=18,
                    decimal_places=2,
                ),
            ),
            total_orders=Count("id"),
        )

        cost_expression = ExpressionWrapper(
            F("quantity") * F("product__cost_price"),
            output_field=DecimalField(
                max_digits=18,
                decimal_places=2,
            ),
        )

        detail_summary = OrderDetail.objects.filter(
            order__created_at__date__gte=start_date,
            order__created_at__date__lte=end_date,
            order__status="COMPLETED",
        ).aggregate(
            total_cost=Coalesce(
                Sum(cost_expression),
                Decimal("0"),
                output_field=DecimalField(
                    max_digits=18,
                    decimal_places=2,
                ),
            )
        )

        total_revenue = (
            order_summary.get("total_revenue")
            or Decimal("0")
        )

        total_cost = (
            detail_summary.get("total_cost")
            or Decimal("0")
        )

        total_orders = (
            order_summary.get("total_orders")
            or 0
        )

        return {
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "total_cost": total_cost,
            "total_profit": total_revenue - total_cost,
        }