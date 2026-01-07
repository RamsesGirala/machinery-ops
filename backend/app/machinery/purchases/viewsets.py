from __future__ import annotations

from django.utils.dateparse import parse_date
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from machinery.shared.pagination import DefaultPagination
from machinery.models import PurchasedUnit
from .services import UnitLifecycleService
from .serializers import (
    PurchasedUnitListSerializer,
    PurchasedUnitDetailSerializer,
    UnitMarkRentedSerializer,
    UnitFinishRentalSerializer,
    UnitMarkSoldSerializer,
)


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
        machine_nombre = params.get("machine_nombre") or params.get("machine_name")
        if machine_nombre:
            qs = qs.filter(machine_base__nombre__icontains=machine_nombre)
            
        estado = params.get("estado")
        if estado:
            qs = qs.filter(estado=estado)

        fecha_desde = params.get("fecha_desde")
        if fecha_desde:
            d = parse_date(fecha_desde)
            if d:
                qs = qs.filter(purchase__fecha_compra__gte=d)

        fecha_hasta = params.get("fecha_hasta")
        if fecha_hasta:
            d = parse_date(fecha_hasta)
            if d:
                qs = qs.filter(purchase__fecha_compra__lte=d)

        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PurchasedUnitDetailSerializer
        return PurchasedUnitListSerializer

    @action(detail=True, methods=["post"], url_path="mark-rented")
    def mark_rented(self, request, pk=None):
        ser = UnitMarkRentedSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        UnitLifecycleService.mark_rented(
            unit_id=int(pk),
            cliente_id=ser.validated_data["cliente_id"],
            rental_tipo=ser.validated_data["rental_tipo"],
            rental_inicio=ser.validated_data["rental_inicio"],
            rental_fin_estimado=ser.validated_data["rental_fin_estimado"],
            monto_unitario=ser.validated_data["monto_unitario"],
            metodo_pago=ser.validated_data["metodo_pago"],
            pago_unico=ser.validated_data.get("pago_unico", False),
            payments=ser.validated_data.get("payments"),
            notas=ser.validated_data.get("notas", ""),
        )
        obj = self.get_queryset().get(pk=int(pk))
        return Response(PurchasedUnitDetailSerializer(obj).data)

    @action(detail=True, methods=["post"], url_path="finish-rental")
    def finish_rental(self, request, pk=None):
        ser = UnitFinishRentalSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        UnitLifecycleService.finish_rental(
            unit_id=int(pk),
            rental_fin_real=ser.validated_data["rental_fin_real"],
        )
        obj = self.get_queryset().get(pk=int(pk))
        return Response(PurchasedUnitDetailSerializer(obj).data)

    @action(detail=True, methods=["post"], url_path="mark-sold")
    def mark_sold(self, request, pk=None):
        ser = UnitMarkSoldSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        UnitLifecycleService.mark_sold(
            unit_id=int(pk),
            cliente_id=ser.validated_data["cliente_id"],
            fecha_operacion=ser.validated_data["fecha_operacion"],
            monto_total_final=ser.validated_data["monto_total_final"],
            metodo_pago=ser.validated_data["metodo_pago"],
            payments=ser.validated_data.get("payments"),
            cheques_cuotas=ser.validated_data.get("cheques_cuotas", 1),
            notas=ser.validated_data.get("notas", ""),
        )

        obj = self.get_queryset().get(pk=int(pk))
        return Response(PurchasedUnitDetailSerializer(obj).data)
