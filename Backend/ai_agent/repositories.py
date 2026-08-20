from common.base_repository import BaseRepository
from datetime import timedelta

from django.utils import timezone

from data_mining.models import MiningRun

# Nếu file Data Mining của bạn tên repository.py
# thì đổi repositories thành repository.
from data_mining.repository import SalesDataRepository
from .models import (
    AIConversation,
    AIMessage,
    OCRDocument,
)


class AIAgentRepository(BaseRepository):
    def __init__(self):
        super().__init__(AIConversation)
        self.__sales_data_repository = (
        SalesDataRepository()
        )
    

    # ==========================================
    # AI CONVERSATION
    # ==========================================

    def get_revenue_comparison(self):
            """
            So sánh:
            - 7 ngày gần nhất
            - 7 ngày trước đó
            """

            today = timezone.localdate()

            current_end_date = today

            current_start_date = today - timedelta(
                days=6
            )

            previous_end_date = current_start_date - timedelta(
                days=1
            )

            previous_start_date = previous_end_date - timedelta(
                days=6
            )

            current_week_data = list(
                self.__sales_data_repository.get_daily_revenue(
                    start_date=current_start_date,
                    end_date=current_end_date,
                )
            )

            previous_week_data = list(
                self.__sales_data_repository.get_daily_revenue(
                    start_date=previous_start_date,
                    end_date=previous_end_date,
                )
            )

            return {
                "current_period": {
                    "start_date": current_start_date,
                    "end_date": current_end_date,
                    "daily_data": current_week_data,
                },
                "previous_period": {
                    "start_date": previous_start_date,
                    "end_date": previous_end_date,
                    "daily_data": previous_week_data,
                },
            }

    def get_latest_apriori_run(self):
        return (
            MiningRun.objects
            .filter(
                run_type=MiningRun.RunType.APRIORI
            )
            .order_by("-created_at")
            .first()
        )

    def get_latest_forecasting_run(self):
        return (
            MiningRun.objects
            .filter(
                run_type=MiningRun.RunType.FORECASTING
            )
            .order_by("-created_at")
            .first()
        )