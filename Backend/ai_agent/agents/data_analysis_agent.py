from django.db.models import Sum, Count, Avg
from orders.models import Order, OrderDetail
from expenses.models import Expenses


class DataAnalysisAgent:
    def __init__(self, data_mining_service=None):
        self.dm_service = data_mining_service

    def execute(self, route: dict) -> dict:
        intent = route.get("intent")
        entities = route.get("entities", {})
        date_range = entities.get("date_range", [None, None])
        start_date = date_range[0] if len(date_range) > 0 else None
        end_date = date_range[1] if len(date_range) > 1 else None

        if intent == "REVENUE_QUERY":
            return self._analyze_revenue(start_date, end_date)
        elif intent == "EXPENSE_QUERY":
            return self._analyze_expense(start_date, end_date)
        elif intent == "TOP_PRODUCTS":
            return self._analyze_top_products(start_date, end_date, ascending=False)
        elif intent == "WORST_PRODUCTS":
            return self._analyze_top_products(start_date, end_date, ascending=True)
        elif intent == "APRIORI_RULES":
            return {
                "tool": "apriori",
                "data": getattr(self.dm_service, "get_latest_apriori_rules", lambda: [])() if self.dm_service else []
            }
        elif intent == "CUSTOMER_CLUSTERING":
            return {
                "tool": "kmeans",
                "data": getattr(self.dm_service, "get_customer_segments", lambda: {})() if self.dm_service else {}
            }
        elif intent == "REVENUE_FORECAST":
            return {
                "tool": "forecast",
                "data": getattr(self.dm_service, "get_revenue_forecast", lambda: {})() if self.dm_service else {}
            }
        return {"tool": "none", "data": None}

    def _analyze_revenue(self, start, end):
        qs = Order.objects.filter(status="COMPLETED")
        if start and end:
            qs = qs.filter(created_at__date__range=(start, end))

        res = qs.aggregate(
            total_rev=Sum("total_amount"), 
            total_orders=Count("id"), 
            avg_val=Avg("total_amount")
        )
        return {
            "tool": "revenue_summary",
            "data": {
                "revenue": float(res["total_rev"] or 0.0),
                "orders": int(res["total_orders"] or 0),
                "avg_order": float(res["avg_val"] or 0.0),
                "start": str(start), 
                "end": str(end)
            }
        }

    def _analyze_expense(self, start, end):
        qs = Expenses.objects.filter(status="CONFIRMED")
        if start and end:
            qs = qs.filter(expense_date__range=(start, end))

        total = qs.aggregate(total=Sum("amount"))["total"] or 0.0
        raw_cats = list(
            qs.values("category__name")
            .annotate(total_cat=Sum("amount"))
            .order_by("-total_cat")
        )
        
        # Ép kiểu Decimal cho từng danh mục chi phí
        categories = [
            {
                "category__name": c.get("category__name"),
                "total_cat": float(c.get("total_cat") or 0.0)
            }
            for c in raw_cats
        ]

        return {
            "tool": "expense_summary",
            "data": {
                "total_expense": float(total),
                "categories": categories,
                "start": str(start),
                "end": str(end)
            }
        }

    def _analyze_top_products(self, start, end, ascending=False):
        order_dir = "total_qty" if ascending else "-total_qty"
        qs = OrderDetail.objects.filter(order__status="COMPLETED")
        if start and end:
            qs = qs.filter(order__created_at__date__range=(start, end))

        top_items = (
            qs.values("product__product_name")
            .annotate(
                total_qty=Sum("quantity"), 
                total_sales=Sum("total_price")
            )
            .order_by(order_dir)[:5]
        )

        # Chuyển đổi toàn bộ Decimal và int sang kiểu dữ liệu Python cơ bản (float, int)
        cleaned_items = []
        for item in top_items:
            cleaned_items.append({
                "product__product_name": item.get("product__product_name") or "Sản phẩm",
                "total_qty": int(item.get("total_qty") or 0),
                "total_sales": float(item.get("total_sales") or 0.0),  # <-- Ép kiểu float ở đây
            })

        return {"tool": "product_ranking", "data": cleaned_items}

    def _get_apriori_rules(self):
        """Lấy luật kết hợp Apriori từ DataMiningService"""
        rules = []
        if self.dm_service and hasattr(self.dm_service, "get_latest_apriori_rules"):
            raw_rules = self.dm_service.get_latest_apriori_rules(limit=5)
            for r in raw_rules:
                rules.append({
                    "antecedents": str(r.get("antecedents", "")),
                    "consequents": str(r.get("consequents", "")),
                    "support": float(r.get("support", 0.0) or 0.0),
                    "confidence": float(r.get("confidence", 0.0) or 0.0),
                    "lift": float(r.get("lift", 0.0) or 0.0),
                })
        return {"tool": "apriori", "data": rules}

    def _get_revenue_forecast(self):
        """Lấy kết quả dự báo chuỗi thời gian từ DataMiningService"""
        forecast_data = {}
        if self.dm_service and hasattr(self.dm_service, "get_revenue_forecast"):
            raw_forecast = self.dm_service.get_revenue_forecast(forecast_days=3, history_days=30)
            if isinstance(raw_forecast, dict):
                forecast_data = raw_forecast
        return {"tool": "forecast", "data": forecast_data}