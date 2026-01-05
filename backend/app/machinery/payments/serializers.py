from __future__ import annotations

from rest_framework import serializers
from machinery.models import RevenuePayment


class RevenuePaymentListSerializer(serializers.ModelSerializer):
    revenue_event_tipo = serializers.CharField(source="revenue_event.tipo", read_only=True)
    cliente = serializers.SerializerMethodField()

    class Meta:
        model = RevenuePayment
        fields = [
            "id",
            "revenue_event",
            "revenue_event_tipo",
            "cliente",
            "monto",
            "metodo_pago",
            "fecha_prevista",
            "cobrado",
            "fecha_cobro_real",
            "descripcion",
            "created_at",
            "updated_at",
        ]

    def get_cliente(self, obj):
        c = obj.revenue_event.cliente
        return {"id": c.id, "nombre": c.nombre}


class MarkPaidSerializer(serializers.Serializer):
    fecha_cobro_real = serializers.DateField(required=False)
