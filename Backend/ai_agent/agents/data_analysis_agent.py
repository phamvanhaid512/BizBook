import calendar
from datetime import date, datetime
from decimal import Decimal
from django.db.models import Avg, Count, DecimalField, F, FloatField, Sum
from django.db.models.functions import Cast, Coalesce
from expenses.models import Expenses
from orders.models import Order, OrderDetail
from products.models import Product


class DataAnalysisAgent:
    def __init__(self, data_mining_service=None):
        self.dm_service = data_mining_service

    def execute(self, route: dict) -> dict:
        intent = route.get("intent")
        entities = route.get("entities", {})
        date_range = entities.get("date_range", [None, None])
        start_date = date_range[0] if len(date_range) > 0 else None
        end_date = date_range[1] if len(date_range) > 1 else None

        if intent == "PROFIT_QUERY":
            return self._analyze_profit(start_date, end_date)
        elif intent == "REVENUE_QUERY":
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
                "data": (
                    getattr(self.dm_service, "get_latest_apriori_rules", lambda: [])()
                    if self.dm_service
                    else []
                ),
            }
        elif intent == "CUSTOMER_CLUSTERING":
            return {
                "tool": "kmeans",
                "data": (
                    getattr(self.dm_service, "get_customer_segments", lambda: {})()
                    if self.dm_service
                    else {}
                ),
            }
        elif intent == "REVENUE_FORECAST":
            return {
                "tool": "forecast",
                "data": (
                    getattr(self.dm_service, "get_revenue_forecast", lambda: {})()
                    if self.dm_service
                    else {}
                ),
            }
        # --- 10 Intent mới ---
        elif intent == "ORDER_COUNT_QUERY":
            return self._analyze_order_count(start_date, end_date)
        elif intent == "AOV_QUERY":
            return self._analyze_aov(start_date, end_date)
        elif intent == "PEAK_HOURS_QUERY":
            return self._analyze_peak_hours(start_date, end_date)
        elif intent == "INVENTORY_QUERY":
            return self._analyze_inventory()
        elif intent == "PAYMENT_METHOD_QUERY":
            return self._analyze_payment_methods(start_date, end_date)
        elif intent == "CANCELLED_ORDERS_QUERY":
            return self._analyze_cancelled_orders(start_date, end_date)
        elif intent == "GROWTH_COMPARISON":
            return self._analyze_growth_comparison(start_date, end_date)
        elif intent == "PROFIT_MARGIN_QUERY":
            return self._analyze_profit(start_date, end_date)
        elif intent == "PROMOTION_SUGGESTION":
            return self._analyze_promotion_suggestion()
        elif intent == "SUMMARY_REPORT":
            return self._analyze_summary_report(start_date, end_date)
        return {"tool": "none", "data": None}

    def _analyze_profit(self, start, end):
        orders_qs = Order.objects.filter(status="COMPLETED")
        order_details_qs = OrderDetail.objects.filter(order__status="COMPLETED")
        expenses_qs = Expenses.objects.filter(status="CONFIRMED")

        # Chuẩn hóa start và end về string định dạng YYYY-MM-DD
        if start and end:
            start_str = start.strftime("%Y-%m-%d") if hasattr(start, "strftime") else str(start)[:10]
            end_str = end.strftime("%Y-%m-%d") if hasattr(end, "strftime") else str(end)[:10]

            orders_qs = orders_qs.filter(created_at__date__gte=start_str, created_at__date__lte=end_str)
            order_details_qs = order_details_qs.filter(
                order__created_at__date__gte=start_str, order__created_at__date__lte=end_str
            )
            # Kiểm tra trường ngày của Expenses (expense_date hoặc created_at)
            expense_fields = [f.name for f in Expenses._meta.get_fields()]
            if "expense_date" in expense_fields:
                expenses_qs = expenses_qs.filter(expense_date__gte=start_str, expense_date__lte=end_str)
            elif "created_at" in expense_fields:
                expenses_qs = expenses_qs.filter(created_at__date__gte=start_str, created_at__date__lte=end_str)

        # 1. Doanh thu & Số lượng đơn hàng
        order_stats = orders_qs.aggregate(
            total_rev=Coalesce(Sum("total_amount"), Decimal("0.0")),
            total_orders=Count("id"),
            avg_order=Coalesce(Avg("total_amount"), Decimal("0.0")),
        )
        total_revenue = float(order_stats["total_rev"] or 0.0)
        total_orders = int(order_stats["total_orders"] or 0)
        avg_order_val = float(order_stats["avg_order"] or 0.0)

        # 2. Tính Tổng giá vốn (COGS) tự động thích ứng với tên cột thực tế
        detail_fields = [f.name for f in OrderDetail._meta.get_fields()]
        product_fields = [f.name for f in Product._meta.get_fields()]

        cogs_expression = None
        # TH 1: Giá vốn lưu trực tiếp trong OrderDetail
        if "cost_price" in detail_fields:
            cogs_expression = F("quantity") * Coalesce(F("cost_price"), Decimal("0.0"))
        # TH 2: Giá vốn lưu trong bảng Product
        elif "cost_price" in product_fields:
            cogs_expression = F("quantity") * Coalesce(F("product__cost_price"), Decimal("0.0"))
        elif "import_price" in product_fields:
            cogs_expression = F("quantity") * Coalesce(F("product__import_price"), Decimal("0.0"))
        else:
            # Fallback nếu chưa cấu hình giá vốn: ước tính giá vốn = 60% giá bán
            price_field = "price" if "price" in detail_fields else ("unit_price" if "unit_price" in detail_fields else None)
            if price_field:
                cogs_expression = F("quantity") * F(price_field) * Decimal("0.6")

        if cogs_expression is not None:
            cogs_result = order_details_qs.aggregate(
                total_cogs=Coalesce(Sum(cogs_expression, output_field=FloatField()), 0.0)
            )
            total_cogs = float(cogs_result["total_cogs"] or 0.0)
        else:
            total_cogs = 0.0

        # 3. Tổng chi phí vận hành (Expenses)
        expense_agg = expenses_qs.aggregate(
            total_exp=Coalesce(Sum("amount"), Decimal("0.0"))
        )
        total_expense = float(expense_agg["total_exp"] or 0.0)

        # 4. Lợi nhuận & Biên lợi nhuận
        total_cost = total_cogs + total_expense
        profit = total_revenue - total_cost
        profit_margin = (
            round((profit / total_revenue) * 100, 2) if total_revenue > 0 else 0.0
        )

        return {
            "tool": "profit_summary",
            "data": {
                "revenue": round(total_revenue, 2),
                "cogs": round(total_cogs, 2),
                "expense": round(total_expense, 2),
                "profit": round(profit, 2),
                "profit_margin": profit_margin,
                "orders": total_orders,
                "avg_order": round(avg_order_val, 2),
                "start": str(start) if start else "",
                "end": str(end) if end else "",
            },
        }
    def _analyze_revenue(self, start, end):
        qs = Order.objects.filter(status="COMPLETED")
        if start and end:
            qs = qs.filter(created_at__date__range=(start, end))

        res = qs.aggregate(
            total_rev=Sum("total_amount"),
            total_orders=Count("id"),
            avg_val=Avg("total_amount"),
        )
        return {
            "tool": "revenue_summary",
            "data": {
                "revenue": float(res["total_rev"] or 0.0),
                "orders": int(res["total_orders"] or 0),
                "avg_order": float(res["avg_val"] or 0.0),
                "start": str(start),
                "end": str(end),
            },
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

        categories = [
            {
                "category__name": c.get("category__name"),
                "total_cat": float(c.get("total_cat") or 0.0),
            }
            for c in raw_cats
        ]

        return {
            "tool": "expense_summary",
            "data": {
                "total_expense": float(total),
                "categories": categories,
                "start": str(start),
                "end": str(end),
            },
        }

    def _analyze_top_products(self, start, end, ascending=False):
        order_dir = "total_qty" if ascending else "-total_qty"
        qs = OrderDetail.objects.filter(order__status="COMPLETED")
        if start and end:
            qs = qs.filter(order__created_at__date__range=(start, end))

        top_items = (
            qs.values("product__product_name")
            .annotate(total_qty=Sum("quantity"), total_sales=Sum("total_price"))
            .order_by(order_dir)[:5]
        )

        cleaned_items = []
        for item in top_items:
            cleaned_items.append(
                {
                    "product__product_name": item.get("product__product_name")
                    or "Sản phẩm",
                    "total_qty": int(item.get("total_qty") or 0),
                    "total_sales": float(item.get("total_sales") or 0.0),
                }
            )

        return {"tool": "product_ranking", "data": cleaned_items}

    def _get_apriori_rules(self):
        """Lấy luật kết hợp Apriori từ DataMiningService"""
        rules = []
        if self.dm_service and hasattr(self.dm_service, "get_latest_apriori_rules"):
            raw_rules = self.dm_service.get_latest_apriori_rules(limit=5)
            for r in raw_rules:
                rules.append(
                    {
                        "antecedents": str(r.get("antecedents", "")),
                        "consequents": str(r.get("consequents", "")),
                        "support": float(r.get("support", 0.0) or 0.0),
                        "confidence": float(r.get("confidence", 0.0) or 0.0),
                        "lift": float(r.get("lift", 0.0) or 0.0),
                    }
                )
        return {"tool": "apriori", "data": rules}

    def _get_revenue_forecast(self):
        """Lấy kết quả dự báo chuỗi thời gian từ DataMiningService"""
        forecast_data = {}
        if self.dm_service and hasattr(self.dm_service, "get_revenue_forecast"):
            raw_forecast = self.dm_service.get_revenue_forecast(
                forecast_days=3, history_days=30
            )
            if isinstance(raw_forecast, dict):
                forecast_data = raw_forecast
        return {"tool": "forecast", "data": forecast_data}
    def _analyze_order_count(self, start, end):
        qs = Order.objects.filter(status="COMPLETED")
        if start and end:
            qs = qs.filter(created_at__date__gte=str(start)[:10], created_at__date__lte=str(end)[:10])
        total_orders = qs.count()
        return {"tool": "order_count", "data": {"orders": total_orders, "start": str(start), "end": str(end)}}

    # 2. Giá trị đơn trung bình (AOV)
    def _analyze_aov(self, start, end):
        qs = Order.objects.filter(status="COMPLETED")
        if start and end:
            qs = qs.filter(created_at__date__gte=str(start)[:10], created_at__date__lte=str(end)[:10])
        res = qs.aggregate(
            avg_val=Coalesce(Avg("total_amount"), Decimal("0.0")),
            total_orders=Count("id")
        )
        return {
            "tool": "aov", 
            "data": {
                "aov": float(res["avg_val"] or 0), 
                "orders": int(res["total_orders"] or 0), 
                "start": str(start), 
                "end": str(end)
            }
        }

    # 3. Phân tích khung giờ cao điểm
    def _analyze_peak_hours(self, start, end):
        qs = Order.objects.filter(status="COMPLETED")
        if start and end:
            qs = qs.filter(created_at__date__gte=str(start)[:10], created_at__date__lte=str(end)[:10])
        hour_data = (
            qs.annotate(hour=F("created_at__hour"))
            .values("hour")
            .annotate(order_count=Count("id"))
            .order_by("-order_count")
        )
        top_hours = list(hour_data[:3])
        return {"tool": "peak_hours", "data": {"peak_hours": top_hours, "start": str(start), "end": str(end)}}

    # 4. Tồn kho sản phẩm
    def _analyze_inventory(self):
        fields = [f.name for f in Product._meta.get_fields()]
        qty_field = "stock" if "stock" in fields else ("quantity" if "quantity" in fields else None)
        if not qty_field:
            return {"tool": "inventory", "data": {"items": [], "low_stock": []}}

        low_stock = list(
            Product.objects.filter(**{f"{qty_field}__lte": 10})
            .values("id", "product_name" if "product_name" in fields else "name", qty_field)[:5]
        )
        return {"tool": "inventory", "data": {"low_stock": low_stock, "qty_field": qty_field}}

    # 5. Phương thức thanh toán
    def _analyze_payment_methods(self, start, end):
        qs = Order.objects.filter(status="COMPLETED")
        if start and end:
            qs = qs.filter(created_at__date__gte=str(start)[:10], created_at__date__lte=str(end)[:10])
        fields = [f.name for f in Order._meta.get_fields()]
        pay_field = "payment_method" if "payment_method" in fields else None
        if not pay_field:
            return {"tool": "payment", "data": {"methods": []}}
        methods = list(
            qs.values(pay_field)
            .annotate(total_revenue=Sum("total_amount"), order_count=Count("id"))
            .order_by("-order_count")
        )
        return {"tool": "payment", "data": {"methods": methods, "start": str(start), "end": str(end)}}

    # 6. Đơn hủy
    def _analyze_cancelled_orders(self, start, end):
        all_qs = Order.objects.all()
        if start and end:
            all_qs = all_qs.filter(created_at__date__gte=str(start)[:10], created_at__date__lte=str(end)[:10])
        total = all_qs.count()
        cancelled = all_qs.filter(status="CANCELLED").count()
        rate = round((cancelled / total * 100), 2) if total > 0 else 0.0
        return {
            "tool": "cancelled_orders",
            "data": {"total": total, "cancelled": cancelled, "rate": rate, "start": str(start), "end": str(end)}
        }

    # 7. So sánh tăng trưởng
    def _analyze_growth_comparison(self, start, end):
        today = datetime.now().date()
        cur_start = today - timedelta(days=7)
        cur_rev = Order.objects.filter(status="COMPLETED", created_at__date__gte=cur_start, created_at__date__lte=today).aggregate(s=Coalesce(Sum("total_amount"), Decimal("0.0")))["s"]
        prev_start = cur_start - timedelta(days=7)
        prev_end = cur_start - timedelta(days=1)
        prev_rev = Order.objects.filter(status="COMPLETED", created_at__date__gte=prev_start, created_at__date__lte=prev_end).aggregate(s=Coalesce(Sum("total_amount"), Decimal("0.0")))["s"]
        cur_val, prev_val = float(cur_rev), float(prev_rev)
        diff = cur_val - prev_val
        growth = round((diff / prev_val * 100), 2) if prev_val > 0 else 0.0
        return {"tool": "growth", "data": {"current": cur_val, "previous": prev_val, "diff": diff, "growth_rate": growth}}

    # 8. Gợi ý chương trình khuyến mãi
    def _analyze_promotion_suggestion(self):
        rules = getattr(self.dm_service, "get_latest_apriori_rules", lambda: [])() if self.dm_service else []
        return {"tool": "promotion_suggestion", "data": {"combos": rules[:2]}}

    # 9. Báo cáo tổng quan Dashboard
    def _analyze_summary_report(self, start, end):
        profit_data = self._analyze_profit(start, end)["data"]
        return {"tool": "summary_report", "data": profit_data}