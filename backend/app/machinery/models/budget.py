from __future__ import annotations

from decimal import Decimal
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

from .base import TimeStampedModel, USD_VALIDATOR
from .catalog import MachineBase, Accessory, Tax, LogisticsLeg


class BudgetStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    CERRADO = "CERRADO", "Cerrado"


class Budget(TimeStampedModel):
    numero = models.CharField(max_length=50, unique=True)
    fecha = models.DateField()
    estado = models.CharField(max_length=10, choices=BudgetStatus.choices, default=BudgetStatus.DRAFT)

    # Snapshots (se llenan al cerrar)
    subtotal_maquinas_snapshot = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[USD_VALIDATOR], default=Decimal("0.00")
    )
    subtotal_accesorios_snapshot = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[USD_VALIDATOR], default=Decimal("0.00")
    )
    subtotal_logistica_hasta_aduana_snapshot = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[USD_VALIDATOR], default=Decimal("0.00")
    )
    subtotal_logistica_post_aduana_snapshot = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[USD_VALIDATOR], default=Decimal("0.00")
    )
    base_imponible_snapshot = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[USD_VALIDATOR], default=Decimal("0.00")
    )
    total_impuestos_snapshot = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[USD_VALIDATOR], default=Decimal("0.00")
    )
    costo_aduana_snapshot = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[USD_VALIDATOR], default=Decimal("0.00")
    )
    total_snapshot = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[USD_VALIDATOR], default=Decimal("0.00")
    )

    class Meta:
        db_table = "budget"
        ordering = ["-fecha", "-created_at"]
        indexes = [
            models.Index(fields=["estado"]),
            models.Index(fields=["fecha"]),
        ]

    def __str__(self) -> str:
        return f"Presupuesto {self.numero}"


class BudgetItem(TimeStampedModel):
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name="items")
    machine_base = models.ForeignKey(MachineBase, on_delete=models.PROTECT, related_name="budget_items")
    cantidad = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    machine_total_snapshot = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[USD_VALIDATOR], default=Decimal("0.00")
    )
    subtotal_maquina_snapshot = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[USD_VALIDATOR], default=Decimal("0.00")
    )

    class Meta:
        db_table = "budget_item"
        ordering = ["id"]
        indexes = [
            models.Index(fields=["budget"]),
            models.Index(fields=["machine_base"]),
        ]

    def __str__(self) -> str:
        return f"{self.machine_base.nombre} x {self.cantidad}"


class BudgetItemAccessory(TimeStampedModel):
    budget_item = models.ForeignKey(BudgetItem, on_delete=models.CASCADE, related_name="accesorios")
    accessory = models.ForeignKey(Accessory, on_delete=models.PROTECT, related_name="budget_item_accessories")
    cantidad = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    accessory_total_snapshot = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[USD_VALIDATOR], default=Decimal("0.00")
    )
    subtotal_snapshot = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[USD_VALIDATOR], default=Decimal("0.00")
    )

    class Meta:
        db_table = "budget_item_accessory"
        ordering = ["id"]
        indexes = [
            models.Index(fields=["budget_item"]),
            models.Index(fields=["accessory"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["budget_item", "accessory"],
                name="uq_budget_item_accessory",
            )
        ]

    def __str__(self) -> str:
        return f"{self.accessory.nombre} x {self.cantidad}"


class BudgetTaxApplied(TimeStampedModel):
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name="impuestos")
    tax = models.ForeignKey(Tax, on_delete=models.PROTECT, related_name="budget_taxes")
    incluido = models.BooleanField(default=True)

    porcentaje_snapshot = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
        default=Decimal("0.00"),
    )

    monto_minimo_snapshot = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[USD_VALIDATOR],
        null=True,
        blank=True,
    )

    monto_aplicado_snapshot = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[USD_VALIDATOR],
        default=Decimal("0.00"),
    )


    class Meta:
        db_table = "budget_tax_applied"
        ordering = ["id"]
        indexes = [
            models.Index(fields=["budget"]),
            models.Index(fields=["tax"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["budget", "tax"], name="uq_budget_tax"),
        ]

    def __str__(self) -> str:
        return f"{self.tax.nombre} ({'incluido' if self.incluido else 'no'})"


class BudgetSelectedLogisticsLeg(TimeStampedModel):
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name="logisticas")
    logistics_leg = models.ForeignKey(LogisticsLeg, on_delete=models.PROTECT, related_name="budget_selections")

    total_snapshot = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[USD_VALIDATOR], default=Decimal("0.00")
    )

    class Meta:
        db_table = "budget_selected_logistics_leg"
        ordering = ["id"]
        indexes = [
            models.Index(fields=["budget"]),
            models.Index(fields=["logistics_leg"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["budget", "logistics_leg"],
                name="uq_budget_selected_logistics_leg",
            )
        ]

    def __str__(self) -> str:
        return f"{self.logistics_leg} (presu {self.budget.numero})"
