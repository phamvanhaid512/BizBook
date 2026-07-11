from django.db import models
from django.utils import timezone

class Categories(models.Model):
    category_name = models.CharField(max_length=200)
    description = models.CharField(max_length=500)
    created_at = models.DateTimeField(
    default=timezone.now
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )
    class Meta:
        db_table = "categories"

    def __str__(self):
        return self.category_name
    
    def to_dict(self):
        return {
            "id":self.id,
            "category_name":self.category_name,
            "description":self.description
        }
# Create your models here.
