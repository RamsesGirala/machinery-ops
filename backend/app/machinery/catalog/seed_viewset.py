from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .seed import apply_seed, clear_catalog, apply_demo_seed, clear_demo_data


class CatalogSeedViewSet(viewsets.ViewSet):
    """
    POST /api/catalog/seed/apply/          -> borra y recrea catalogo + demo
    POST /api/catalog/seed/apply_catalog/  -> borra demo y recrea catalogo
    POST /api/catalog/seed/apply_demo/     -> recrea demo
    POST /api/catalog/seed/clear/          -> borra catálogo + demo
    """
    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"], url_path="applyV2")
    def apply(self, request):
        clear_demo_data()
        clear_catalog()
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
                    "pretax_charges": getattr(res, "pretax_charges", 0),
                    "clients": getattr(res, "clients", 0),
                    "logistics_legs": res.logistics_legs,
                    "budgets": demo.budgets,
                    "purchases": demo.purchases,
                    "units": demo.units,
                    "revenue_events": demo.revenue_events,
                    "revenue_payments": getattr(demo, "revenue_payments", 0),
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="apply_catalog")
    def apply_catalog(self, request):
        # IMPORTANTE: si hay demo, hay FK PROTECT hacia Client/PreTaxCharge/Tax/etc.
        clear_demo_data()
        res = apply_seed(clear_first=True)

        return Response(
            {
                "ok": True,
                "message": "Catálogo aplicado (demo borrada).",
                "counts": {
                    "machines": res.machines,
                    "accessories": res.accessories,
                    "taxes": res.taxes,
                    "pretax_charges": getattr(res, "pretax_charges", 0),
                    "clients": getattr(res, "clients", 0),
                    "logistics_legs": res.logistics_legs,
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="apply_demo")
    def apply_demo(self, request):
        demo = apply_demo_seed(months_back=6, clear_first=True)
        return Response(
            {
                "ok": True,
                "message": "Demo aplicada.",
                "counts": {
                    "budgets": demo.budgets,
                    "purchases": demo.purchases,
                    "units": demo.units,
                    "revenue_events": demo.revenue_events,
                    "revenue_payments": getattr(demo, "revenue_payments", 0),
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="clear")
    def clear(self, request):
        clear_demo_data()
        clear_catalog()
        return Response({"ok": True, "message": "Demo + catálogo borrados."}, status=status.HTTP_200_OK)


