from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .seed import apply_seed, clear_catalog, apply_demo_seed, clear_demo_data


class CatalogSeedViewSet(viewsets.ViewSet):
    """
    POST /api/catalog/seed/apply/  -> borra y recrea seed
    POST /api/catalog/seed/clear/  -> borra catálogo
    """
    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"], url_path="apply")
    def apply(self, request):
        res = apply_seed(clear_first=True)
        demo = apply_demo_seed(months_back=6, clear_first=True)

        return Response(
            {
                "ok": True,
                "message": "Seed aplicado (catálogo + demo).",
                "counts": {
                    "machines": res.machines,
                    "accessories": res.accessories,
                    "taxes": res.taxes,
                    "logistics_legs": res.logistics_legs,
                    "budgets": demo.budgets,
                    "purchases": demo.purchases,
                    "units": demo.units,
                    "revenue_events": demo.revenue_events,
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="clear")
    def clear(self, request):
        clear_demo_data()
        clear_catalog()
        return Response({"ok": True, "message": "Demo + catálogo borrados."}, status=status.HTTP_200_OK)

