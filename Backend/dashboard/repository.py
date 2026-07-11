from decimal import Decimal

from django.db.models import Sum, Count, F, DecimalField, ExpressionWrapper
from django.db.models.functions import Coalesce, TruncDate, TruncMonth

from common.base_repository import BaseRepository
from orders.models import Order,OrderDetail


class DashBoardRepository(BaseRepository):
    def __init__(self):
        super().__init__(Order)

    def get_completed_orders_by_range(self, start_date, end_date):
        """
        Lấy danh sách đơn hàng đã hoàn thành trong khoảng ngày.
        """

        return self.get_model().objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            status="COMPLETED"
        )

    def get_daily_revenue(self, start_date, end_date):
        """
        Gom doanh thu theo từng ngày.
        Dùng cho filter=day hoặc filter=month.
        """

        orders = self.get_completed_orders_by_range(
            start_date=start_date,
            end_date=end_date
        )

        return list(
            orders
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(
                revenue=Sum("total_amount"),
                order_count=Count("id")
            )
            .order_by("date")
        )

    def get_monthly_revenue(self, year):
        """
        Gom doanh thu theo từng tháng trong năm.
        Dùng cho filter=year.
        """

        orders = self.get_model().objects.filter(
            created_at__year=year,
            status="COMPLETED"
        )

        return list(
            orders
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(
                revenue=Sum("total_amount"),
                order_count=Count("id")
            )
            .order_by("month")
        )
    def get_revenue_summary(self,start_date,end_date):
        orders = self.get_completed_orders_by_range(
            start_date=start_date,
            end_date=end_date
        )
        result = orders.aggregate(
            total_revenue = Coalesce(Sum("total_amount"),Decimal("0")),
            total_orders = Coalesce(Count("id"),0),
            total_cost=Coalesce(
                Sum(
                    ExpressionWrapper(
                        F("details__quantity") * F("details__product__cost_price"),
                        output_field=DecimalField(
                            max_digits=18,
                            decimal_places=2
                        )
                    )
                ),
                Decimal("0")
            )

        )
        total_revenue = result.get("total_revenue") or Decimal("0")
        total_cost = result.get("total_cost") or Decimal("0")
        total_orders = result.get("total_orders") or 0
        total_profit = total_revenue - total_cost

        return {
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "total_cost": total_cost,
            "total_profit": total_profit
        }