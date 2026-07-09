from django.urls import path
from . import controllers

urlpatterns = [
    path("auth/login/", controllers.login),
    path("auth/profile/", controllers.profile),

    path("accounts/", controllers.get_accounts),
    path("accounts/create/", controllers.create_account),
    path("accounts/<int:id>/update/", controllers.update_account),
    path("accounts/<int:id>/delete/", controllers.delete_account),
]