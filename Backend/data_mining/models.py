from django.db import models
from accounts.models import Account

class MiningRun(models.Model):
    class RunType(models.TextChoices):
        APRIORI = "APRIORI", "Apriori"
        FORECASTING = "FORECASTING", "Forecasting"

    run_type = models.CharField(
        max_length=20,
        choices=RunType.choices,
        db_index=True,
    )
    parameters = models.JSONField(default=dict)
    result = models.JSONField(default=dict)

    created_by = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="data_mining_runs"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "data_mining_runs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.run_type} - {self.created_at:%Y-%m-%d %H:%M:%S}"
# Create your models here.
