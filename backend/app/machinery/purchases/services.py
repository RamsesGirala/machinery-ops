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
            .prefetch_related(
                "items",
                "items__accesorios",
                "logisticas",
                "impuestos",
            )
            .get(pk=budget_id)
        )

        if budget.estado != BudgetStatus.CERRADO:
            raise DomainError(
                ErrorCodes.CONFLICT,
                message_override="Solo podés comprar presupuestos en estado CERRADO.",
                details={"budget_id": budget.id, "estado_actual": budget.estado},
            )

        if hasattr(budget, "compra") and budget.compra is not None:
            raise DomainError(
                ErrorCodes.CONFLICT,
                message_override="Este presupuesto ya tiene una compra asociada.",
                details={"budget_id": budget.id, "purchase_id": budget.compra.id},
            )

        # fecha compra
        if fecha_compra:
            f = date.fromisoformat(fecha_compra)
        else:
            f = timezone.now().date()

        purchase = Purchase.objects.create(
            budget=budget,
            fecha_compra=f,
            total_snapshot=budget.total_snapshot,
            notas=notas or "",
        )

        # Crear unidades (una por item * cantidad)
        for it in budget.items.all():
            for i in range(it.cantidad):
                PurchasedUnit.objects.create(
                    purchase=purchase,
                    budget_item=it,
                    machine_base=it.machine_base,
                    estado=UnitStatus.DEPOSITO,
                    identificador=f"{budget.numero}-{it.machine_base_id}-{i+1}",
                )

        return purchase


class UnitLifecycleService:
    @staticmethod
    def _ym_to_date(*, year: int, month: int) -> date:
        return date(int(year), int(month), 1)

    @staticmethod
    def _months_inclusive(*, start_year: int, start_month: int, end_year: int, end_month: int) -> int:
        start = int(start_year) * 12 + int(start_month)
        end = int(end_year) * 12 + int(end_month)
        return (end - start) + 1

    @staticmethod
    @transaction.atomic
    def mark_rented(
        *,
        unit_id: int,
        inicio_year: int,
        inicio_month: int,
        retorno_estimada_year: int,
        retorno_estimada_month: int,
        monto_mensual,
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

        fecha_inicio = UnitLifecycleService._ym_to_date(year=inicio_year, month=inicio_month)
        fecha_retorno_estimada = UnitLifecycleService._ym_to_date(year=retorno_estimada_year, month=retorno_estimada_month)

        meses = UnitLifecycleService._months_inclusive(
            start_year=inicio_year,
            start_month=inicio_month,
            end_year=retorno_estimada_year,
            end_month=retorno_estimada_month,
        )
        monto_total = monto_mensual * meses

        ev = RevenueEvent.objects.create(
            tipo=RevenueType.ALQUILER,
            fecha=fecha_inicio,
            monto_mensual=monto_mensual,
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
    def finish_rental(*, unit_id: int, retorno_real_year: int, retorno_real_month: int) -> PurchasedUnit:
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
            .order_by("-revenue_event__fecha", "-revenue_event__created_at")
            .first()
        )

        if not rel:
            raise DomainError(
                ErrorCodes.NOT_FOUND,
                message_override="No se encontró un alquiler activo para esta unidad.",
                details={"unit_id": unit.id},
            )

        ev = rel.revenue_event
        fecha_retorno_real = UnitLifecycleService._ym_to_date(year=retorno_real_year, month=retorno_real_month)

        # Recalculamos total en base al período real, usando el monto mensual guardado
        meses = UnitLifecycleService._months_inclusive(
            start_year=ev.fecha.year,
            start_month=ev.fecha.month,
            end_year=retorno_real_year,
            end_month=retorno_real_month,
        )
        monto_mensual = ev.monto_mensual or 0
        ev.fecha_retorno_real = fecha_retorno_real
        ev.monto_total = monto_mensual * meses
        ev.save(update_fields=["fecha_retorno_real", "monto_total"])

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
