from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import uuid4
import random

from django.db import transaction
from django.utils import timezone

from machinery.models import (
    Budget,
    BudgetItem,
    BudgetItemAccessory,
    BudgetPreTaxChargeApplied,
    BudgetAdditionalChargeApplied,
    BudgetTaxApplied,
    BudgetSelectedLogisticsLeg,
    Purchase,
    PurchasedUnit,
    RevenueEvent,
    RevenueEventUnit,
    RevenuePayment,
    UnitStatus,
)
from machinery.models.catalog import (
    MachineBase,
    Accessory,
    Tax,
    PreTaxCharge,
    Client,
    AdditionalCharge,
    LogisticsLeg,
    LogisticsStage,
)
from machinery.budgets.repositories import BudgetRepository
from machinery.budgets.services import BudgetService
from machinery.purchases.services import PurchaseService, UnitLifecycleService
from machinery.models.revenue import PaymentMethod, RentalTipo


@dataclass(frozen=True)
class DemoSeedResult:
    budgets: int
    purchases: int
    units: int
    revenue_events: int
    revenue_payments: int


def _add_months(d: date, months: int) -> date:
    y = d.year + ((d.month - 1 + months) // 12)
    m = ((d.month - 1 + months) % 12) + 1
    return date(y, m, 1)


def _month_starts(months_back: int = 6) -> List[date]:
    today = timezone.now().date()
    cur = date(today.year, today.month, 1)
    return [_add_months(cur, -i) for i in range(months_back - 1, -1, -1)]


def _money(v: Decimal) -> Decimal:
    return v.quantize(Decimal("0.01"))


@transaction.atomic
def clear_demo_data() -> None:
    """
    Borra TODO lo generado por la demo (presupuestos, compras, unidades, ventas/alquileres).
    Orden por FK/PROTECT.
    """
    RevenueEventUnit.objects.all().delete()
    RevenuePayment.objects.all().delete()
    RevenueEvent.objects.all().delete()

    PurchasedUnit.objects.all().delete()
    Purchase.objects.all().delete()

    BudgetSelectedLogisticsLeg.objects.all().delete()
    BudgetTaxApplied.objects.all().delete()
    BudgetPreTaxChargeApplied.objects.all().delete()
    BudgetAdditionalChargeApplied.objects.all().delete()
    BudgetItemAccessory.objects.all().delete()
    BudgetItem.objects.all().delete()
    Budget.objects.all().delete()



@transaction.atomic
def apply_demo_seed(*, months_back: int = 6, clear_first: bool = True) -> DemoSeedResult:
    # -----------------------------
    # Config DEMO (más chico, con más sentido)
    # -----------------------------
    BUDGETS_PER_MONTH = 4          # 6*4 = 24 presupuestos aprox
    CLOSE_RATE = Decimal("0.65")   # ~65% se compra -> genera unidades
    QTY_OPTIONS = [1, 1, 2]        # sesgo a 1, a veces 2
    MAX_ACCESSORIES = 2

    if clear_first:
        clear_demo_data()

    budget_service = BudgetService(repo=BudgetRepository())
    purchase_service = PurchaseService()

    machines = list(MachineBase.objects.all().order_by("id"))
    accessories = list(Accessory.objects.all().order_by("id"))
    taxes = list(Tax.objects.all().order_by("id"))
    pretax = list(PreTaxCharge.objects.all().order_by("id"))
    additional = list(AdditionalCharge.objects.all().order_by("id"))
    clients = list(Client.objects.all().order_by("id"))
    legs_hasta = list(LogisticsLeg.objects.filter(etapa=LogisticsStage.HASTA_ADUANA).order_by("id"))
    legs_post = list(LogisticsLeg.objects.filter(etapa=LogisticsStage.POST_ADUANA).order_by("id"))

    if not machines or not taxes or not legs_hasta or not legs_post or not clients:
        return DemoSeedResult(budgets=0, purchases=0, units=0, revenue_events=0, revenue_payments=0)

    month_starts = _month_starts(months_back)
    today = timezone.now().date()

    def _pick_client() -> Client:
        return random.choice(clients)

    def _pick_payment_method() -> str:
        return random.choice([PaymentMethod.TRANSFERENCIA, PaymentMethod.TARJETA_CREDITO, PaymentMethod.CHEQUE])

    def _unit_cost(unit: PurchasedUnit) -> Decimal:
        # derive del budget asociado
        if getattr(unit, "purchase", None) and getattr(unit.purchase, "budget", None):
            b = unit.purchase.budget
            if getattr(b, "total_snapshot", None) is not None:
                return _money(Decimal(str(b.total_snapshot)))
        return Decimal("10000.00")

    def _venta_price(unit: PurchasedUnit) -> Decimal:
        base = _unit_cost(unit)
        margen = Decimal(str(random.randint(18, 32))) / Decimal("100")
        return _money(base * (Decimal("1.0") + margen))

    def _rental_unit_price(unit: PurchasedUnit) -> Decimal:
        base = _unit_cost(unit)
        pct = Decimal(str(random.randint(3, 6))) / Decimal("100")
        return _money(base * pct)

    def _mark_some_payments_as_paid() -> None:
        """
        Marca como cobrados pagos con fecha_prevista en el pasado (mix realista).
        """
        qs = RevenuePayment.objects.select_related("revenue_event").all().order_by("id")
        for p in qs:
            if p.fecha_prevista >= today:
                continue
            # 70% de probabilidad de estar cobrado si ya venció
            if random.random() < 0.70:
                delta = random.randint(0, 10)
                cobro = min(today, p.fecha_prevista + timedelta(days=delta))
                p.cobrado = True
                p.fecha_cobro_real = cobro
                p.save(update_fields=["cobrado", "fecha_cobro_real", "updated_at"])

    # -----------------------------
    # 1) Budgets (con numero GUID)
    # -----------------------------
    created: List[Budget] = []

    for ms in month_starts:
        for _ in range(BUDGETS_PER_MONTH):
            fecha = date(ms.year, ms.month, random.randint(1, 28))
            mb = random.choice(machines)
            qty = random.choice(QTY_OPTIONS)

            accs = random.sample(accessories, k=random.randint(0, min(MAX_ACCESSORIES, len(accessories))))
            acc_payload = [{"accessory_id": a.id, "cantidad": 1} for a in accs]

            lg1 = random.choice(legs_hasta)
            lg2 = random.choice(legs_post)

            # taxes: siempre incluir los "siempre_incluir", y 0..1 extra
            impuestos_payload = []
            for t in taxes:
                if t.siempre_incluir:
                    impuestos_payload.append({"tax_id": t.id, "incluido": True, "porcentaje": str(t.porcentaje)})

            extras = [t for t in taxes if not t.siempre_incluir]
            if extras and random.random() < 0.50:
                pick = random.choice(extras)
                impuestos_payload.append(
                    {"tax_id": pick.id, "incluido": random.choice([True, False]), "porcentaje": str(pick.porcentaje)}
                )

            # pretax: si no mandás, el service agrega los siempre_incluir, pero lo mandamos igual para testear UI
            pretax_payload = []
            for p in pretax:
                if p.siempre_incluir:
                    pretax_payload.append({"pre_tax_charge_id": p.id, "incluido": True, "porcentaje": str(p.porcentaje)})

            if pretax and random.random() < 0.40:
                opt = random.choice([p for p in pretax if not p.siempre_incluir] or pretax)
                pretax_payload.append({"pre_tax_charge_id": opt.id, "incluido": True, "porcentaje": str(opt.porcentaje)})

            c = _pick_client()

            # additional charges: incluir los "siempre_incluir" y a veces 1 extra
            additional_payload = []
            for a in additional:
                if a.siempre_incluir:
                    additional_payload.append(
                        {
                            "additional_charge_id": a.id,
                            "incluido": True,
                            "porcentaje": str(a.porcentaje),
                            "monto_minimo": str(a.monto_minimo) if a.monto_minimo is not None else None,
                        }
                    )

            extras_add = [a for a in additional if not a.siempre_incluir]
            if extras_add and random.random() < 0.45:
                pick = random.choice(extras_add)
                additional_payload.append(
                    {
                        "additional_charge_id": pick.id,
                        "incluido": True,
                        "porcentaje": str(pick.porcentaje),
                        "monto_minimo": str(pick.monto_minimo) if pick.monto_minimo is not None else None,
                    }
                )

            # a veces “simula override” del presupuesto para testear que persista en catálogo
            if additional_payload and random.random() < 0.35:
                pick = random.choice(additional_payload)
                # variar porcentaje entre 3.5% y 6.5%
                pick["porcentaje"] = str(Decimal(str(random.randint(35, 65))) / Decimal("10"))

            payload = {
                "numero": str(uuid4()),  # ✅ GUID único
                "fecha": fecha,
                "cliente_id": c.id,
                "items": [
                    {
                        "machine_base_id": mb.id,
                        "cantidad": qty,
                        "accesorios": acc_payload,
                    }
                ],
                "logisticas": [{"logistics_leg_id": lg1.id}, {"logistics_leg_id": lg2.id}],
                "pretax_charges": pretax_payload,
                "impuestos": impuestos_payload,
                "additional_charges": additional_payload,
            }

            b = budget_service.create_from_payload(payload)
            created.append(b)

    # -----------------------------
    # 2) Comprar un % (genera unidades)
    # -----------------------------
    target = int(round(len(created) * float(CLOSE_RATE)))
    to_buy = random.sample(created, k=target) if target > 0 else []

    for b in to_buy:
        fecha_compra = date(b.fecha.year, b.fecha.month, random.randint(1, 28)).isoformat()
        budget_service.purchase_from_draft(
            purchase_service=purchase_service,
            budget_id=b.id,
            fecha_compra=fecha_compra,
            notas="Compra demo",
        )

    # -----------------------------
    # 3) Lifecycle: alquileres + ventas + pagos
    # -----------------------------
    units = list(PurchasedUnit.objects.select_related("purchase", "purchase__budget").order_by("id"))
    random.shuffle(units)

    for u in units:
        if u.estado != UnitStatus.DEPOSITO:
            continue

        roll = random.random()
        cliente = _pick_client()
        metodo = _pick_payment_method()

        # 20% venta directa
        if roll < 0.20:
            # fecha de operación cercano a compra/presupuesto
            base_date = u.purchase.budget.fecha if u.purchase and u.purchase.budget else today
            fecha_venta = min(today, base_date + timedelta(days=random.randint(2, 35)))

            cheques_cuotas = 1
            if metodo == PaymentMethod.CHEQUE and random.random() < 0.60:
                cheques_cuotas = random.choice([2, 3, 4])

            UnitLifecycleService.mark_sold(
                unit_id=u.id,
                cliente_id=cliente.id,
                fecha_operacion=fecha_venta,
                monto_total_final=_venta_price(u),
                metodo_pago=str(metodo),
                cheques_cuotas=cheques_cuotas,
                payments=None,
                notas="Venta demo",
            )
            continue

        # 55% alquiler mensual (algunos finalizados y el último a veces activo)
        if roll < 0.75:
            # armar rango dentro de los últimos 6 meses
            start_ms = random.choice(month_starts[:-1] or month_starts)
            meses = random.choice([1, 2, 3])

            rental_inicio = date(start_ms.year, start_ms.month, 1)
            end_ms = _add_months(rental_inicio, meses - 1)
            rental_fin_estimado = date(end_ms.year, end_ms.month, 28)

            UnitLifecycleService.mark_rented(
                unit_id=u.id,
                cliente_id=cliente.id,
                rental_tipo=str(RentalTipo.MENSUAL),
                rental_inicio=rental_inicio,
                rental_fin_estimado=rental_fin_estimado,
                monto_unitario=_rental_unit_price(u),
                metodo_pago=str(metodo),
                pago_unico=False,
                payments=None,
                notas="Alquiler demo",
            )

            # si terminó en el pasado, lo cerramos
            if rental_fin_estimado < today and random.random() < 0.80:
                UnitLifecycleService.finish_rental(unit_id=u.id, rental_fin_real=rental_fin_estimado)
            continue

        # 25% alquiler + luego venta
        start_ms = random.choice(month_starts[:-2] or month_starts)
        rental_inicio = date(start_ms.year, start_ms.month, 1)
        rental_fin_estimado = date(_add_months(rental_inicio, 1).year, _add_months(rental_inicio, 1).month, 28)

        UnitLifecycleService.mark_rented(
            unit_id=u.id,
            cliente_id=cliente.id,
            rental_tipo=str(RentalTipo.MENSUAL),
            rental_inicio=rental_inicio,
            rental_fin_estimado=rental_fin_estimado,
            monto_unitario=_rental_unit_price(u),
            metodo_pago=str(metodo),
            pago_unico=False,
            payments=None,
            notas="Alquiler demo (previo a venta)",
        )
        if rental_fin_estimado < today:
            UnitLifecycleService.finish_rental(unit_id=u.id, rental_fin_real=rental_fin_estimado)

        fecha_venta = min(today, rental_fin_estimado + timedelta(days=random.randint(2, 20)))
        UnitLifecycleService.mark_sold(
            unit_id=u.id,
            cliente_id=cliente.id,
            fecha_operacion=fecha_venta,
            monto_total_final=_venta_price(u),
            metodo_pago=str(metodo),
            cheques_cuotas=(random.choice([2, 3]) if metodo == PaymentMethod.CHEQUE else 1),
            payments=None,
            notas="Venta demo luego de alquiler",
        )

    # Marcar pagos cobrados vs pendientes
    _mark_some_payments_as_paid()

    return DemoSeedResult(
        budgets=Budget.objects.count(),
        purchases=Purchase.objects.count(),
        units=PurchasedUnit.objects.count(),
        revenue_events=RevenueEvent.objects.count(),
        revenue_payments=RevenuePayment.objects.count(),
    )
