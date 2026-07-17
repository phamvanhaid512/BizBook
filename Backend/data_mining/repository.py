from common.base_repository import BaseRepository
from .models import MiningRun

from django.db.models import Count, F, Sum

from orders.models import OrderDetail


class SalesDataRepository:
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
    

class MiningRunRepository:
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
