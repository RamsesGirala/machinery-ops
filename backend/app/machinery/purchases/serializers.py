from __future__ import annotations

from rest_framework import serializers

from machinery.models import PurchasedUnit, BudgetItemAccessory, RevenueType


class PurchasedUnitAccessorySerializer(serializers.ModelSerializer):
    accessory_nombre = serializers.CharField(source="accessory.nombre", read_only=True)

    class Meta:
        model = BudgetItemAccessory
        fields = [
            "id",
            "accessory",
            "accessory_nombre",
            "cantidad",
            "accessory_total_snapshot",
            "subtotal_snapshot",
        ]


class PurchasedUnitListSerializer(serializers.ModelSerializer):
    machine_nombre = serializers.CharField(source="machine_base.nombre", read_only=True)
    fecha_compra = serializers.DateField(source="purchase.fecha_compra", read_only=True)
    budget_numero = serializers.CharField(source="purchase.budget.numero", read_only=True)
    purchase_id = serializers.IntegerField(source="purchase.id", read_only=True)

    # ✅ IMPORTANTE: para sugerencias de precio desde el listado
    total_compra = serializers.CharField(source="purchase.total_snapshot", read_only=True)

    class Meta:
        model = PurchasedUnit
        fields = [
            "id",
            "purchase_id",
            "total_compra",
            "fecha_compra",
            "budget_numero",
            "machine_base",
            "machine_nombre",
            "estado",
            "identificador",
            "created_at",
            "updated_at",
        ]


class RevenueEventForUnitSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    tipo = serializers.CharField()
    fecha = serializers.DateField()
    monto_total = serializers.CharField()
    monto_mensual = serializers.CharField(allow_null=True)
    notas = serializers.CharField()

    # Mes/Año (para alquileres; para ventas lo dejamos igual usando fecha)
    inicio_year = serializers.IntegerField(allow_null=True)
    inicio_month = serializers.IntegerField(allow_null=True)
    retorno_estimada_year = serializers.IntegerField(allow_null=True)
    retorno_estimada_month = serializers.IntegerField(allow_null=True)
    retorno_real_year = serializers.IntegerField(allow_null=True)
    retorno_real_month = serializers.IntegerField(allow_null=True)

    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class PurchasedUnitDetailSerializer(serializers.ModelSerializer):
    machine_nombre = serializers.CharField(source="machine_base.nombre", read_only=True)
    fecha_compra = serializers.DateField(source="purchase.fecha_compra", read_only=True)
    budget_numero = serializers.CharField(source="purchase.budget.numero", read_only=True)
    purchase_id = serializers.IntegerField(source="purchase.id", read_only=True)

    total_compra = serializers.CharField(source="purchase.total_snapshot", read_only=True)
    notas_compra = serializers.CharField(source="purchase.notas", read_only=True)

    accesorios = serializers.SerializerMethodField()

    # NUEVO: detalle de venta + historial de alquileres
    venta = serializers.SerializerMethodField()
    alquileres = serializers.SerializerMethodField()

    class Meta:
        model = PurchasedUnit
        fields = [
            "id",
            "purchase_id",
            "fecha_compra",
            "budget_numero",
            "machine_base",
            "machine_nombre",
            "estado",
            "identificador",
            "total_compra",
            "notas_compra",
            "accesorios",
            "venta",
            "alquileres",
            "created_at",
            "updated_at",
        ]

    def get_accesorios(self, obj):
        qs = obj.budget_item.accesorios.select_related("accessory").order_by("accessory__nombre", "id")
        return PurchasedUnitAccessorySerializer(qs, many=True).data

    @staticmethod
    def _map_revenue(ev):
        inicio_year = ev.fecha.year if ev.tipo == RevenueType.ALQUILER else None
        inicio_month = ev.fecha.month if ev.tipo == RevenueType.ALQUILER else None

        re_y = ev.fecha_retorno_estimada.year if ev.fecha_retorno_estimada else None
        re_m = ev.fecha_retorno_estimada.month if ev.fecha_retorno_estimada else None

        rr_y = ev.fecha_retorno_real.year if ev.fecha_retorno_real else None
        rr_m = ev.fecha_retorno_real.month if ev.fecha_retorno_real else None

        data = {
            "id": ev.id,
            "tipo": ev.tipo,
            "fecha": ev.fecha,
            "monto_total": str(ev.monto_total),
            "monto_mensual": str(ev.monto_mensual) if ev.monto_mensual is not None else None,
            "notas": ev.notas or "",
            "inicio_year": inicio_year,
            "inicio_month": inicio_month,
            "retorno_estimada_year": re_y,
            "retorno_estimada_month": re_m,
            "retorno_real_year": rr_y,
            "retorno_real_month": rr_m,
            "created_at": ev.created_at,
            "updated_at": ev.updated_at,
        }
        return RevenueEventForUnitSerializer(data).data

    def get_venta(self, obj):
        rels = (
            obj.revenue_usos.select_related("revenue_event")
            .filter(revenue_event__tipo=RevenueType.VENTA)
            .order_by("-revenue_event__fecha", "-revenue_event__created_at")
        )
        rel = rels.first()
        if not rel:
            return None
        return self._map_revenue(rel.revenue_event)

    def get_alquileres(self, obj):
        rels = (
            obj.revenue_usos.select_related("revenue_event")
            .filter(revenue_event__tipo=RevenueType.ALQUILER)
            .order_by("-revenue_event__fecha", "-revenue_event__created_at")
        )
        return [self._map_revenue(r.revenue_event) for r in rels]


class UnitMarkRentedSerializer(serializers.Serializer):
    inicio_year = serializers.IntegerField(min_value=2000, max_value=2100)
    inicio_month = serializers.IntegerField(min_value=1, max_value=12)

    retorno_estimada_year = serializers.IntegerField(min_value=2000, max_value=2100)
    retorno_estimada_month = serializers.IntegerField(min_value=1, max_value=12)

    monto_mensual = serializers.DecimalField(max_digits=14, decimal_places=2)
    notas = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        sy, sm = attrs["inicio_year"], attrs["inicio_month"]
        ey, em = attrs["retorno_estimada_year"], attrs["retorno_estimada_month"]
        start = sy * 12 + sm
        end = ey * 12 + em
        if end < start:
            raise serializers.ValidationError("El retorno estimado no puede ser anterior al inicio.")
        return attrs


class UnitFinishRentalSerializer(serializers.Serializer):
    retorno_real_year = serializers.IntegerField(min_value=2000, max_value=2100)
    retorno_real_month = serializers.IntegerField(min_value=1, max_value=12)


class UnitMarkSoldSerializer(serializers.Serializer):
    fecha_venta = serializers.DateField()
    monto_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    cliente_texto = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    notas = serializers.CharField(required=False, allow_blank=True, default="")
