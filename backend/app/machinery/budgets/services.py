from __future__ import annotations
from uuid import uuid4
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List

from django.db import transaction
from django.db.models.deletion import ProtectedError
from django.utils import timezone

from machinery.models import (
    Budget,
    BudgetItem,
    BudgetItemAccessory,
    BudgetTaxApplied,
    BudgetSelectedLogisticsLeg,
    BudgetStatus,
    MachineBase,
    Accessory,
    Tax,
    LogisticsLeg,
    LogisticsStage,
)

from .repositories import BudgetRepository
from ..shared.errors import DomainError, ErrorCodes
from machinery.purchases.services import PurchaseService  # ✅ usamos el service real

D = Decimal


def _d(v: Any) -> Decimal:
    if v is None:
        return D("0.00")
    if isinstance(v, Decimal):
        return v
    return D(str(v))


def _money(v: Decimal) -> Decimal:
    return v.quantize(D("0.01"), rounding=ROUND_HALF_UP)


def _gen_numero() -> str:
    now = timezone.now()
    return f"PRESU-{now:%Y%m%d-%H%M%S-%f}-{uuid4().hex[:6].upper()}"


@dataclass
class BudgetService:
    repo: BudgetRepository

    def list_qs(self):
        return (
            self.repo.list_qs()
            .prefetch_related(
                "items",
                "items__machine_base",
                "items__accesorios",
                "items__accesorios__accessory",
                "impuestos",
                "impuestos__tax",
                "logisticas",
                "logisticas__logistics_leg",
            )
        )

    def get(self, pk: int) -> Budget:
        return self.list_qs().get(pk=pk)

    # ✅ NUEVO: caso de uso "marcar comprado" (solo DRAFT -> cierra -> compra)
    @transaction.atomic
    def purchase_from_draft(self, *, purchase_service: PurchaseService,budget_id: int, fecha_compra: str | None, notas: str = ""):
        # Lock del budget para evitar carreras (cerrar/comprar en paralelo)
        budget: Budget = (
            Budget.objects.select_for_update()
            .select_related("compra")
            .get(pk=budget_id)
        )

        # Regla: SOLO DRAFT
        if budget.estado != BudgetStatus.DRAFT:
            raise DomainError(
                ErrorCodes.CONFLICT,
                message_override="Solo podés marcar como comprado un presupuesto en estado DRAFT.",
                details={"budget_id": budget.id, "estado_actual": budget.estado},
            )

        # Regla: no debe existir compra
        # (reverse one-to-one: puede no existir; usamos try para no romper)
        try:
            if budget.compra is not None:
                raise DomainError(
                    ErrorCodes.CONFLICT,
                    message_override="Este presupuesto ya tiene una compra asociada.",
                    details={"budget_id": budget.id, "purchase_id": budget.compra.id},
                )
        except Exception:
            # No existe compra, ok
            pass

        # 1) Cerrar
        budget.estado = BudgetStatus.CERRADO
        budget.save(update_fields=["estado", "updated_at"])

        # 2) Crear compra (PurchaseService sigue validando CERRADO)
        return purchase_service.create_purchase_from_budget(
            budget_id=budget_id,
            fecha_compra=fecha_compra,
            notas=notas or "",
        )

    def delete(self, budget_id: int) -> None:
        budget: Budget = self.repo.get(budget_id)

        if budget.estado != BudgetStatus.DRAFT:
            raise DomainError(
                error=ErrorCodes.BUDGET_DELETE_NOT_ALLOWED,
                details={"estado": budget.estado, "budget_id": budget.id},
            )

        if hasattr(budget, "compra"):
            raise DomainError(
                error=ErrorCodes.BUDGET_DELETE_NOT_ALLOWED,
                details={"budget_id": budget.id, "purchase_id": budget.compra.id},
            )

        try:
            self.repo.delete(budget)
        except ProtectedError:
            raise DomainError(
                error=ErrorCodes.BUDGET_DELETE_NOT_ALLOWED,
                details={"budget_id": budget.id},
            )

    def _apply_payload_to_budget(self, *, budget: Budget, payload: Dict[str, Any]) -> None:
        subtotal_maquinas = D("0.00")
        subtotal_accesorios = D("0.00")

        items: List[Dict[str, Any]] = payload.get("items") or []
        if not items:
            raise ValueError("Debe incluir al menos 1 máquina en el presupuesto.")

        for it in items:
            mb: MachineBase = MachineBase.objects.get(pk=it["machine_base_id"])
            cantidad = int(it.get("cantidad") or 1)

            machine_total = _money(_d(it.get("machine_total") or mb.total))
            if machine_total != _money(mb.total):
                mb.total = machine_total
                mb.save(update_fields=["total"])

            item = BudgetItem.objects.create(
                budget=budget,
                machine_base=mb,
                cantidad=cantidad,
                machine_total_snapshot=machine_total,
                subtotal_maquina_snapshot=_money(machine_total * cantidad),
            )
            subtotal_maquinas += item.subtotal_maquina_snapshot

            accesorios: List[Dict[str, Any]] = it.get("accesorios") or []
            for acc in accesorios:
                a: Accessory = Accessory.objects.get(pk=acc["accessory_id"])
                acc_qty = int(acc.get("cantidad") or 1)
                acc_total = _money(_d(acc.get("accessory_total") or a.total))

                if acc_total != _money(a.total):
                    a.total = acc_total
                    a.save(update_fields=["total"])

                bia = BudgetItemAccessory.objects.create(
                    budget_item=item,
                    accessory=a,
                    cantidad=acc_qty,
                    accessory_total_snapshot=acc_total,
                    subtotal_snapshot=_money(acc_total * acc_qty),
                )
                subtotal_accesorios += bia.subtotal_snapshot

        subtotal_log_hasta = D("0.00")
        subtotal_log_post = D("0.00")

        logisticas: List[Dict[str, Any]] = payload.get("logisticas") or []
        for lg in logisticas:
            leg: LogisticsLeg = LogisticsLeg.objects.get(pk=lg["logistics_leg_id"])
            leg_total = _money(_d(lg.get("total") or leg.total))

            if leg_total != _money(leg.total):
                leg.total = leg_total
                leg.save(update_fields=["total"])

            BudgetSelectedLogisticsLeg.objects.create(
                budget=budget,
                logistics_leg=leg,
                total_snapshot=leg_total,
            )

            if leg.etapa == LogisticsStage.HASTA_ADUANA:
                subtotal_log_hasta += leg_total
            else:
                subtotal_log_post += leg_total

        base_imponible = _money(subtotal_maquinas + subtotal_accesorios + subtotal_log_hasta)

        total_impuestos = D("0.00")
        impuestos: List[Dict[str, Any]] = payload.get("impuestos") or []

        if not impuestos:
            impuestos = [
                {"tax_id": t.id, "incluido": True, "porcentaje": str(t.porcentaje)}
                for t in Tax.objects.filter(siempre_incluir=True).order_by("nombre")
            ]

        for tx in impuestos:
            tax: Tax = Tax.objects.get(pk=tx["tax_id"])
            incluido = bool(tx.get("incluido", True))

            # % override (igual que hoy)
            porcentaje = _d(tx.get("porcentaje") or tax.porcentaje)

            porc2 = porcentaje.quantize(D("0.01"), rounding=ROUND_HALF_UP)
            tax_porc2 = tax.porcentaje.quantize(D("0.01"), rounding=ROUND_HALF_UP)
            if porc2 != tax_porc2:
                tax.porcentaje = porc2
                tax.save(update_fields=["porcentaje"])

            # ✅ mínimo override SOLO si el impuesto del catálogo tiene mínimo
            # si el tax no tiene mínimo, ignoramos cualquier monto_minimo que venga
            monto_minimo = None
            if tax.monto_minimo is not None:
                override = tx.get("monto_minimo", None)
                monto_minimo = _money(_d(override)) if override is not None else _money(tax.monto_minimo)

                if override is not None:
                    new_min2 = _money(_d(override))
                    old_min2 = _money(tax.monto_minimo) if tax.monto_minimo is not None else None

                    if old_min2 is None or new_min2 != old_min2:
                        tax.monto_minimo = new_min2
                        tax.save(update_fields=["monto_minimo"])

            monto_pct = _money(base_imponible * (porcentaje / D("100.00")))
            monto_aplicado = monto_pct
            if monto_minimo is not None:
                monto_aplicado = _money(max(monto_pct, monto_minimo))

            BudgetTaxApplied.objects.create(
                budget=budget,
                tax=tax,
                incluido=incluido,
                porcentaje_snapshot=porcentaje,
                monto_minimo_snapshot=monto_minimo,
                monto_aplicado_snapshot=(monto_aplicado if incluido else D("0.00")),
            )

            if incluido:
                total_impuestos += _money(monto_aplicado)

        total_impuestos = _money(total_impuestos)

        costo_aduana = _money(subtotal_log_hasta + total_impuestos)
        total = _money(base_imponible + total_impuestos + subtotal_log_post)

        budget.subtotal_maquinas_snapshot = _money(subtotal_maquinas)
        budget.subtotal_accesorios_snapshot = _money(subtotal_accesorios)
        budget.subtotal_logistica_hasta_aduana_snapshot = _money(subtotal_log_hasta)
        budget.subtotal_logistica_post_aduana_snapshot = _money(subtotal_log_post)
        budget.base_imponible_snapshot = base_imponible
        budget.total_impuestos_snapshot = total_impuestos
        budget.costo_aduana_snapshot = costo_aduana
        budget.total_snapshot = total

        budget.save(update_fields=[
            "subtotal_maquinas_snapshot",
            "subtotal_accesorios_snapshot",
            "subtotal_logistica_hasta_aduana_snapshot",
            "subtotal_logistica_post_aduana_snapshot",
            "base_imponible_snapshot",
            "total_impuestos_snapshot",
            "costo_aduana_snapshot",
            "total_snapshot",
            "updated_at",
        ])

    @transaction.atomic
    def create_from_payload(self, payload: Dict[str, Any]) -> Budget:
        numero = _gen_numero()
        fecha = payload.get("fecha") or date.today()

        budget = Budget.objects.create(numero=numero, fecha=fecha, estado=BudgetStatus.DRAFT)
        self._apply_payload_to_budget(budget=budget, payload=payload)
        return budget

    @transaction.atomic
    def update_from_payload(self, *, budget_id: int, payload: Dict[str, Any]) -> Budget:
        budget = self.repo.get_by_id_for_update(budget_id)

        if budget.estado != BudgetStatus.DRAFT:
            raise DomainError(
                error=ErrorCodes.BUDGET_EDIT_NOT_ALLOWED,
                details={"estado": budget.estado, "budget_id": budget.id},
            )

        if hasattr(budget, "compra"):
            raise DomainError(
                error=ErrorCodes.BUDGET_ALREADY_PURCHASED,
                details={"budget_id": budget.id, "purchase_id": budget.compra.id},
            )

        budget.fecha = payload.get("fecha") or budget.fecha
        budget.save(update_fields=["fecha", "updated_at"])

        budget.items.all().delete()
        budget.logisticas.all().delete()
        budget.impuestos.all().delete()

        self._apply_payload_to_budget(budget=budget, payload=payload)
        return budget
