import logging
import traceback
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from dashboard.repository import (
    DashBoardRepository,
)

from .algorithms.apriori import AprioriAnalyzer
from .algorithms.forecating import (
    RevenueForecastAnalyzer,
)
from .models import MiningRun
from .repository import (
    MiningRunRepository,
    SalesDataRepository,
)
from .serializers import (
    AprioriRequestSerializer,
    ForecastRequestSerializer,
    MiningRunSerializer,
)

logger = logging.getLogger(__name__)


class DataMiningService:
    def __init__(self):
        # Tái sử dụng Repository của Dashboard.
        self.dashboard_repository = (
            DashBoardRepository()
        )

        # Chỉ dùng cho Apriori và top sản phẩm.
        self.sales_repository = (
            SalesDataRepository()
        )

        self.mining_run_repository = (
            MiningRunRepository()
        )

        self.apriori_analyzer = (
            AprioriAnalyzer()
        )

        self.forecast_analyzer = (
            RevenueForecastAnalyzer()
        )

    def run_apriori(
            self,
            data,
            user=None
    ):
        try:
            print("hai oham")
            serializer = AprioriRequestSerializer(
                data=data
            )
            if not serializer.is_valid():
                return {
                    "success":False,
                    "message":(
                        "Dữ liệu Apriori không hợp lệ"
                    ),
                    "data":serializer.errors,
                }
            
            validated_data = serializer.validated_data

            transactions = (
                self.sales_repository
                .get_order_transaction(
                    start_date = validated_data.get("start_date"),
                    end_date = validated_data.get("end_date")
                )
            )
            print("transactions",transactions)

            result = (
                self.apriori_analyzer
                .analyze(
                    rows=transactions,
                    min_support=validated_data[
                        "min_support"
                    ],
                    min_confidence=validated_data[
                        "min_confidence"
                    ],
                    min_lift=validated_data[
                        "min_lift"
                    ],
                    max_len=validated_data[
                        "max_len"
                    ],
                    limit=validated_data[
                        "limit"
                    ],
                )
            )

            self.mining_run_repository.create(
                run_type=(
                    MiningRun.RunType.APRIORI
                ),
                parameters=self._json_safe(
                    validated_data
                ),
                result=result,
                user=user,
            )

            return {
                "success": True,
                "message": (
                    "Phân tích Apriori thành công"
                ),
                "data": result,
            }
                          
            
        except Exception as error:
            return self._handle_error(
                error=error,
                log_message=(
                    "Lỗi khi phân tích Apriori"
                ),
                response_message=(
                    "không thể phân tích Apriori"
                ),
            )
    # def run_apriori(
    #     self,
    #     data,
    #     user=None,
    # ):
    #     try:
    #         serializer = AprioriRequestSerializer(
    #             data=data
    #         )

    #         if not serializer.is_valid():
    #             return {
    #                 "success": False,
    #                 "message": (
    #                     "Dữ liệu Apriori không hợp lệ"
    #                 ),
    #                 "data": serializer.errors,
    #             }

    #         validated_data = (
    #             serializer.validated_data
    #         )

    #         transactions = (
    #             self.sales_repository
    #             .get_order_transactions(
    #                 start_date=validated_data.get(
    #                     "start_date"
    #                 ),
    #                 end_date=validated_data.get(
    #                     "end_date"
    #                 ),
    #             )
    #         )

    #         result = (
    #             self.apriori_analyzer
    #             .analyze(
    #                 rows=transactions,
    #                 min_support=validated_data[
    #                     "min_support"
    #                 ],
    #                 min_confidence=validated_data[
    #                     "min_confidence"
    #                 ],
    #                 min_lift=validated_data[
    #                     "min_lift"
    #                 ],
    #                 max_len=validated_data[
    #                     "max_len"
    #                 ],
    #                 limit=validated_data[
    #                     "limit"
    #                 ],
    #             )
    #         )

    #         self.mining_run_repository.create(
    #             run_type=(
    #                 MiningRun.RunType.APRIORI
    #             ),
    #             parameters=self._json_safe(
    #                 validated_data
    #             ),
    #             result=result,
    #             user=user,
    #         )

    #         return {
    #             "success": True,
    #             "message": (
    #                 "Phân tích Apriori thành công"
    #             ),
    #             "data": result,
    #         }

    #     except Exception as error:
    #         return self._handle_error(
    #             error=error,
    #             log_message=(
    #                 "Lỗi khi phân tích Apriori"
    #             ),
    #             response_message=(
    #                 "Không thể phân tích Apriori"
    #             ),
    #         )

    def run_forecasting(
        self,
        data,
        user=None,
    ):
        try:
            serializer = (
                ForecastRequestSerializer(
                    data=data
                )
            )

            if not serializer.is_valid():
                return {
                    "success": False,
                    "message": (
                        "Dữ liệu Forecasting "
                        "không hợp lệ"
                    ),
                    "data": serializer.errors,
                }

            validated_data = (
                serializer.validated_data
            )

            history_days = validated_data[
                "history_days"
            ]

            forecast_days = validated_data[
                "forecast_days"
            ]

            end_date = timezone.localdate()

            start_date = (
                end_date
                - timedelta(
                    days=history_days - 1
                )
            )

            daily_revenue = (
                self.dashboard_repository
                .get_daily_revenue(
                    start_date=start_date,
                    end_date=end_date,
                )
            )

            result = (
                self.forecast_analyzer
                .forecast(
                    rows=daily_revenue,
                    forecast_days=forecast_days,
                )
            )

            result["period"] = {
                "start_date": (
                    start_date.isoformat()
                ),
                "end_date": (
                    end_date.isoformat()
                ),
                "history_days": history_days,
                "forecast_days": forecast_days,
            }

            self.mining_run_repository.create(
                run_type=(
                    MiningRun
                    .RunType
                    .FORECASTING
                ),
                parameters={
                    "history_days": history_days,
                    "forecast_days": (
                        forecast_days
                    ),
                    "start_date": (
                        start_date.isoformat()
                    ),
                    "end_date": (
                        end_date.isoformat()
                    ),
                },
                result=result,
                user=user,
            )

            return {
                "success": True,
                "message": (
                    "Dự báo doanh thu thành công"
                ),
                "data": result,
            }

        except Exception as error:
            return self._handle_error(
                error=error,
                log_message=(
                    "Lỗi khi dự báo doanh thu"
                ),
                response_message=(
                    "Không thể dự báo doanh thu"
                ),
            )

    def get_business_overview(
        self,
        history_days=90,
        top_product_limit=10,
    ):
        try:
            end_date = timezone.localdate()

            start_date = (
                end_date
                - timedelta(
                    days=history_days - 1
                )
            )

            summary = (
                self.dashboard_repository
                .get_revenue_summary(
                    start_date=start_date,
                    end_date=end_date,
                )
            )

            chart_data = (
                self.dashboard_repository
                .get_daily_revenue(
                    start_date=start_date,
                    end_date=end_date,
                )
            )

            top_products = (
                self.sales_repository
                .get_top_products(
                    start_date=start_date,
                    end_date=end_date,
                    limit=top_product_limit,
                )
            )

            total_revenue = float(
                summary.get(
                    "total_revenue"
                )
                or 0
            )

            total_orders = int(
                summary.get(
                    "total_orders"
                )
                or 0
            )

            average_order_value = 0

            if total_orders > 0:
                average_order_value = (
                    total_revenue
                    / total_orders
                )

            return {
                "success": True,
                "message": (
                    "Lấy tổng quan kinh doanh "
                    "thành công"
                ),
                "data": {
                    "period": {
                        "start_date": (
                            start_date
                            .isoformat()
                        ),
                        "end_date": (
                            end_date
                            .isoformat()
                        ),
                    },
                    "total_revenue": (
                        total_revenue
                    ),
                    "total_cost": float(
                        summary.get(
                            "total_cost"
                        )
                        or 0
                    ),
                    "total_profit": float(
                        summary.get(
                            "total_profit"
                        )
                        or 0
                    ),
                    "total_orders": (
                        total_orders
                    ),
                    "average_order_value": (
                        round(
                            average_order_value,
                            2,
                        )
                    ),
                    "chart_data": chart_data,
                    "top_products": (
                        top_products
                    ),
                },
            }

        except Exception as error:
            return self._handle_error(
                error=error,
                log_message=(
                    "Lỗi khi lấy tổng quan "
                    "kinh doanh"
                ),
                response_message=(
                    "Không thể lấy tổng quan "
                    "kinh doanh"
                ),
            )

    def get_mining_runs(
        self,
        run_type=None,
        limit=20,
    ):
        try:
            limit = int(limit)
            limit = max(1, min(limit, 100))

            if (
                run_type
                and run_type
                not in MiningRun.RunType.values
            ):
                return {
                    "success": False,
                    "message": (
                        "run_type không hợp lệ"
                    ),
                    "data": None,
                }

            runs = (
                self.mining_run_repository
                .get_all(
                    run_type=run_type,
                    limit=limit,
                )
            )

            serializer = MiningRunSerializer(
                runs,
                many=True,
            )

            return {
                "success": True,
                "message": (
                    "Lấy lịch sử Data Mining "
                    "thành công"
                ),
                "data": serializer.data,
            }

        except Exception as error:
            return self._handle_error(
                error=error,
                log_message=(
                    "Lỗi khi lấy lịch sử Data Mining"
                ),
                response_message=(
                    "Không thể lấy lịch sử "
                    "Data Mining"
                ),
            )

    @staticmethod
    def _json_safe(data):
        result = {}

        for key, value in data.items():
            if hasattr(value, "isoformat"):
                result[key] = value.isoformat()
            else:
                result[key] = value

        return result

    @staticmethod
    def _handle_error(
        error,
        log_message,
        response_message,
    ):
        logger.exception(log_message)

        error_data = {
            "error": str(error)
        }

        if settings.DEBUG:
            error_data["traceback"] = (
                traceback.format_exc()
            )

        return {
            "success": False,
            "message": response_message,
            "data": error_data,
        }