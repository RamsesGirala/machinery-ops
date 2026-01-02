from rest_framework import serializers
from machinery.models import PurchasedUnit, BudgetItemAccessory


class PurchasedUnitListSerializer(serializers.ModelSerializer):
    machine_nombre = serializers.CharField(source="machine_base.nombre", read_only=True)
    fecha_compra = serializers.DateField(source="purchase.fecha_compra", read_only=True)
    budget_numero = serializers.CharField(source="purchase.budget.numero", read_only=True)
    purchase_id = serializers.IntegerField(source="purchase.id", read_only=True)

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
            "created_at",
            "updated_at",
        ]

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

class PurchasedUnitDetailSerializer(serializers.ModelSerializer):
    machine_nombre = serializers.CharField(source="machine_base.nombre", read_only=True)
    fecha_compra = serializers.DateField(source="purchase.fecha_compra", read_only=True)
    budget_numero = serializers.CharField(source="purchase.budget.numero", read_only=True)
    total_compra = serializers.CharField(source="purchase.total_snapshot", read_only=True)
    notas_compra = serializers.CharField(source="purchase.notas", read_only=True)

    accesorios = serializers.SerializerMethodField()

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
            "created_at",
            "updated_at",
        ]

    def get_accesorios(self, obj):
        qs = obj.budget_item.accesorios.select_related("accessory").order_by("accessory__nombre", "id")
        return PurchasedUnitAccessorySerializer(qs, many=True).data

class UnitMarkRentedSerializer(serializers.Serializer):
    fecha_inicio = serializers.DateField()
    fecha_retorno_estimada = serializers.DateField()
    monto_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    cliente_texto = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    notas = serializers.CharField(required=False, allow_blank=True, default="")


class UnitFinishRentalSerializer(serializers.Serializer):
    fecha_retorno_real = serializers.DateField()


class UnitMarkSoldSerializer(serializers.Serializer):
    fecha_venta = serializers.DateField()
    monto_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    cliente_texto = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    notas = serializers.CharField(required=False, allow_blank=True, default="")