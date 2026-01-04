from __future__ import annotations

from decimal import Decimal
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from .base import TimeStampedModel, USD_VALIDATOR
from .catalog import Client
from .purchase import PurchasedUnit


class RevenueType(models.TextChoices):
    VENTA = "VENTA", "Venta"
    ALQUILER = "ALQUILER", "Alquiler"


class RentalTipo(models.TextChoices):
    MENSUAL = "MENSUAL", "Mensual"
    SEMANAL = "SEMANAL", "Semanal"
    DIARIO = "DIARIO", "Diario"


class PaymentMethod(models.TextChoices):
    TRANSFERENCIA = "TRANSFERENCIA", "Transferencia"
    TARJETA_CREDITO = "TARJETA_CREDITO", "Tarjeta crédito"
    CHEQUE = "CHEQUE", "Cheque"


class RevenueEvent(TimeStampedModel):
    """
    Evento comercial (venta o alquiler). El flujo de caja real se registra en RevenuePayment.
    """

    tipo = models.CharField(max_length=10, choices=RevenueType.choices)

    cliente = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="revenue_events")

    # Venta: fecha de operación. (Pagos pueden ser 1..N via RevenuePayment)
    fecha_operacion = models.DateField(null=True, blank=True)

    # Alquiler: fechas reales (para mensual/semanal/diario)
    rental_tipo = models.CharField(max_length=10, choices=RentalTipo.choices, null=True, blank=True)
    rental_inicio = models.DateField(null=True, blank=True)
    rental_fin_estimado = models.DateField(null=True, blank=True)
    rental_fin_real = models.DateField(null=True, blank=True)

    monto_unitario = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[USD_VALIDATOR], null=True, blank=True
    )

    # Total final del evento (venta o alquiler). Si el alquiler todavía no está “cerrado”, igual podés guardar el estimado acá.
    monto_total_final = models.DecimalField(max_digits=14, decimal_places=2, validators=[USD_VALIDATOR])

    notas = models.TextField(blank=True, default="")

    class Meta:
        db_table = "revenue_event"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tipo"]),
            models.Index(fields=["fecha_operacion"]),
            models.Index(fields=["cliente"]),
        ]
        constraints = [
            # VENTA => requiere fecha_operacion y NO permite campos de alquiler
            models.CheckConstraint(
                check=(
                    Q(tipo=RevenueType.ALQUILER)
                    | (
                        Q(tipo=RevenueType.VENTA)
                        & Q(fecha_operacion__isnull=False)
                        & Q(rental_tipo__isnull=True)
                        & Q(rental_inicio__isnull=True)
                        & Q(rental_fin_estimado__isnull=True)
                        & Q(rental_fin_real__isnull=True)
                        & Q(monto_unitario__isnull=True)
                    )
                ),
                name="ck_revenue_event_sale_fields",
            ),
            # ALQUILER => requiere rental_tipo + fechas + monto_unitario y NO requiere fecha_operacion
            models.CheckConstraint(
                check=(
                    Q(tipo=RevenueType.VENTA)
                    | (
                        Q(tipo=RevenueType.ALQUILER)
                        & Q(rental_tipo__isnull=False)
                        & Q(rental_inicio__isnull=False)
                        & Q(rental_fin_estimado__isnull=False)
                        & Q(monto_unitario__isnull=False)
                    )
                ),
                name="ck_revenue_event_rental_requires_fields",
            ),
            # Si hay fin real, debe ser >= inicio
            models.CheckConstraint(
                check=Q(rental_fin_real__isnull=True) | Q(rental_fin_real__gte=models.F("rental_inicio")),
                name="ck_revenue_rental_fin_real_gte_inicio",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.tipo} (${self.monto_total_final})"


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


class RevenuePayment(TimeStampedModel):
    revenue_event = models.ForeignKey(RevenueEvent, on_delete=models.CASCADE, related_name="payments")

    monto = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[USD_VALIDATOR, MinValueValidator(Decimal("0.01"))],
    )

    metodo_pago = models.CharField(max_length=30, choices=PaymentMethod.choices)

    # Para “ingresos esperados”
    fecha_prevista = models.DateField()

    # Para “ingresos cobrados”
    cobrado = models.BooleanField(default=False)
    fecha_cobro_real = models.DateField(null=True, blank=True)

    descripcion = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "revenue_payment"
        ordering = ["fecha_prevista", "id"]
        indexes = [
            models.Index(fields=["fecha_prevista"]),
            models.Index(fields=["cobrado"]),
            models.Index(fields=["fecha_cobro_real"]),
            models.Index(fields=["metodo_pago"]),
            models.Index(fields=["revenue_event"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=(Q(cobrado=False) & Q(fecha_cobro_real__isnull=True))
                | (Q(cobrado=True) & Q(fecha_cobro_real__isnull=False)),
                name="ck_revenue_payment_cobrado_fecha_real_consistency",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.revenue_event_id} {self.fecha_prevista} ${self.monto} ({'cobrado' if self.cobrado else 'pendiente'})"
