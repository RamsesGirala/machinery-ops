from __future__ import annotations

from rest_framework import serializers

from machinery.models import (
    Budget,
    BudgetItem,
    BudgetItemAccessory,
    BudgetTaxApplied,
    BudgetSelectedLogisticsLeg,
)


class BudgetItemAccessoryInSerializer(serializers.Serializer):
    accessory_id = serializers.IntegerField()
    cantidad = serializers.IntegerField(min_value=1)
    accessory_total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)


class BudgetItemInSerializer(serializers.Serializer):
    machine_base_id = serializers.IntegerField()
    cantidad = serializers.IntegerField(min_value=1)
    machine_total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    accesorios = BudgetItemAccessoryInSerializer(many=True, required=False)


class BudgetTaxInSerializer(serializers.Serializer):
    tax_id = serializers.IntegerField()
    incluido = serializers.BooleanField(required=False, default=True)
    porcentaje = serializers.DecimalField(max_digits=6, decimal_places=2, required=False)
    monto_minimo = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)

class BudgetLogisticsInSerializer(serializers.Serializer):
    logistics_leg_id = serializers.IntegerField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)


class BudgetCreateSerializer(serializers.Serializer):
    fecha = serializers.DateField(required=False)
    items = BudgetItemInSerializer(many=True)
    impuestos = BudgetTaxInSerializer(many=True, required=False)
    logisticas = BudgetLogisticsInSerializer(many=True, required=False)


# -------------------------
# Output serializers
# -------------------------
class BudgetItemAccessoryOutSerializer(serializers.ModelSerializer):
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


class BudgetItemOutSerializer(serializers.ModelSerializer):
    machine_nombre = serializers.CharField(source="machine_base.nombre", read_only=True)
    accesorios = serializers.SerializerMethodField()

    class Meta:
        model = BudgetItem
        fields = [
            "id",
            "machine_base",
            "machine_nombre",
            "cantidad",
            "machine_total_snapshot",
            "subtotal_maquina_snapshot",
            "accesorios",
        ]

    def get_accesorios(self, obj):
        qs = obj.accesorios.select_related("accessory").order_by("accessory__nombre", "id")
        return BudgetItemAccessoryOutSerializer(qs, many=True).data


class BudgetTaxOutSerializer(serializers.ModelSerializer):
    tax_nombre = serializers.CharField(source="tax.nombre", read_only=True)

    class Meta:
        model = BudgetTaxApplied
        fields = ["id", "tax", "tax_nombre", "porcentaje_snapshot", "monto_minimo_snapshot", "monto_aplicado_snapshot"]


class BudgetLogisticsOutSerializer(serializers.ModelSerializer):
    desde = serializers.CharField(source="logistics_leg.desde", read_only=True)
    hasta = serializers.CharField(source="logistics_leg.hasta", read_only=True)
    tipo = serializers.CharField(source="logistics_leg.tipo", read_only=True)
    etapa = serializers.CharField(source="logistics_leg.etapa", read_only=True)

    class Meta:
        model = BudgetSelectedLogisticsLeg
        fields = ["id", "logistics_leg", "desde", "hasta", "tipo", "etapa", "total_snapshot"]


class BudgetListSerializer(serializers.ModelSerializer):
    compra_id = serializers.SerializerMethodField()
    tiene_compra = serializers.SerializerMethodField()
    machine_bases = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            "id",
            "numero",
            "fecha",
            "estado",
            "machine_bases",
            "tiene_compra",
            "compra_id",
            "base_imponible_snapshot",
            "total_impuestos_snapshot",
            "total_snapshot",
            "created_at",
            "updated_at",
        ]

    def get_compra_id(self, obj):
        if hasattr(obj, "compra") and obj.compra:
            return obj.compra.id
        return None

    def get_tiene_compra(self, obj):
        return bool(hasattr(obj, "compra") and obj.compra)

    def get_machine_bases(self, obj):
        # nombres únicos, en orden alfabético
        qs = obj.items.select_related("machine_base").all()
        nombres = sorted({it.machine_base.nombre for it in qs})
        return nombres


class BudgetDetailSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    impuestos = serializers.SerializerMethodField()
    logisticas = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            "id",
            "numero",
            "fecha",
            "estado",
            "subtotal_maquinas_snapshot",
            "subtotal_accesorios_snapshot",
            "subtotal_logistica_hasta_aduana_snapshot",
            "subtotal_logistica_post_aduana_snapshot",
            "base_imponible_snapshot",
            "total_impuestos_snapshot",
            "costo_aduana_snapshot",
            "total_snapshot",
            "items",
            "impuestos",
            "logisticas",
            "created_at",
            "updated_at",
        ]

    def get_items(self, obj):
        # ✅ máquinas ordenadas alfabéticamente
        qs = obj.items.select_related("machine_base").order_by("machine_base__nombre", "id")
        return BudgetItemOutSerializer(qs, many=True).data

    def get_impuestos(self, obj):
        # ✅ solo los impuestos efectivamente incluidos + orden alfabético
        qs = obj.impuestos.select_related("tax").filter(incluido=True).order_by("tax__nombre", "id")
        return BudgetTaxOutSerializer(qs, many=True).data

    def get_logisticas(self, obj):
        # ✅ HASTA_ADUANA primero, luego POST_ADUANA
        # y dentro orden por desde/hasta/tipo
        qs = obj.logisticas.select_related("logistics_leg").all()

        def sort_key(x):
            etapa = x.logistics_leg.etapa
            etapa_rank = 0 if str(etapa) == "HASTA_ADUANA" else 1
            return (
                etapa_rank,
                (x.logistics_leg.desde or ""),
                (x.logistics_leg.hasta or ""),
                (x.logistics_leg.tipo or ""),
                x.id,
            )

        items = sorted(list(qs), key=sort_key)
        return BudgetLogisticsOutSerializer(items, many=True).data
