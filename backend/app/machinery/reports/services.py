from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum

from machinery.models import Purchase, RevenuePayment


@dataclass(frozen=True)
class FinanceTotals:
    ingresos: Decimal
    egresos: Decimal
    ganancia: Decimal


@dataclass(frozen=True)
class FinanceDayRow:
    fecha: date
    ingresos: Decimal
    egresos: Decimal
    ganancia: Decimal


@dataclass(frozen=True)
class FinanceReport:
    desde: date
    hasta: date
    totales: FinanceTotals
    serie_diaria: list[FinanceDayRow]


class FinanceReportService:
    """
    Reglas:
    - Ingresos: RevenuePayment.cobrado=True y se contabiliza por RevenuePayment.fecha_cobro_real
      (es la fecha que cuenta para este reporte).
    - Egresos: Purchase.total_snapshot por Purchase.fecha_compra
    """

    @staticmethod
    def build(*, desde: date, hasta: date) -> FinanceReport:
        if hasta < desde:
            raise ValueError("hasta debe ser >= desde")

        ingresos_por_dia: dict[date, Decimal] = defaultdict(lambda: Decimal("0"))
        egresos_por_dia: dict[date, Decimal] = defaultdict(lambda: Decimal("0"))

        # --- Ingresos: pagos cobrados (por fecha_cobro_real)
        pagos_cobrados = (
            RevenuePayment.objects.filter(
                cobrado=True,
                fecha_cobro_real__gte=desde,
                fecha_cobro_real__lte=hasta,
            )
            .values("fecha_cobro_real")
            .annotate(total=Sum("monto"))
        )
        for r in pagos_cobrados:
            ingresos_por_dia[r["fecha_cobro_real"]] += r["total"] or Decimal("0")

        # --- Egresos: compras (por fecha_compra)
        compras = (
            Purchase.objects.filter(fecha_compra__gte=desde, fecha_compra__lte=hasta)
            .values("fecha_compra")
            .annotate(total=Sum("total_snapshot"))
        )
        for r in compras:
            egresos_por_dia[r["fecha_compra"]] += r["total"] or Decimal("0")

        # Serie diaria completa
        serie: list[FinanceDayRow] = []
        total_ing = Decimal("0")
        total_egr = Decimal("0")

        d = desde
        while d <= hasta:
            ing = ingresos_por_dia[d]
            egr = egresos_por_dia[d]
            gan = ing - egr

            total_ing += ing
            total_egr += egr
            serie.append(FinanceDayRow(fecha=d, ingresos=ing, egresos=egr, ganancia=gan))
            d = d + timedelta(days=1)

        totales = FinanceTotals(
            ingresos=total_ing,
            egresos=total_egr,
            ganancia=(total_ing - total_egr),
        )

        return FinanceReport(desde=desde, hasta=hasta, totales=totales, serie_diaria=serie)
