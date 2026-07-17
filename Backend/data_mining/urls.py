from django.urls import path
from . import controllers

urlpatterns = [
    path("apriori/run/",controllers.run_apriori),
    # path("forecasting/run/",views.run_forecasting,name="run_forecasting"),
    # path("dashboard/",views.get_data_mining_dashboard,name="dashboard",),
    # path("runs/",views.get_mining_runs,name="runs",),
]