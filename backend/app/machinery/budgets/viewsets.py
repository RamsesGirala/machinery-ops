from __future__ import annotations

from decimal import Decimal

from django.http import HttpResponse
from rest_framework import mixins, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from machinery.shared.pagination import DefaultPagination
from .pdf import build_budget_pdf_bytes

from .serializers import BudgetCreateSerializer, BudgetListSerializer, BudgetDetailSerializer
from .services import BudgetService
from .repositories import BudgetRepository

from machinery.purchases.services import PurchaseService
from ..models import Budget


class BudgetViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    pagination_class = DefaultPagination

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.service = BudgetService(repo=BudgetRepository())
        self.purchase_service = PurchaseService()

    def get_queryset(self):
        qs = self.service.list_qs().select_related("compra").order_by("-fecha", "-created_at")

        # filtros
        params = self.request.query_params

        fecha_desde = params.get("fecha_desde")
        fecha_hasta = params.get("fecha_hasta")
        estado = params.get("estado")
        cliente_id = params.get("cliente_id") or params.get("client_id")
        numero = params.get("numero")

        if fecha_desde:
            qs = qs.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha__lte=fecha_hasta)

        if estado:
            qs = qs.filter(estado=estado)

        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)

        if numero:
            qs = qs.filter(numero__icontains=numero)

        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return BudgetCreateSerializer
        if self.action == "retrieve":
            return BudgetDetailSerializer
        return BudgetListSerializer

    def create(self, request, *args, **kwargs):
        ser = BudgetCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        budget = self.service.create_from_payload(ser.validated_data)
        out = BudgetDetailSerializer(instance=budget).data
        return Response(out, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        budget_id = int(kwargs["pk"])
        ser = BudgetCreateSerializer(data=request.data)  # mismo payload que create
        ser.is_valid(raise_exception=True)

        budget = self.service.update_from_payload(
            budget_id=budget_id,
            payload=ser.validated_data,
        )
        out = BudgetDetailSerializer(instance=budget).data
        return Response(out, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        self.service.delete(int(kwargs["pk"]))
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="purchase")
    def purchase(self, request, pk=None):
        """
        Marcar presupuesto como comprado (sin endpoint de cierre):
        - requiere DRAFT
        - el service lo cierra y luego crea la compra + stock
        """
        budget_id = int(pk)
        fecha_compra = request.data.get("fecha_compra")  # opcional "YYYY-MM-DD"
        notas = request.data.get("notas", "")

        purchase = self.service.purchase_from_draft(
            budget_id=budget_id,
            fecha_compra=fecha_compra,
            notas=notas,
            purchase_service=self.purchase_service,
        )
        return Response({"ok": True, "purchase_id": purchase.id}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        """Exportar presupuesto a PDF (pensado para enviar al cliente)."""
        budget_id = int(pk)

        # Aceptamos ambos nombres por comodidad: ?rentabilidad=10 o ?rentabilidad_pct=10
        rp = request.query_params.get("rentabilidad")
        if rp is None:
            rp = request.query_params.get("rentabilidad_pct")

        try:
            rentabilidad_pct = Decimal(str(rp)) if rp not in (None, "") else Decimal("0")
        except Exception:
            rentabilidad_pct = Decimal("0")

        # carga con relaciones necesarias para armar el PDF
        budget = Budget.objects.select_related("cliente").prefetch_related(
            "items__machine_base",
            "items__accesorios__accessory",
            "impuestos__tax",
        ).get(pk=budget_id)

        pdf_bytes = build_budget_pdf_bytes(budget=budget, rentabilidad_pct=rentabilidad_pct)
        filename = f"presupuesto-{budget.numero}.pdf"

        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp
