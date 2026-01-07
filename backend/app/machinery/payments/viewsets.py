from __future__ import annotations

from django.utils.dateparse import parse_date
from django.db import transaction
from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from machinery.models import RevenuePayment
from machinery.shared.pagination import DefaultPagination
from .serializers import RevenuePaymentListSerializer, MarkPaidSerializer


class RevenuePaymentViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    pagination_class = DefaultPagination
    serializer_class = RevenuePaymentListSerializer

    def get_queryset(self):
        qs = (
            RevenuePayment.objects.select_related("revenue_event", "revenue_event__cliente")
            .all()
            .order_by("fecha_prevista", "id")
        )

        p = self.request.query_params

        cobrado = p.get("cobrado")
        if cobrado is not None and cobrado != "":
            qs = qs.filter(cobrado=(cobrado.lower() == "true"))

        cliente_id = p.get("cliente_id")
        if cliente_id:
            qs = qs.filter(revenue_event__cliente_id=int(cliente_id))

        metodo_pago = p.get("metodo_pago")
        if metodo_pago:
            qs = qs.filter(metodo_pago=metodo_pago)

        tipo = p.get("tipo")
        if tipo:
            qs = qs.filter(revenue_event__tipo=tipo)

        fd = p.get("fecha_desde")
        if fd:
            d = parse_date(fd)
            if d:
                qs = qs.filter(fecha_prevista__gte=d)

        fh = p.get("fecha_hasta")
        if fh:
            d = parse_date(fh)
            if d:
                qs = qs.filter(fecha_prevista__lte=d)

        return qs

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        ser = MarkPaidSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        with transaction.atomic():
            obj = self.get_queryset().select_for_update().get(pk=int(pk))
            if not obj.cobrado:
                obj.cobrado = True
                obj.fecha_cobro_real = ser.validated_data.get("fecha_cobro_real") or timezone.now().date()
                obj.save(update_fields=["cobrado", "fecha_cobro_real", "updated_at"])

        return Response(RevenuePaymentListSerializer(obj).data)