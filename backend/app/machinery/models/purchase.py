from __future__ import annotations

from django.db import models

from .base import TimeStampedModel, USD_VALIDATOR
from .budget import Budget, BudgetItem
from .catalog import MachineBase


class Purchase(TimeStampedModel):
    budget = models.OneToOneField(Budget, on_delete=models.PROTECT, related_name="compra")
    fecha_compra = models.DateField()
    total_snapshot = models.DecimalField(max_digits=14, decimal_places=2, validators=[USD_VALIDATOR])

    notas = models.TextField(blank=True, default="")

    class Meta:
        db_table = "purchase"
        ordering = ["-fecha_compra", "-created_at"]

    def __str__(self) -> str:
        return f"Compra de {self.budget.numero}"


class UnitStatus(models.TextChoices):
    DEPOSITO = "DEPOSITO", "Depósito"
    ALQUILADA = "ALQUILADA", "Alquilada"
    VENDIDA = "VENDIDA", "Vendida"


class PurchasedUnit(TimeStampedModel):
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name="unidades")
    budget_item = models.ForeignKey(BudgetItem, on_delete=models.PROTECT, related_name="unidades_compradas")

    machine_base = models.ForeignKey(MachineBase, on_delete=models.PROTECT, related_name="unidades_compradas")
    estado = models.CharField(max_length=12, choices=UnitStatus.choices, default=UnitStatus.DEPOSITO)

    identificador = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        db_table = "purchased_unit"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["estado"]),
            models.Index(fields=["machine_base"]),
            models.Index(fields=["purchase"]),
        ]

    def __str__(self) -> str:
        return f"{self.machine_base.nombre} ({self.estado})"
