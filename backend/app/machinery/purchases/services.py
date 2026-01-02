from __future__ import annotations

from datetime import date
from django.db import transaction
from django.utils import timezone

from machinery.models import Budget, BudgetStatus, Purchase, PurchasedUnit, UnitStatus, RevenueEvent, RevenueType, \
    RevenueEventUnit
from machinery.shared.errors import DomainError, ErrorCodes


class PurchaseService:
    @transaction.atomic
    def create_purchase_from_budget(self, *, budget_id: int, fecha_compra: str | None, notas: str = "") -> Purchase:
        budget = (
            Budget.objects.select_for_update()
            .select_related("compra")
            .prefetch_related("items__machine_base")
            .get(pk=budget_id)
        )

        # ya comprado
        if hasattr(budget, "compra"):
            return budget.compra  # idempotente: si ya existe, devolvemos la existente

        fc = None
        if fecha_compra:
            # viene YYYY-MM-DD
            fc = date.fromisoformat(fecha_compra)
        else:
            fc = timezone.localdate()

        purchase = Purchase.objects.create(
            budget=budget,
            fecha_compra=fc,
            total_snapshot=budget.total_snapshot,
            notas=notas or "",
        )

        # generar unidades por cantidad
        units_to_create = []
        for item in budget.items.all():
            for _ in range(int(item.cantidad)):
                units_to_create.append(
                    PurchasedUnit(
                        purchase=purchase,
                        budget_item=item,
                        machine_base=item.machine_base,
                        estado=UnitStatus.DEPOSITO,
                        identificador="",
                    )
                )
        if units_to_create:
            PurchasedUnit.objects.bulk_create(units_to_create)

        # cerrar el presupuesto
        if budget.estado != BudgetStatus.CERRADO:
            budget.estado = BudgetStatus.CERRADO
            budget.save(update_fields=["estado"])

        return purchase

class UnitLifecycleService:
    @staticmethod
    @transaction.atomic
    def mark_rented(
        *,
        unit_id: int,
        fecha_inicio: date,
        fecha_retorno_estimada: date,
        monto_total,
        cliente_texto: str = "",
        notas: str = "",
    ) -> PurchasedUnit:
        unit = PurchasedUnit.objects.select_for_update().select_related("machine_base").get(pk=unit_id)

        if unit.estado != UnitStatus.DEPOSITO:
            raise DomainError(
                ErrorCodes.CONFLICT,
                message_override="Solo podés alquilar unidades que estén en DEPÓSITO.",
                details={"unit_id": unit.id, "estado_actual": unit.estado},
            )

        ev = RevenueEvent.objects.create(
            tipo=RevenueType.ALQUILER,
            fecha=fecha_inicio,
            monto_total=monto_total,
            cliente_texto=cliente_texto or "",
            fecha_retorno_estimada=fecha_retorno_estimada,
            notas=notas or "",
        )
        RevenueEventUnit.objects.create(revenue_event=ev, purchased_unit=unit)

        unit.estado = UnitStatus.ALQUILADA
        unit.save(update_fields=["estado"])
        return unit

    @staticmethod
    @transaction.atomic
    def finish_rental(*, unit_id: int, fecha_retorno_real: date) -> PurchasedUnit:
        unit = PurchasedUnit.objects.select_for_update().get(pk=unit_id)

        if unit.estado != UnitStatus.ALQUILADA:
            raise DomainError(
                ErrorCodes.CONFLICT,
                message_override="Solo podés finalizar alquiler si la unidad está ALQUILADA.",
                details={"unit_id": unit.id, "estado_actual": unit.estado},
            )

        rel = (
            RevenueEventUnit.objects.select_related("revenue_event")
            .filter(
                purchased_unit=unit,
                revenue_event__tipo=RevenueType.ALQUILER,
                revenue_event__fecha_retorno_real__isnull=True,
            )
            .order_by("-revenue_event__fecha", "-id")
            .first()
        )
        if not rel:
            raise DomainError(
                ErrorCodes.CONFLICT,
                message_override="No se encontró un alquiler activo (sin devolución real) para esta unidad.",
                details={"unit_id": unit.id},
            )

        ev = rel.revenue_event
        ev.fecha_retorno_real = fecha_retorno_real
        ev.save(update_fields=["fecha_retorno_real"])

        unit.estado = UnitStatus.DEPOSITO
        unit.save(update_fields=["estado"])
        return unit

    @staticmethod
    @transaction.atomic
    def mark_sold(
        *,
        unit_id: int,
        fecha_venta: date,
        monto_total,
        cliente_texto: str = "",
        notas: str = "",
    ) -> PurchasedUnit:
        unit = PurchasedUnit.objects.select_for_update().get(pk=unit_id)

        if unit.estado != UnitStatus.DEPOSITO:
            raise DomainError(
                ErrorCodes.CONFLICT,
                message_override="Solo podés vender unidades que estén en DEPÓSITO.",
                details={"unit_id": unit.id, "estado_actual": unit.estado},
            )

        ev = RevenueEvent.objects.create(
            tipo=RevenueType.VENTA,
            fecha=fecha_venta,
            monto_total=monto_total,
            cliente_texto=cliente_texto or "",
            notas=notas or "",
        )
        RevenueEventUnit.objects.create(revenue_event=ev, purchased_unit=unit)

        unit.estado = UnitStatus.VENDIDA
        unit.save(update_fields=["estado"])
        return unit
