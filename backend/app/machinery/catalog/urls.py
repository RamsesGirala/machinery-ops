from __future__ import annotations

from rest_framework.routers import DefaultRouter

from .seed_viewset import CatalogSeedViewSet
from .viewsets import (
    MachineBaseViewSet,
    AccessoryViewSet,
    TaxViewSet,
    LogisticsLegViewSet,
)

router = DefaultRouter()
router.register(r"machines", MachineBaseViewSet, basename="catalog-machines")
router.register(r"accessories", AccessoryViewSet, basename="catalog-accessories")
router.register(r"taxes", TaxViewSet, basename="catalog-taxes")
router.register(r"logistics-legs", LogisticsLegViewSet, basename="catalog-logistics-legs")
router.register(r"seed", CatalogSeedViewSet, basename="catalog-seed")

urlpatterns = router.urls
