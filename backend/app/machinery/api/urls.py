from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()

urlpatterns = [
    path("catalog/", include("machinery.catalog.urls")),
    path("", include("machinery.budgets.urls")),
    path("", include("machinery.purchases.urls")),
    path("", include("machinery.reports.urls")),
]
