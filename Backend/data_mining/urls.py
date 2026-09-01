from django.urls import path
from . import controllers

urlpatterns = [
    path("data-mining/apriori/run/",controllers.run_apriori),
    path("data-mining/apriori/get_highlights/",controllers.get_highlights),
    path("data-mining/forecasting/run/",controllers.run_forecasting),
    path("dashboard/", controllers.get_dashboard_view),
    path("data-mining/runs/",controllers.get_mining_runs),
]