from rest_framework.routers import DefaultRouter
from .viewsets import PurchasedUnitViewSet

router = DefaultRouter()
router.register(r"units", PurchasedUnitViewSet, basename="units")

urlpatterns = router.urls
