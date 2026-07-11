import logging
import traceback
from calendar import monthrange
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_date

from common.base_service import BaseService

from .repository import DashBoardRepository
from .serializers import DashboardSummarySerializer


logger = logging.getLogger(__name__)


class DashBoardService(BaseService):
    def __init__(self):
        super().__init__(
            DashBoardRepository(),
            DashboardSummarySerializer
        )

    def get_day_range(self, date_value):
        selected_date = parse_date(date_value)

        if not selected_date:
            raise ValueError(
                "Ngày không hợp lệ. Định dạng đúng là YYYY-MM-DD"
            )

        return selected_date, selected_date

    def get_month_range(self, month, year):
        try:
            month = int(month)
            year = int(year)

        except (TypeError, ValueError):
            raise ValueError(
                "Tháng và năm phải là số"
            )

        if month < 1 or month > 12:
            raise ValueError(
                "Tháng phải nằm trong khoảng từ 1 đến 12"
            )

        last_day = monthrange(year, month)[1]

        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        return start_date, end_date

    def get_year_range(self, year):
        try:
            year = int(year)

        except (TypeError, ValueError):
            raise ValueError(
                "Năm phải là số"
            )

        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)

        return start_date, end_date

    def get_dashboard_summary(
        self,
        filter_type="day",
        date_value=None,
        month=None,
        year=None
    ):
        try:
            today = timezone.localdate()

            if filter_type == "day":
                if not date_value:
                    date_value = today.strftime("%Y-%m-%d")

                start_date, end_date = self.get_day_range(
                    date_value
                )

                chart_data = self._repository.get_daily_revenue(
                    start_date=start_date,
                    end_date=end_date
                )

            elif filter_type == "month":
                if not month:
                    month = today.month

                if not year:
                    year = today.year

                start_date, end_date = self.get_month_range(
                    month=month,
                    year=year
                )

                chart_data = self._repository.get_daily_revenue(
                    start_date=start_date,
                    end_date=end_date
                )

            elif filter_type == "year":
                if not year:
                    year = today.year

                start_date, end_date = self.get_year_range(
                    year=year
                )

                chart_data = self._repository.get_monthly_revenue(
                    year=int(year)
                )

            else:
                return {
                    "success": False,
                    "message": "filter chỉ nhận day, month hoặc year",
                    "data": None
                }

            summary = self._repository.get_revenue_summary(
                start_date=start_date,
                end_date=end_date
            )

            total_revenue = Decimal(str(summary["total_revenue"]))
            total_cost = Decimal(str(summary["total_cost"]))
            total_profit = Decimal(str(summary["total_profit"]))
            total_orders = summary["total_orders"]

            average_order_value = Decimal("0")

            if total_orders > 0:
                average_order_value = (
                    total_revenue / Decimal(total_orders)
                )

            data = {
                "filter": filter_type,
                "start_date": start_date,
                "end_date": end_date,
                "total_revenue": total_revenue,
                "total_cost": total_cost,
                "total_profit": total_profit,
                "total_orders": total_orders,
                "average_order_value": round(
                    average_order_value,
                    2
                ),
                "chart_data": chart_data
            }

            serializer = self._serializer_class(
                instance=data
            )

            return {
                "success": True,
                "message": "Lấy dữ liệu Dashboard thành công",
                "data": serializer.data
            }

        except ValueError as error:
            logger.warning(
                "Lỗi dữ liệu đầu vào Dashboard: %s",
                error
            )

            return {
                "success": False,
                "message": str(error),
                "data": None
            }

        except Exception as error:
            logger.exception(
                "Lỗi khi lấy dữ liệu Dashboard"
            )

            error_data = {
                "error": str(error)
            }

            if settings.DEBUG:
                error_data["traceback"] = traceback.format_exc()

            return {
                "success": False,
                "message": "Không thể lấy dữ liệu Dashboard",
                "data": error_data
            }