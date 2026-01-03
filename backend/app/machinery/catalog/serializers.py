from __future__ import annotations
from rest_framework import serializers

from machinery.models import (
    MachineBase,
    Accessory,
    Tax,
    LogisticsLeg,
    LogisticsType,
    LogisticsStage,
)

class MachineBaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = MachineBase
        fields = ["id", "nombre", "total", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

class AccessorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Accessory
        fields = ["id", "nombre", "total", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

class TaxSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tax
        fields = ["id", "nombre", "porcentaje", "monto_minimo", "siempre_incluir", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

class LogisticsLegSerializer(serializers.ModelSerializer):
    tipo = serializers.ChoiceField(choices=LogisticsType.choices)
    etapa = serializers.ChoiceField(choices=LogisticsStage.choices)

    class Meta:
        model = LogisticsLeg
        fields = ["id", "desde", "hasta", "tipo", "etapa", "total", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
