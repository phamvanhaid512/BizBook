from .intent_detector import AIIntentDetector


class AIBusinessContextBuilder:
    def __init__(
        self,
        business_data_repository,
    ):
        self.__business_data_repository = (
            business_data_repository
        )

    def build(
        self,
        intent,
    ):
        if intent == AIIntentDetector.Intent.REVENUE:
            return self.__build_revenue_context()

        if intent == AIIntentDetector.Intent.APRIORI:
            return self.__build_apriori_context()

        if intent == AIIntentDetector.Intent.FORECASTING:
            return self.__build_forecasting_context()

        return {
            "intent": AIIntentDetector.Intent.GENERAL,
            "message": (
                "Không có dữ liệu hệ thống cụ thể "
                "cho câu hỏi này."
            ),
        }

    def __build_revenue_context(self):
        report = (
            self.__business_data_repository
            .get_revenue_comparison()
        )

        current_period = report["current_period"]

        previous_period = report["previous_period"]

        current_revenue = self.__calculate_revenue(
            current_period["daily_data"]
        )

        previous_revenue = self.__calculate_revenue(
            previous_period["daily_data"]
        )

        current_order_count = self.__calculate_order_count(
            current_period["daily_data"]
        )

        previous_order_count = self.__calculate_order_count(
            previous_period["daily_data"]
        )

        revenue_change_percent = None

        if previous_revenue > 0:
            revenue_change_percent = round(
                (
                    (current_revenue - previous_revenue)
                    / previous_revenue
                )
                * 100,
                2,
            )

        return {
            "intent": AIIntentDetector.Intent.REVENUE,
            "current_period": {
                "start_date": current_period[
                    "start_date"
                ],
                "end_date": current_period[
                    "end_date"
                ],
                "revenue": current_revenue,
                "order_count": current_order_count,
                "daily_data": current_period[
                    "daily_data"
                ],
            },
            "previous_period": {
                "start_date": previous_period[
                    "start_date"
                ],
                "end_date": previous_period[
                    "end_date"
                ],
                "revenue": previous_revenue,
                "order_count": previous_order_count,
                "daily_data": previous_period[
                    "daily_data"
                ],
            },
            "revenue_change_percent": revenue_change_percent,
        }

    def __build_apriori_context(self):
        mining_run = (
            self.__business_data_repository
            .get_latest_apriori_run()
        )

        if not mining_run:
            return {
                "intent": AIIntentDetector.Intent.APRIORI,
                "has_data": False,
                "message": (
                    "Chưa có kết quả Apriori. "
                    "Người dùng cần chạy phân tích "
                    "sản phẩm mua kèm trước."
                ),
            }

        result = mining_run.result or {}

        return {
            "intent": AIIntentDetector.Intent.APRIORI,
            "has_data": True,
            "analyzed_at": mining_run.created_at,
            "transaction_count": result.get(
                "transaction_count",
                0,
            ),
            "product_count": result.get(
                "product_count",
                0,
            ),
            "rules": result.get(
                "rules",
                [],
            )[:5],
        }

    def __build_forecasting_context(self):
        mining_run = (
            self.__business_data_repository
            .get_latest_forecasting_run()
        )

        if not mining_run:
            return {
                "intent": AIIntentDetector.Intent.FORECASTING,
                "has_data": False,
                "message": (
                    "Chưa có kết quả Forecasting. "
                    "Người dùng cần chạy dự báo "
                    "doanh thu trước."
                ),
            }

        result = mining_run.result or {}

        return {
            "intent": AIIntentDetector.Intent.FORECASTING,
            "has_data": True,
            "analyzed_at": mining_run.created_at,
            "model": result.get("model"),
            "history": result.get(
                "history",
                [],
            )[-7:],
            "forecast": result.get(
                "forecast",
                [],
            )[:7],
        }

    def __calculate_revenue(
        self,
        daily_data,
    ):
        return sum(
            float(item.get("revenue", 0))
            for item in daily_data
        )

    def __calculate_order_count(
        self,
        daily_data,
    ):
        return sum(
            int(item.get("order_count", 0))
            for item in daily_data
        )