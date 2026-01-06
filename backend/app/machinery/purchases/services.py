from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from machinery.models import Budget, BudgetStatus, Purchase, PurchasedUnit, UnitStatus, RevenueEvent, RevenueType, \
    RevenueEventUnit, PaymentMethod, RentalTipo, Client, RevenuePayment
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
    def _days_inclusive(start: date, end: date) -> int:
        if end < start:
            return 0
        return (end - start).days + 1

    @staticmethod
    def _weeks_inclusive(start: date, end: date) -> int:
        if end < start:
            return 0
        return ((end - start).days // 7) + 1

    @staticmethod
    def _months_inclusive(start: date, end: date) -> int:
        if end < start:
            return 0
        return (end.year - start.year) * 12 + (end.month - start.month) + 1

    @staticmethod
    def _iter_month_starts(start: date, end: date):
        # retorna date(YYYY,MM,1) desde start.month hasta end.month inclusive
        cur = date(start.year, start.month, 1)
        last = date(end.year, end.month, 1)
        while cur <= last:
            yield cur
            # avanzar 1 mes
            y = cur.year + (1 if cur.month == 12 else 0)
            m = 1 if cur.month == 12 else (cur.month + 1)
            cur = date(y, m, 1)

    @staticmethod
    def _build_payments_schedule(
            *,
            tipo: RevenueType,
            metodo_pago: PaymentMethod,
            fecha_operacion: date | None,
            rental_tipo: RentalTipo | None,
            rental_inicio: date | None,
            rental_fin_estimado: date | None,
            monto_unitario: Decimal | None,
            monto_total_final: Decimal,
            pago_unico: bool,
            payments_override: list[dict] | None,
            cheques_cuotas: int = 1,
    ) -> list[dict]:
        """
        Devuelve una lista de dicts: {monto, metodo_pago, fecha_prevista, descripcion}
        Reglas:
          - Si payments_override viene => se usa tal cual.
          - Si VENTA y no override:
                TRANSFERENCIA/TARJETA => 1 pago en fecha_operacion por monto_total_final
                CHEQUE => si no override, también 1 (pero en UI lo ideal es mandar override con cuotas)
          - Si ALQUILER y no override:
                si pago_unico => 1 pago en rental_inicio por monto_total_final
                si no pago_unico => genera 1 pago por periodo (según rental_tipo) por monto_unitario
        """
        if payments_override:
            return payments_override

        out: list[dict] = []

        if tipo == RevenueType.VENTA:
            f = fecha_operacion or timezone.now().date()

            # Si es CHEQUE y no mandaron payments override: generar N cuotas iguales
            if metodo_pago == PaymentMethod.CHEQUE and cheques_cuotas and cheques_cuotas > 1:
                n = int(cheques_cuotas)
                base = (monto_total_final / Decimal(n)).quantize(Decimal("0.01"))
                # Ajuste por redondeo: la última cuota absorbe la diferencia
                total_base = base * Decimal(n)
                diff = (monto_total_final - total_base).quantize(Decimal("0.01"))

                for i in range(n):
                    fecha = date(f.year + (f.month - 1 + i) // 12, ((f.month - 1 + i) % 12) + 1, min(f.day, 28))
                    monto = base if i < n - 1 else (base + diff)
                    out.append(
                        {
                            "monto": monto,
                            "metodo_pago": metodo_pago,
                            "fecha_prevista": fecha,
                            "descripcion": f"Venta (cheque {i + 1}/{n})",
                        }
                    )
                return out

            # default: 1 pago
            out.append(
                {
                    "monto": monto_total_final,
                    "metodo_pago": metodo_pago,
                    "fecha_prevista": f,
                    "descripcion": "Venta",
                }
            )
            return out

        # ALQUILER
        if not rental_inicio or not rental_fin_estimado or not rental_tipo or monto_unitario is None:
            # por seguridad, no debería pasar (lo valida el serializer)
            out.append(
                {
                    "monto": monto_total_final,
                    "metodo_pago": metodo_pago,
                    "fecha_prevista": timezone.now().date(),
                    "descripcion": "Alquiler",
                }
            )
            return out

        if pago_unico:
            out.append(
                {
                    "monto": monto_total_final,
                    "metodo_pago": metodo_pago,
                    "fecha_prevista": rental_inicio,
                    "descripcion": "Alquiler (pago único)",
                }
            )
            return out

        if rental_tipo == RentalTipo.MENSUAL:
            for d in UnitLifecycleService._iter_month_starts(rental_inicio, rental_fin_estimado):
                out.append(
                    {
                        "monto": monto_unitario,
                        "metodo_pago": metodo_pago,
                        "fecha_prevista": d,
                        "descripcion": "Alquiler mensual",
                    }
                )
            return out

        if rental_tipo == RentalTipo.SEMANAL:
            cur = rental_inicio
            while cur <= rental_fin_estimado:
                out.append(
                    {
                        "monto": monto_unitario,
                        "metodo_pago": metodo_pago,
                        "fecha_prevista": cur,
                        "descripcion": "Alquiler semanal",
                    }
                )
                cur = cur + timedelta(days=7)
            return out

        # DIARIO
        cur = rental_inicio
        while cur <= rental_fin_estimado:
            out.append(
                {
                    "monto": monto_unitario,
                    "metodo_pago": metodo_pago,
                    "fecha_prevista": cur,
                    "descripcion": "Alquiler diario",
                }
            )
            cur = cur + timedelta(days=1)
        return out

    @staticmethod
    @transaction.atomic
    def mark_rented(
        *,
        unit_id: int,
        cliente_id: int,
        rental_tipo: str,
        rental_inicio: date,
        rental_fin_estimado: date,
        monto_unitario: Decimal,
        metodo_pago: str,
        pago_unico: bool = False,
        payments: list[dict] | None = None,
        notas: str = "",
    ) -> PurchasedUnit:
        unit = PurchasedUnit.objects.select_for_update().select_related("machine_base").get(pk=unit_id)

        if unit.estado != UnitStatus.DEPOSITO:
            raise DomainError(
                ErrorCodes.CONFLICT,
                message_override="Solo podés alquilar unidades que estén en DEPÓSITO.",
                details={"unit_id": unit.id, "estado_actual": unit.estado},
            )

        try:
            cliente = Client.objects.get(pk=cliente_id)
        except Client.DoesNotExist:
            raise DomainError(
                ErrorCodes.NOT_FOUND,
                message_override="El cliente indicado no existe o no se indico ningun cliente.",
                details={"cliente_id": cliente_id},
            )


        rt = RentalTipo(rental_tipo)
        mp = PaymentMethod(metodo_pago)

        # total esperado
        if rt == RentalTipo.MENSUAL:
            n = UnitLifecycleService._months_inclusive(rental_inicio, rental_fin_estimado)
        elif rt == RentalTipo.SEMANAL:
            n = UnitLifecycleService._weeks_inclusive(rental_inicio, rental_fin_estimado)
        else:
            n = UnitLifecycleService._days_inclusive(rental_inicio, rental_fin_estimado)

        monto_total_final = (monto_unitario * Decimal(n)).quantize(Decimal("0.01"))

        ev = RevenueEvent.objects.create(
            tipo=RevenueType.ALQUILER,
            cliente=cliente,
            fecha_operacion=None,
            rental_tipo=rt,
            rental_inicio=rental_inicio,
            rental_fin_estimado=rental_fin_estimado,
            rental_fin_real=None,
            monto_unitario=monto_unitario,
            monto_total_final=monto_total_final,
            notas=notas or "",
        )

        RevenueEventUnit.objects.create(revenue_event=ev, purchased_unit=unit)

        schedule = UnitLifecycleService._build_payments_schedule(
            tipo=RevenueType.ALQUILER,
            metodo_pago=mp,
            fecha_operacion=None,
            rental_tipo=rt,
            rental_inicio=rental_inicio,
            rental_fin_estimado=rental_fin_estimado,
            monto_unitario=monto_unitario,
            monto_total_final=monto_total_final,
            pago_unico=pago_unico,
            payments_override=payments,
        )

        for p in schedule:
            RevenuePayment.objects.create(
                revenue_event=ev,
                monto=p["monto"],
                metodo_pago=p["metodo_pago"],
                fecha_prevista=p["fecha_prevista"],
                cobrado=False,
                fecha_cobro_real=None,
                descripcion=p.get("descripcion") or "",
            )

        unit.estado = UnitStatus.ALQUILADA
        unit.save(update_fields=["estado"])
        return unit

    @staticmethod
    @transaction.atomic
    def finish_rental(*, unit_id: int, rental_fin_real: date) -> PurchasedUnit:
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
                revenue_event__rental_fin_real__isnull=True,
            )
            .order_by("-revenue_event__rental_inicio", "-revenue_event__created_at")
            .first()
        )

        if not rel:
            raise DomainError(
                ErrorCodes.NOT_FOUND,
                message_override="No se encontró un alquiler activo para esta unidad.",
                details={"unit_id": unit.id},
            )

        ev = rel.revenue_event
        ev.rental_fin_real = rental_fin_real

        # recalcular total_final por periodo real (NO tocamos payments todavía; queda para etapa 2)
        rt = ev.rental_tipo
        inicio = ev.rental_inicio
        mu = ev.monto_unitario or Decimal("0.00")

        if rt and inicio:
            if rt == RentalTipo.MENSUAL:
                n = UnitLifecycleService._months_inclusive(inicio, rental_fin_real)
            elif rt == RentalTipo.SEMANAL:
                n = UnitLifecycleService._weeks_inclusive(inicio, rental_fin_real)
            else:
                n = UnitLifecycleService._days_inclusive(inicio, rental_fin_real)
            ev.monto_total_final = (mu * Decimal(n)).quantize(Decimal("0.01"))

        ev.save(update_fields=["rental_fin_real", "monto_total_final"])

        unit.estado = UnitStatus.DEPOSITO
        unit.save(update_fields=["estado"])
        return unit

    @staticmethod
    @transaction.atomic
    def mark_sold(
        *,
        unit_id: int,
        cliente_id: int,
        fecha_operacion: date,
        monto_total_final: Decimal,
        metodo_pago: str,
        cheques_cuotas: int = 1,
        payments: list[dict] | None = None,
        notas: str = "",
    ) -> PurchasedUnit:
        unit = PurchasedUnit.objects.select_for_update().get(pk=unit_id)

        if unit.estado != UnitStatus.DEPOSITO:
            raise DomainError(
                ErrorCodes.CONFLICT,
                message_override="Solo podés vender unidades que estén en DEPÓSITO.",
                details={"unit_id": unit.id, "estado_actual": unit.estado},
            )

        try:
            cliente = Client.objects.get(pk=cliente_id)
        except Client.DoesNotExist:
            raise DomainError(
                ErrorCodes.NOT_FOUND,
                message_override="El cliente indicado no existe o no se indico ningun cliente.",
                details={"cliente_id": cliente_id},
            )

        mp = PaymentMethod(metodo_pago)

        ev = RevenueEvent.objects.create(
            tipo=RevenueType.VENTA,
            cliente=cliente,
            fecha_operacion=fecha_operacion,
            rental_tipo=None,
            rental_inicio=None,
            rental_fin_estimado=None,
            rental_fin_real=None,
            monto_unitario=None,
            monto_total_final=monto_total_final,
            notas=notas or "",
        )
        RevenueEventUnit.objects.create(revenue_event=ev, purchased_unit=unit)

        schedule = UnitLifecycleService._build_payments_schedule(
            tipo=RevenueType.VENTA,
            metodo_pago=mp,
            fecha_operacion=fecha_operacion,
            rental_tipo=None,
            rental_inicio=None,
            rental_fin_estimado=None,
            monto_unitario=None,
            monto_total_final=monto_total_final,
            pago_unico=True,
            payments_override=payments,
            cheques_cuotas=int(cheques_cuotas or 1),
        )

        for p in schedule:
            RevenuePayment.objects.create(
                revenue_event=ev,
                monto=p["monto"],
                metodo_pago=p["metodo_pago"],
                fecha_prevista=p["fecha_prevista"],
                cobrado=False,
                fecha_cobro_real=None,
                descripcion=p.get("descripcion") or "",
            )

        unit.estado = UnitStatus.VENDIDA
        unit.save(update_fields=["estado"])
        return unit

