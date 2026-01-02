from __future__ import annotations

from django.db import models
from django.db.models import Q

from .base import TimeStampedModel, USD_VALIDATOR
from .purchase import PurchasedUnit


class RevenueType(models.TextChoices):
    VENTA = "VENTA", "Venta"
    ALQUILER = "ALQUILER", "Alquiler"


class RevenueEvent(TimeStampedModel):
    """
    Evento de ingresos.

    - VENTA:
        - fecha: fecha exacta de venta (YYYY-MM-DD)
        - monto_total: total de la venta
        - monto_mensual: NULL
        - fechas de retorno: NULL

    - ALQUILER:
        - fecha: se guarda como 1er día del mes/año de inicio (YYYY-MM-01). El front opera por Mes/Año.
        - fecha_retorno_estimada: se guarda como 1er día del mes/año estimado (YYYY-MM-01)
        - fecha_retorno_real: se guarda como 1er día del mes/año real (YYYY-MM-01) o NULL si sigue activo
        - monto_mensual: monto mensual ingresado desde el front
        - monto_total: total calculado en base a meses * monto_mensual (al crear y al finalizar)
    """

    tipo = models.CharField(max_length=10, choices=RevenueType.choices)

    # Para VENTA: fecha exacta.
    # Para ALQUILER: usamos día 01 (YYYY-MM-01) para representar Mes/Año (el front trabaja por Mes/Año).
    fecha = models.DateField()

    # De momento NO mandamos clientes desde el front (pero lo dejamos por si lo activás luego).
    cliente_texto = models.CharField(max_length=200, blank=True, default="")

    monto_total = models.DecimalField(max_digits=14, decimal_places=2, validators=[USD_VALIDATOR])

    # Solo para alquiler: monto mensual
    monto_mensual = models.DecimalField(max_digits=14, decimal_places=2, validators=[USD_VALIDATOR], null=True, blank=True)

    # Solo para alquiler (se guardan como YYYY-MM-01)
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
            # Si es VENTA => retorno_estimada/real y monto_mensual deben ser NULL
            models.CheckConstraint(
                check=(
                    Q(tipo=RevenueType.ALQUILER)
                    | (
                        Q(tipo=RevenueType.VENTA)
                        & Q(fecha_retorno_estimada__isnull=True)
                        & Q(fecha_retorno_real__isnull=True)
                        & Q(monto_mensual__isnull=True)
                    )
                ),
                name="ck_revenue_return_dates_only_for_rental",
            ),
            # Si es ALQUILER => monto_mensual y retorno_estimada deben existir
            models.CheckConstraint(
                check=(
                    Q(tipo=RevenueType.VENTA)
                    | (Q(tipo=RevenueType.ALQUILER) & Q(monto_mensual__isnull=False) & Q(fecha_retorno_estimada__isnull=False))
                ),
                name="ck_revenue_rental_requires_monthly_and_estimated_return",
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
