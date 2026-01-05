from rest_framework.routers import DefaultRouter
from .viewsets import RevenuePaymentViewSet

router = DefaultRouter()
router.register(r"payments", RevenuePaymentViewSet, basename="payments")

urlpatterns = router.urls
