from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum

from machinery.models import Purchase, RevenueEvent, RevenueType


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
    - Ingresos por VENTA: RevenueEvent.tipo=VENTA y se contabiliza en RevenueEvent.fecha
    - Ingresos por ALQUILER: RevenueEvent.tipo=ALQUILER pero solo cuando fecha_retorno_real != null,
      y se contabiliza en fecha_retorno_real (cuando efectivamente se cobra).
    - Egresos: Purchase.total_snapshot por Purchase.fecha_compra
    """

    @staticmethod
    def build(*, desde: date, hasta: date) -> FinanceReport:
        if hasta < desde:
            raise ValueError("hasta debe ser >= desde")

        ingresos_por_dia: dict[date, Decimal] = defaultdict(lambda: Decimal("0"))
        egresos_por_dia: dict[date, Decimal] = defaultdict(lambda: Decimal("0"))

        # --- Ventas (por fecha)
        ventas = (
            RevenueEvent.objects.filter(tipo=RevenueType.VENTA, fecha__gte=desde, fecha__lte=hasta)
            .values("fecha")
            .annotate(total=Sum("monto_total"))
        )
        for r in ventas:
            ingresos_por_dia[r["fecha"]] += r["total"] or Decimal("0")

        # --- Alquileres cobrados (por retorno real)
        alquileres_cobrados = (
            RevenueEvent.objects.filter(
                tipo=RevenueType.ALQUILER,
                fecha_retorno_real__isnull=False,
                fecha_retorno_real__gte=desde,
                fecha_retorno_real__lte=hasta,
            )
            .values("fecha_retorno_real")
            .annotate(total=Sum("monto_total"))
        )
        for r in alquileres_cobrados:
            ingresos_por_dia[r["fecha_retorno_real"]] += r["total"] or Decimal("0")

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
