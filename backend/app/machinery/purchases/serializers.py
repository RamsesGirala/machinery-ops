from __future__ import annotations

from rest_framework import serializers

from machinery.models import PurchasedUnit, BudgetItemAccessory, RevenueType, RentalTipo, PaymentMethod


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

    cliente = serializers.DictField()  # {id,nombre}

    fecha_operacion = serializers.DateField(allow_null=True)

    rental_tipo = serializers.CharField(allow_null=True)
    rental_inicio = serializers.DateField(allow_null=True)
    rental_fin_estimado = serializers.DateField(allow_null=True)
    rental_fin_real = serializers.DateField(allow_null=True)

    monto_unitario = serializers.CharField(allow_null=True)
    monto_total_final = serializers.CharField()

    pagos_pendientes = serializers.IntegerField()
    pagos_cobrados = serializers.IntegerField()

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
        pagos_pendientes = ev.payments.filter(cobrado=False).count()
        pagos_cobrados = ev.payments.filter(cobrado=True).count()

        data = {
            "id": ev.id,
            "tipo": ev.tipo,
            "cliente": {"id": ev.cliente_id, "nombre": ev.cliente.nombre},
            "fecha_operacion": ev.fecha_operacion,
            "rental_tipo": ev.rental_tipo,
            "rental_inicio": ev.rental_inicio,
            "rental_fin_estimado": ev.rental_fin_estimado,
            "rental_fin_real": ev.rental_fin_real,
            "monto_unitario": str(ev.monto_unitario) if ev.monto_unitario is not None else None,
            "monto_total_final": str(ev.monto_total_final),
            "pagos_pendientes": pagos_pendientes,
            "pagos_cobrados": pagos_cobrados,
            "created_at": ev.created_at,
            "updated_at": ev.updated_at,
        }
        return RevenueEventForUnitSerializer(data).data

    def get_venta(self, obj):
        rels = (
            obj.revenue_usos.select_related("revenue_event", "revenue_event__cliente")
            .filter(revenue_event__tipo=RevenueType.VENTA)
            .order_by("-revenue_event__fecha_operacion", "-revenue_event__created_at")
        )
        rel = rels.first()
        if not rel:
            return None
        return self._map_revenue(rel.revenue_event)

    def get_alquileres(self, obj):
        rels = (
            obj.revenue_usos.select_related("revenue_event", "revenue_event__cliente")
            .filter(revenue_event__tipo=RevenueType.ALQUILER)
            .order_by("-revenue_event__rental_inicio", "-revenue_event__created_at")
        )
        return [self._map_revenue(r.revenue_event) for r in rels]


class RevenuePaymentInSerializer(serializers.Serializer):
    monto = serializers.DecimalField(max_digits=14, decimal_places=2)
    metodo_pago = serializers.ChoiceField(choices=PaymentMethod.choices)
    fecha_prevista = serializers.DateField()
    descripcion = serializers.CharField(required=False, allow_blank=True, default="")

class UnitMarkRentedSerializer(serializers.Serializer):
    cliente_id = serializers.IntegerField()
    rental_tipo = serializers.ChoiceField(choices=RentalTipo.choices)

    rental_inicio = serializers.DateField()
    rental_fin_estimado = serializers.DateField()

    monto_unitario = serializers.DecimalField(max_digits=14, decimal_places=2)

    metodo_pago = serializers.ChoiceField(choices=PaymentMethod.choices)
    pago_unico = serializers.BooleanField(required=False, default=False)

    payments = RevenuePaymentInSerializer(many=True, required=False)

    notas = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if attrs["rental_fin_estimado"] < attrs["rental_inicio"]:
            raise serializers.ValidationError("La fecha fin estimada no puede ser anterior al inicio.")
        return attrs

class UnitFinishRentalSerializer(serializers.Serializer):
    rental_fin_real = serializers.DateField()

class UnitMarkSoldSerializer(serializers.Serializer):
    cliente_id = serializers.IntegerField()
    fecha_operacion = serializers.DateField()
    monto_total_final = serializers.DecimalField(max_digits=14, decimal_places=2)

    metodo_pago = serializers.ChoiceField(choices=PaymentMethod.choices)
    payments = RevenuePaymentInSerializer(many=True, required=False)
    cheques_cuotas = serializers.IntegerField(required=False, min_value=1, default=1)

    notas = serializers.CharField(required=False, allow_blank=True, default="")
