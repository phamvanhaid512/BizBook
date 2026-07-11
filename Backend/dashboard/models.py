from django.db import models

from accounts.models import Account

# Create your models here.
class Dashboard(models.Model):
    expense_name = models.CharField(max_length=200)
    expense_type = models.CharField(max_length=500)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    expentse_date = models.DateTimeField(
        auto_now_add=True
    )
    note = models.CharField(max_length=200)
    created_by = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_dashboard"
    )
    create_at = models.DateTimeField(
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        auto_now=True
    )


    class Meta:
        db_table = "dashboard"
    
    def __str__(self):
        return self.expense_name
    
    def to_dict(self):
        return {
            "id":self.id,
            "expenses":self.expense_name,
            "expense_type":self.expense_type,
            "expentse_date":self.expentse_date,
            "note":self.note,
            "created_by":self.created_by,
            "created_at":self.create_at,
        }