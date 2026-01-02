from __future__ import annotations

from django.db import models
from django.db.models import Q

from .base import TimeStampedModel, USD_VALIDATOR
from .purchase import PurchasedUnit


class RevenueType(models.TextChoices):
    VENTA = "VENTA", "Venta"
    ALQUILER = "ALQUILER", "Alquiler"


class RevenueEvent(TimeStampedModel):
    tipo = models.CharField(max_length=10, choices=RevenueType.choices)
    fecha = models.DateField()

    cliente_texto = models.CharField(max_length=200, blank=True, default="")
    monto_total = models.DecimalField(max_digits=14, decimal_places=2, validators=[USD_VALIDATOR])

    # Solo para alquiler
    fecha_retorno_estimada = models.DateField(null=True, blank=True)
    fecha_retorno_real = models.DateField(null=True, blank=True)

    notas = models.TextField(blank=True, default="")

    class Meta:
        db_table = "revenue_event"
        ordering = ["-fecha", "-created_at"]
        indexes = [
            models.Index(fields=["tipo"]),
            models.Index(fields=["fecha"]),
        ]
        constraints = [
            # Si es VENTA => retorno_estimada/real deben ser NULL
            models.CheckConstraint(
                check=(
                    Q(tipo=RevenueType.ALQUILER)
                    | (Q(tipo=RevenueType.VENTA) & Q(fecha_retorno_estimada__isnull=True) & Q(fecha_retorno_real__isnull=True))
                ),
                name="ck_revenue_return_dates_only_for_rental",
            ),
            # Si hay fecha_retorno_real, debe ser >= fecha
            models.CheckConstraint(
                check=Q(fecha_retorno_real__isnull=True) | Q(fecha_retorno_real__gte=models.F("fecha")),
                name="ck_revenue_return_real_gte_start",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.tipo} {self.fecha} (${self.monto_total})"


class RevenueEventUnit(TimeStampedModel):
    revenue_event = models.ForeignKey(RevenueEvent, on_delete=models.CASCADE, related_name="unidades")
    purchased_unit = models.ForeignKey(PurchasedUnit, on_delete=models.PROTECT, related_name="revenue_usos")

    class Meta:
        db_table = "revenue_event_unit"
        ordering = ["id"]
        indexes = [
            models.Index(fields=["revenue_event"]),
            models.Index(fields=["purchased_unit"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["revenue_event", "purchased_unit"], name="uq_revenue_event_unit"),
        ]

    def __str__(self) -> str:
        return f"{self.revenue_event_id} -> {self.purchased_unit_id}"
