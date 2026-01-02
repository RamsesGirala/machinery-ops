from __future__ import annotations

from decimal import Decimal
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

from .base import TimeStampedModel, USD_VALIDATOR


class MachineBase(TimeStampedModel):
    nombre = models.CharField(max_length=200, unique=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, validators=[USD_VALIDATOR])

    class Meta:
        db_table = "machine_base"
        ordering = ["nombre"]

    def __str__(self) -> str:
        return self.nombre


class Accessory(TimeStampedModel):
    nombre = models.CharField(max_length=200, unique=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, validators=[USD_VALIDATOR])

    class Meta:
        db_table = "accessory"
        ordering = ["nombre"]

    def __str__(self) -> str:
        return self.nombre


class Tax(TimeStampedModel):
    nombre = models.CharField(max_length=200, unique=True)
    porcentaje = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
    )
    siempre_incluir = models.BooleanField(default=False)

    class Meta:
        db_table = "tax"
        ordering = ["nombre"]

    def __str__(self) -> str:
        return f"{self.nombre} ({self.porcentaje}%)"


class LogisticsType(models.TextChoices):
    TERRESTRE = "TERRESTRE", "Terrestre"
    AEREO = "AEREO", "Aéreo"
    MARITIMO = "MARITIMO", "Marítimo"


class LogisticsStage(models.TextChoices):
    HASTA_ADUANA = "HASTA_ADUANA", "Hasta aduana"
    POST_ADUANA = "POST_ADUANA", "Post aduana"


class LogisticsLeg(TimeStampedModel):
    desde = models.CharField(max_length=200)
    hasta = models.CharField(max_length=200)
    tipo = models.CharField(max_length=20, choices=LogisticsType.choices)
    etapa = models.CharField(max_length=20, choices=LogisticsStage.choices)
    total = models.DecimalField(max_digits=12, decimal_places=2, validators=[USD_VALIDATOR])

    class Meta:
        db_table = "logistics_leg"
        ordering = ["etapa", "desde", "hasta", "tipo"]
        indexes = [
            models.Index(fields=["etapa"]),
            models.Index(fields=["tipo"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["desde", "hasta", "tipo", "etapa"],
                name="uq_logistics_leg_route",
            )
        ]

    def __str__(self) -> str:
        return f"{self.desde} -> {self.hasta} ({self.tipo}, {self.etapa})"
