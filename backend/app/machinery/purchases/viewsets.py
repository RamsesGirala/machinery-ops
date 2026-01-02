from __future__ import annotations

from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from machinery.shared.pagination import DefaultPagination
from machinery.models import PurchasedUnit
from .services import UnitLifecycleService
from .serializers import PurchasedUnitListSerializer, PurchasedUnitDetailSerializer, UnitMarkRentedSerializer, \
    UnitFinishRentalSerializer, UnitMarkSoldSerializer


class PurchasedUnitViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    pagination_class = DefaultPagination

    def get_queryset(self):
        qs = (
            PurchasedUnit.objects.select_related("purchase", "purchase__budget", "machine_base")
            .all()
            .order_by("-purchase__fecha_compra", "-created_at")
        )

        params = self.request.query_params
        estado = params.get("estado")
        fecha_desde = params.get("fecha_desde")
        fecha_hasta = params.get("fecha_hasta")

        if estado:
            qs = qs.filter(estado=estado)

        if fecha_desde:
            qs = qs.filter(purchase__fecha_compra__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(purchase__fecha_compra__lte=fecha_hasta)

        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PurchasedUnitDetailSerializer
        if self.action == "mark_rented":
            return UnitMarkRentedSerializer
        if self.action == "finish_rental":
            return UnitFinishRentalSerializer
        if self.action == "mark_sold":
            return UnitMarkSoldSerializer
        return PurchasedUnitListSerializer

    @action(detail=True, methods=["post"], url_path="mark-rented")
    def mark_rented(self, request, pk=None):
        ser = UnitMarkRentedSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        UnitLifecycleService.mark_rented(
            unit_id=int(pk),
            fecha_inicio=ser.validated_data["fecha_inicio"],
            fecha_retorno_estimada=ser.validated_data["fecha_retorno_estimada"],
            monto_total=ser.validated_data["monto_total"],
            cliente_texto=ser.validated_data.get("cliente_texto", ""),
            notas=ser.validated_data.get("notas", ""),
        )
        # devolvemos el detalle actualizado
        obj = self.get_queryset().get(pk=int(pk))
        return Response(PurchasedUnitDetailSerializer(obj).data)

    @action(detail=True, methods=["post"], url_path="finish-rental")
    def finish_rental(self, request, pk=None):
        ser = UnitFinishRentalSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        UnitLifecycleService.finish_rental(
            unit_id=int(pk),
            fecha_retorno_real=ser.validated_data["fecha_retorno_real"],
        )
        obj = self.get_queryset().get(pk=int(pk))
        return Response(PurchasedUnitDetailSerializer(obj).data)

    @action(detail=True, methods=["post"], url_path="mark-sold")
    def mark_sold(self, request, pk=None):
        ser = UnitMarkSoldSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        UnitLifecycleService.mark_sold(
            unit_id=int(pk),
            fecha_venta=ser.validated_data["fecha_venta"],
            monto_total=ser.validated_data["monto_total"],
            cliente_texto=ser.validated_data.get("cliente_texto", ""),
            notas=ser.validated_data.get("notas", ""),
        )
        obj = self.get_queryset().get(pk=int(pk))
        return Response(PurchasedUnitDetailSerializer(obj).data)

