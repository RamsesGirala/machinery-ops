from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .seed import apply_seed, clear_catalog


class CatalogSeedViewSet(viewsets.ViewSet):
    """
    POST /api/catalog/seed/apply/  -> borra y recrea seed
    POST /api/catalog/seed/clear/  -> borra catálogo
    """
    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"], url_path="apply")
    def apply(self, request):
        res = apply_seed(clear_first=True)
        return Response(
            {
                "ok": True,
                "message": "Seed aplicado.",
                "counts": {
                    "machines": res.machines,
                    "accessories": res.accessories,
                    "taxes": res.taxes,
                    "logistics_legs": res.logistics_legs,
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="clear")
    def clear(self, request):
        clear_catalog()
        return Response(
            {"ok": True, "message": "Catálogo borrado."},
            status=status.HTTP_200_OK,
        )
