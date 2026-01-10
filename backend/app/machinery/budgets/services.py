from __future__ import annotations
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List

from django.db import transaction, IntegrityError
from django.db.models.deletion import ProtectedError
from django.utils import timezone

from machinery.models import (
    Budget,
    BudgetItem,
    BudgetItemAccessory,
    BudgetPreTaxChargeApplied,
    BudgetTaxApplied,
    BudgetAdditionalChargeApplied,
    BudgetSelectedLogisticsLeg,
    BudgetStatus,
    MachineBase,
    Accessory,
    Tax,
    LogisticsLeg,
    LogisticsStage,
    Client,
    PreTaxCharge,
    AdditionalCharge
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
    return f"PRESU-{now:%Y%m%d-%H%M}"


@dataclass
class BudgetService:
    repo: BudgetRepository

    def list_qs(self):
        return (
            self.repo.list_qs()
            .select_related("cliente")
            .prefetch_related(
                "items",
                "items__machine_base",
                "items__accesorios",
                "items__accesorios__accessory",
                "pretax_charges",
                "pretax_charges__pre_tax_charge",
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
            Budget.objects.select_related("compra")
            .select_for_update(of=("self",))
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
        if "cliente_id" in payload:
            cid = payload.get("cliente_id", None)
            budget.cliente = Client.objects.get(pk=cid) if cid else None
            budget.save(update_fields=["cliente", "updated_at"])

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

        base_pre_impuestos = _money(subtotal_maquinas + subtotal_accesorios + subtotal_log_hasta)

        # -------------------------
        # PreTax charges (sobre base_pre_impuestos)
        # -------------------------
        total_pretax = D("0.00")
        pretax: List[Dict[str, Any]] = payload.get("pretax_charges") or []

        if not pretax:
            pretax = [
                {"pre_tax_charge_id": p.id, "incluido": True, "porcentaje": str(p.porcentaje)}
                for p in PreTaxCharge.objects.filter(siempre_incluir=True).order_by("nombre")
            ]

        for ptx in pretax:
            p: PreTaxCharge = PreTaxCharge.objects.get(pk=ptx["pre_tax_charge_id"])
            incluido = bool(ptx.get("incluido", True))

            porcentaje = _d(ptx.get("porcentaje") or p.porcentaje)
            porc2 = porcentaje.quantize(D("0.01"), rounding=ROUND_HALF_UP)
            cat2 = p.porcentaje.quantize(D("0.01"), rounding=ROUND_HALF_UP)
            if porc2 != cat2:
                p.porcentaje = porc2
                p.save(update_fields=["porcentaje"])

            monto_pct = _money(base_pre_impuestos * (porcentaje / D("100.00")))
            monto_aplicado = monto_pct

            BudgetPreTaxChargeApplied.objects.create(
                budget=budget,
                pre_tax_charge=p,
                incluido=incluido,
                porcentaje_snapshot=porcentaje,
                monto_aplicado_snapshot=(monto_aplicado if incluido else D("0.00")),
            )

            if incluido:
                total_pretax += _money(monto_aplicado)

        total_pretax = _money(total_pretax)

        # ahora sí: base imponible final (para impuestos)
        base_imponible = _money(base_pre_impuestos + total_pretax)

        # -------------------------
        # Impuestos (sobre base_imponible)
        # -------------------------
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

            porcentaje = _d(tx.get("porcentaje") or tax.porcentaje)

            porc2 = porcentaje.quantize(D("0.01"), rounding=ROUND_HALF_UP)
            tax_porc2 = tax.porcentaje.quantize(D("0.01"), rounding=ROUND_HALF_UP)
            if porc2 != tax_porc2:
                tax.porcentaje = porc2
                tax.save(update_fields=["porcentaje"])

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

        # -------------------------
        # Additional charges (sobre subtotal_maquinas + subtotal_accesorios)
        # NO afecta base imponible, solo total final.
        # -------------------------
        base_items = _money(subtotal_maquinas + subtotal_accesorios)

        total_additional = D("0.00")
        additional_charges: List[Dict[str, Any]] = payload.get("additional_charges") or []

        if not additional_charges:
            additional_charges = [
                {
                    "additional_charge_id": c.id,
                    "incluido": True,
                    "porcentaje": str(c.porcentaje),
                    "monto_minimo": (str(c.monto_minimo) if c.monto_minimo is not None else None),
                }
                for c in AdditionalCharge.objects.filter(siempre_incluir=True).order_by("nombre")
            ]

        for ch in additional_charges:
            c: AdditionalCharge = AdditionalCharge.objects.get(pk=ch["additional_charge_id"])
            incluido = bool(ch.get("incluido", True))

            porcentaje = _d(ch.get("porcentaje") or c.porcentaje)
            monto_minimo = _d(ch.get("monto_minimo")) if ch.get("monto_minimo", None) is not None else (
                _money(c.monto_minimo) if c.monto_minimo is not None else None
            )

            # persistimos override en catálogo (igual que impuestos)
            if ch.get("porcentaje", None) is not None:
                new_pct = _money(_d(ch.get("porcentaje")))
                if _money(c.porcentaje) != new_pct:
                    c.porcentaje = new_pct
                    c.save(update_fields=["porcentaje"])

            if ch.get("monto_minimo", None) is not None:
                new_min = _money(_d(ch.get("monto_minimo")))
                old_min = _money(c.monto_minimo) if c.monto_minimo is not None else None
                if old_min is None or new_min != old_min:
                    c.monto_minimo = new_min
                    c.save(update_fields=["monto_minimo"])

            monto_pct = _money(base_items * (porcentaje / D("100.00")))
            monto_aplicado = monto_pct
            if monto_minimo is not None:
                monto_aplicado = _money(max(monto_pct, monto_minimo))

            BudgetAdditionalChargeApplied.objects.create(
                budget=budget,
                additional_charge=c,
                incluido=incluido,
                porcentaje_snapshot=porcentaje,
                monto_minimo_snapshot=monto_minimo,
                monto_aplicado_snapshot=(monto_aplicado if incluido else D("0.00")),
            )

            if incluido:
                total_additional += _money(monto_aplicado)

        total_additional = _money(total_additional)


        total = _money(base_imponible + total_impuestos + subtotal_log_post + total_additional)

        budget.subtotal_maquinas_snapshot = _money(subtotal_maquinas)
        budget.subtotal_accesorios_snapshot = _money(subtotal_accesorios)
        budget.subtotal_logistica_hasta_aduana_snapshot = _money(subtotal_log_hasta)
        budget.subtotal_logistica_post_aduana_snapshot = _money(subtotal_log_post)
        budget.base_pre_impuestos_snapshot = base_pre_impuestos
        budget.total_pretax_charges_snapshot = total_pretax
        budget.base_imponible_snapshot = base_imponible
        budget.total_impuestos_snapshot = total_impuestos
        budget.costo_aduana_snapshot = costo_aduana
        budget.total_additional_charges_snapshot = total_additional
        budget.total_snapshot = total

        budget.save(update_fields=[
            "subtotal_maquinas_snapshot",
            "subtotal_accesorios_snapshot",
            "subtotal_logistica_hasta_aduana_snapshot",
            "subtotal_logistica_post_aduana_snapshot",
            "base_pre_impuestos_snapshot",
            "total_pretax_charges_snapshot",
            "base_imponible_snapshot",
            "total_impuestos_snapshot",
            "total_additional_charges_snapshot",
            "costo_aduana_snapshot",
            "total_snapshot",
            "updated_at",
        ])

    @transaction.atomic
    def create_from_payload(self, payload: Dict[str, Any]) -> Budget:
        numero_in = payload.get("numero")
        numero = (str(numero_in).strip() if numero_in is not None else "")
        if not numero:
            numero = _gen_numero()

        fecha = payload.get("fecha") or date.today()

        try:
            budget = Budget.objects.create(numero=numero, fecha=fecha, estado=BudgetStatus.DRAFT)
        except IntegrityError:
            raise DomainError(
                error=ErrorCodes.BUDGET_NUMERO_ALREADY_EXISTS,
                details={"numero": numero},
            )

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

        # numero: si viene en payload, lo respetamos; si viene vacío, generamos uno nuevo
        numero_in = payload.get("numero", None)
        update_fields = ["fecha", "updated_at"]

        if numero_in is not None:
            numero_new = str(numero_in).strip()
            if not numero_new:
                numero_new = _gen_numero()
            budget.numero = numero_new
            update_fields.append("numero")

        budget.fecha = payload.get("fecha") or budget.fecha

        try:
            budget.save(update_fields=update_fields)
        except IntegrityError:
            raise DomainError(
                error=ErrorCodes.BUDGET_NUMERO_ALREADY_EXISTS,
                details={"numero": budget.numero},
            )

        budget.items.all().delete()
        budget.logisticas.all().delete()
        budget.pretax_charges.all().delete()
        budget.impuestos.all().delete()
        budget.additional_charges.all().delete()

        self._apply_payload_to_budget(budget=budget, payload=payload)
        return budget
