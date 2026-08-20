class AIIntentDetector:
    class Intent:
        GENERAL = "GENERAL"
        REVENUE = "REVENUE"
        APRIORI = "APRIORI"
        FORECASTING = "FORECASTING"

    def detect(
        self,
        message,
    ):
        normalized_message = message.lower()

        if any(
            keyword in normalized_message
            for keyword in [
                "doanh thu",
                "bán hàng",
                "xu hướng",
                "lợi nhuận",
                "đơn hàng",
            ]
        ):
            return self.Intent.REVENUE

        if any(
            keyword in normalized_message
            for keyword in [
                "bán kèm",
                "mua kèm",
                "mua cùng",
                "apriori",
                "combo",
            ]
        ):
            return self.Intent.APRIORI

        if any(
            keyword in normalized_message
            for keyword in [
                "dự báo",
                "forecast",
                "tuần tới",
                "tháng tới",
                "sắp tới",
            ]
        ):
            return self.Intent.FORECASTING

        return self.Intent.GENERAL