class DataAnalysisAgent:
    """
    Agent số 1: chọn công cụ phân tích và trả dữ liệu có cấu trúc.
    Agent này không tự viết câu tư vấn.
    """

    def __init__(self, data_mining_service):
        self.data_mining_service = data_mining_service

    def execute(self, route):
        intent = route["intent"]
        entities = route.get("entities", {})

        if intent == "forecasting":
            forecast_days = entities.get("days") or 7
            result = self.data_mining_service.run_forecasting(
                {
                    "history_days": 180,
                    "forecast_days": forecast_days,
                },
                persist=False,
            )
            return self._unwrap(result, "forecasting")

        if intent == "apriori":
            result = self.data_mining_service.run_apriori(
                {
                    "min_support": 0.02,
                    "min_confidence": 0.30,
                    "min_lift": 1.0,
                    "limit": 20,
                },
                persist=False,
            )
            analysis = self._unwrap(result, "apriori")
            return self._filter_rules_by_product(
                analysis,
                entities.get("product_name"),
            )

        if intent == "business_overview":
            result = self.data_mining_service.get_dashboard({
                "history_days": 90,
                "forecast_days": 7,
                "apriori_limit": 10,
            })
            return self._unwrap(result, "business_overview")

        if intent == "capabilities":
            return {
                "success": True,
                "tool": "capabilities",
                "data": {},
                "error": None,
            }

        return {
            "success": True,
            "tool": "general",
            "data": {},
            "error": None,
        }

    @staticmethod
    def _unwrap(result, tool_name):
        if not result["success"]:
            return {
                "success": False,
                "tool": tool_name,
                "data": {},
                "error": result["message"],
            }

        return {
            "success": True,
            "tool": tool_name,
            "data": result["data"],
            "error": None,
        }

    @staticmethod
    def _filter_rules_by_product(analysis, product_name):
        if not analysis["success"] or not product_name:
            return analysis

        keyword = product_name.casefold()
        rules = analysis["data"].get("rules", [])

        filtered = [
            rule
            for rule in rules
            if any(
                keyword in item.casefold()
                for item in (
                    rule.get("antecedents", [])
                    + rule.get("consequents", [])
                )
            )
        ]

        analysis["data"] = {
            **analysis["data"],
            "rules": filtered,
            "product_filter": product_name,
        }
        return analysis
