from decimal import Decimal

from django.db.models.fields import DecimalField
from django.db.models.functions import Coalesce, TruncDate

from common.base_repository import BaseRepository
from .models import MiningRun

from django.db.models import Count, F, Sum, Value

from orders.models import Order, OrderDetail


class SalesDataRepository:

    def get_order_completed(self,start_date,end_date):
        queryset = (
            Order.objects
            .filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date,
                status="COMPLETED",
            )
            .order_by("created_at")
    )

        print(
            "🚀 ~ SalesDataRepository "
            "~ get_order_completed ~ queryset:",
            queryset,
        )

        return queryset
    def get_order_transaction(
            self,
            start_date=None,
            end_date=None,
    ):
        queryset = OrderDetail.objects.filter(
            order__status="COMPLETED",  
            quantity__gt=0
        )

        if start_date:
            queryset = queryset.filter(
                order__created_at__date__gte=start_date
            )
        
        if end_date:
            queryset = queryset.filter(
                order__created_at__date__lte=end_date
            )

        return list(
            queryset
            .values(
                "order_id",
                "product_id",
                product_name=F(
                    "product__product_name"
                ),
            )
            .order_by("order_id")
        )


    def get_daily_revenue(self,start_date,end_date):
        orders = self.get_order_completed(
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
                    Value(Decimal("0")),
                    output_field=DecimalField(
                        max_digits=18,
                        decimal_places=2,
                    ),
                ),
                order_count=Count("id"),
            )
            .order_by("date")
        )        
        

# class SalesDataRepository:
#     def get_order_transactions(
#         self,
#         start_date=None,
#         end_date=None,
#     ):
#         """
#         Lấy sản phẩm thuộc từng đơn hàng.
#         Dùng để chạy Apriori.
#         """

#         queryset = OrderDetail.objects.filter(
#             order__status="COMPLETED",
#             quantity__gt=0,
#         )

#         if start_date:
#             queryset = queryset.filter(
#                 order__created_at__date__gte=start_date
#             )

#         if end_date:
#             queryset = queryset.filter(
#                 order__created_at__date__lte=end_date
#             )

#         return list(
#             queryset
#             .values(
#                 order_id=F("order_id"),
#                 product_id=F("product_id"),
#                 product_name=F(
#                     "product__product_name"
#                 ),
#             )
#             .order_by("order_id")
#         )

#     def get_top_products(
#         self,
#         start_date=None,
#         end_date=None,
#         limit=10,
#     ):
#         """
#         Lấy sản phẩm bán chạy cho AI-Agent.
#         """

#         queryset = OrderDetail.objects.filter(
#             order__status="COMPLETED",
#             quantity__gt=0,
#         )

#         if start_date:
#             queryset = queryset.filter(
#                 order__created_at__date__gte=start_date
#             )

#         if end_date:
#             queryset = queryset.filter(
#                 order__created_at__date__lte=end_date
#             )

#         rows = (
#             queryset
#             .values(
#                 product_id=F("product_id"),
#                 product_name=F(
#                     "product__product_name"
#                 ),
#             )
#             .annotate(
#                 quantity_sold=Sum("quantity"),
#                 order_count=Count(
#                     "order_id",
#                     distinct=True,
#                 ),
#             )
#             .order_by("-quantity_sold")[:limit]
#         )

#         return [
#             {
#                 "product_id": row["product_id"],
#                 "product_name": row["product_name"],
#                 "quantity_sold": int(
#                     row["quantity_sold"] or 0
#                 ),
#                 "order_count": int(
#                     row["order_count"] or 0
#                 ),
#             }
#             for row in rows
#         ]
    

class MiningRunRepository(BaseRepository):
    def __init__(self):
        super().__init__(MiningRun)
    def get_latest_run_by_type(self,run_type):
        return (
            self.get_model()
            .objects
            .filter(run_type=run_type)
            .order_by("-created_at")
            .first()
        )
    def create(
        self,
        run_type,
        parameters,
        result,
        user=None,
    ):
        if not getattr(
            user,
            "is_authenticated",
            False,
        ):
            user = None

        return MiningRun.objects.create(
            run_type=run_type,
            parameters=parameters,
            result=result,
            created_by=user,
        )

    def get_all(
        self,
        run_type=None,
      limit=20,
    ):
        queryset = MiningRun.objects.all()

        if run_type:
            queryset = queryset.filter(
                run_type=run_type
            )

        return queryset[:limit]
