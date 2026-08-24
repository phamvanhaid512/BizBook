class BusinessAdvisorAgent:
    """
    Agent số 2: nhận kết quả từ DataAnalysisAgent và chuyển thành
    câu trả lời cho người quản lý.
    """

    def respond(self, route, analysis):
        if not analysis["success"]:
            return {
                "reply": (
                    "Tôi chưa thể phân tích dữ liệu lúc này. "
                    f"Chi tiết: {analysis['error']}"
                ),
                "suggested_questions": self._default_questions(),
                "presentation": {},
            }

        intent = route["intent"]

        if intent == "forecasting":
            return self._forecasting_response(analysis["data"])

        if intent == "apriori":
            return self._apriori_response(analysis["data"])

        if intent == "business_overview":
            return self._overview_response(analysis["data"])

        if intent == "capabilities":
            return {
                "reply": (
                    "Tôi có thể dự báo doanh thu, phân tích xu hướng, "
                    "tìm sản phẩm thường được mua cùng nhau, đề xuất combo "
                    "và tóm tắt tình hình kinh doanh."
                ),
                "suggested_questions": self._default_questions(),
                "presentation": {
                    "type": "capabilities",
                    "items": [
                        "Dự báo doanh thu 7–90 ngày",
                        "Tìm sản phẩm mua kèm bằng Apriori",
                        "Tóm tắt KPI kinh doanh",
                        "Đề xuất hành động dựa trên dữ liệu",
                    ],
                },
            }

        return {
            "reply": (
                "Tôi chưa xác định được yêu cầu. Bạn có thể hỏi: "
                "“Dự báo doanh thu 7 ngày tới”, "
                "“Sản phẩm nào nên bán kèm?” hoặc "
                "“Tóm tắt tình hình kinh doanh”."
            ),
            "suggested_questions": self._default_questions(),
            "presentation": {},
        }

    def _forecasting_response(self, data):
        forecast = data.get("forecast", [])
        trend = data.get("trend", "unknown")
        metrics = data.get("metrics", {})
        warning = data.get("warning")

        if not forecast:
            return {
                "reply": (
                    "Chưa có đủ dữ liệu doanh thu để tạo dự báo."
                ),
                "suggested_questions": self._default_questions(),
                "presentation": {
                    "type": "forecasting",
                    "forecast": [],
                },
            }

        total = sum(
            item["predicted_revenue"]
            for item in forecast
        )
        average = total / len(forecast)

        trend_text = {
            "increasing": "tăng",
            "decreasing": "giảm",
            "stable": "ổn định",
            "unknown": "chưa xác định",
        }.get(trend, trend)

        if trend == "increasing":
            action = (
                "Nên chuẩn bị tồn kho cho sản phẩm bán chạy và "
                "tăng quảng cáo ở nhóm có tỷ lệ chuyển đổi tốt."
            )
        elif trend == "decreasing":
            action = (
                "Nên kiểm tra sản phẩm bán chậm, thử combo hoặc "
                "khuyến mãi có kiểm soát để kích cầu."
            )
        else:
            action = (
                "Nên duy trì kế hoạch hiện tại và theo dõi thêm "
                "dữ liệu thực tế từng ngày."
            )

        metric_text = ""
        if metrics.get("mae") is not None:
            metric_text = (
                f" Sai số MAE trên tập kiểm thử là "
                f"{self._money(metrics['mae'])}."
            )

        warning_text = f" Lưu ý: {warning}" if warning else ""

        return {
            "reply": (
                f"Doanh thu dự báo trong {len(forecast)} ngày là "
                f"{self._money(total)}, trung bình "
                f"{self._money(average)} mỗi ngày. "
                f"Xu hướng được đánh giá là {trend_text}. "
                f"{action}{metric_text}{warning_text}"
            ),
            "suggested_questions": [
                "Tóm tắt tình hình kinh doanh",
                "Sản phẩm nào nên bán kèm?",
                "Dự báo doanh thu 30 ngày tới",
            ],
            "presentation": {
                "type": "forecasting",
                "trend": trend,
                "total_predicted_revenue": round(total, 2),
                "average_predicted_revenue": round(average, 2),
                "forecast": forecast,
                "metrics": metrics,
            },
        }

    def _apriori_response(self, data):
        rules = data.get("rules", [])
        warning = data.get("warning")
        product_filter = data.get("product_filter")

        if not rules:
            filter_text = (
                f" cho sản phẩm “{product_filter}”"
                if product_filter
                else ""
            )
            return {
                "reply": (
                    f"Chưa tìm thấy quy luật mua kèm{filter_text}. "
                    f"{warning or 'Hãy thử giảm ngưỡng support hoặc tăng dữ liệu.'}"
                ),
                "suggested_questions": [
                    "Sản phẩm nào nên bán kèm?",
                    "Dự báo doanh thu 7 ngày tới",
                ],
                "presentation": {
                    "type": "apriori",
                    "rules": [],
                },
            }

        top_rules = rules[:5]
        lines = []

        for index, rule in enumerate(top_rules, start=1):
            left = ", ".join(rule["antecedents"])
            right = ", ".join(rule["consequents"])
            lines.append(
                f"{index}. Khách mua {left} nên được gợi ý thêm "
                f"{right} (confidence {rule['confidence'] * 100:.1f}%, "
                f"lift {rule['lift']:.2f})."
            )

        return {
            "reply": (
                "Các gợi ý bán kèm nổi bật:\n"
                + "\n".join(lines)
                + "\nBạn có thể dùng các cặp này để tạo combo, "
                  "gợi ý trong giỏ hàng hoặc chạy khuyến mãi chéo."
            ),
            "suggested_questions": [
                "Dự báo doanh thu 7 ngày tới",
                "Tóm tắt tình hình kinh doanh",
            ],
            "presentation": {
                "type": "apriori",
                "rules": top_rules,
                "transaction_count": data.get("transaction_count", 0),
            },
        }

    def _overview_response(self, data):
        kpis = data.get("kpis", {})
        top_products = data.get("top_products", [])
        forecasting = data.get("forecasting", {})
        apriori = data.get("apriori", {})

        top_name = (
            top_products[0]["product_name"]
            if top_products
            else "chưa xác định"
        )

        forecast = forecasting.get("forecast", [])
        forecast_total = sum(
            item["predicted_revenue"]
            for item in forecast
        )

        return {
            "reply": (
                f"Trong kỳ phân tích, doanh thu đạt "
                f"{self._money(kpis.get('total_revenue', 0))} từ "
                f"{kpis.get('total_orders', 0)} đơn hàng. "
                f"Giá trị đơn trung bình là "
                f"{self._money(kpis.get('average_order_value', 0))}. "
                f"Sản phẩm bán nhiều nhất là {top_name}. "
                f"Doanh thu dự báo 7 ngày tới khoảng "
                f"{self._money(forecast_total)}. "
                f"Hệ thống tìm thấy {len(apriori.get('rules', []))} "
                "quy luật mua kèm đáng chú ý."
            ),
            "suggested_questions": self._default_questions(),
            "presentation": {
                "type": "business_overview",
                "kpis": kpis,
                "top_products": top_products[:5],
                "forecasting": forecasting,
                "apriori_rules": apriori.get("rules", [])[:5],
            },
        }

    @staticmethod
    def _money(value):
        return f"{float(value):,.0f} ₫".replace(",", ".")

    @staticmethod
    def _default_questions():
        return [
            "Dự báo doanh thu 7 ngày tới",
            "Sản phẩm nào nên bán kèm?",
            "Tóm tắt tình hình kinh doanh",
        ]
