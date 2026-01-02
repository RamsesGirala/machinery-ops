from django.urls import path
from .views import finance_report

urlpatterns = [
    path("reports/finance/", finance_report),
]
