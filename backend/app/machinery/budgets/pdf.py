from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO
from typing import List, Optional

from reportlab.lib import pagesizes, colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from machinery.models import Budget

D = Decimal


def _money(x: Optional[Decimal]) -> Decimal:
    return (x or D("0.00")).quantize(D("0.01"), rounding=ROUND_HALF_UP)


def _pct(x: Optional[Decimal]) -> Decimal:
    return (x or D("0.00")).quantize(D("0.01"), rounding=ROUND_HALF_UP)


def _fmt_usd(x: Decimal) -> str:
    v = _money(x)
    s = f"{v:,.2f}"
    return f"USD {s}"


def _fmt_pct(x: Decimal) -> str:
    return f"{_pct(x)}%"


@dataclass(frozen=True)
class MachineLine:
    titulo: str
    cantidad: int
    costo_linea: Decimal  # costo interno (maquina + accesorios), para share
    subtotal_cliente: Decimal  # subtotal cliente (inflado, distribuido)


@dataclass(frozen=True)
class TaxLine:
    titulo: str
    porcentaje: Decimal
    subtotal: Decimal


def build_budget_pdf_bytes(*, budget: Budget, rentabilidad_pct: Decimal) -> bytes:
    """
    PDF cliente:
    - Tabla única: filas de máquinas e impuestos, y una fila final TOTAL.
    - NO muestra rentabilidad aplicada ni base imponible.
    - Máquinas: se distribuye el "monto cliente base imponible" proporcional al costo interno (máquina + accesorios),
      y de ahí sale el precio unitario y subtotal por máquina.
    - Impuestos: solo incluidos y con tax.se_imprime_en_presupuesto=True; se calcula con porcentaje_snapshot
      (snapshoteado) aplicado sobre base imponible cliente (no se imprime), respetando monto_minimo_snapshot (snapshoteado).
    - TOTAL: total_snapshot * (1 + rentabilidad_pct/100).
    """

    rentabilidad_pct = _pct(rentabilidad_pct)
    factor = D("1.00") + (rentabilidad_pct / D("100.00"))

    # Prefetch esperado (igual funciona aunque no venga prefetch)
    items = list(budget.items.all())
    for it in items:
        _ = list(it.accesorios.all())

    # --- 1) Armar costo interno por línea para obtener shares
    subtotal_cost = D("0.00")
    internal_costs: List[Decimal] = []

    for it in items:
        accs = list(it.accesorios.all())
        costo_linea = _money(
            (it.subtotal_maquina_snapshot or D("0.00"))
            + sum((a.subtotal_snapshot or D("0.00")) for a in accs)
        )
        internal_costs.append(costo_linea)
        subtotal_cost += costo_linea

    # Base imponible cliente (NO se imprime) sobre la que se calculan impuestos y se distribuye a máquinas
    base_imponible_cliente = _money((budget.base_imponible_snapshot or D("0.00")) * factor)

    # --- 2) Distribuir base imponible cliente proporcional a costo interno
    machine_lines: List[MachineLine] = []
    running_alloc = D("0.00")

    for idx, it in enumerate(items):
        accs = list(it.accesorios.all())
        accesorios_txt = "; ".join([f"{a.accessory.nombre} x {a.cantidad}" for a in accs])
        if accesorios_txt:
            titulo = f"{it.machine_base.nombre} ({accesorios_txt})"
        else:
            titulo = f"{it.machine_base.nombre}"

        cantidad = int(it.cantidad)

        costo_linea = internal_costs[idx]
        if subtotal_cost > D("0.00"):
            share = (costo_linea / subtotal_cost).quantize(D("0.0000001"), rounding=ROUND_HALF_UP)
        else:
            share = (D("1.00") / D(str(max(len(items), 1)))).quantize(D("0.0000001"), rounding=ROUND_HALF_UP)

        alloc = _money(base_imponible_cliente * share)
        running_alloc += alloc

        machine_lines.append(
            MachineLine(
                titulo=titulo,
                cantidad=cantidad,
                costo_linea=costo_linea,
                subtotal_cliente=alloc,
            )
        )

    # Ajuste por redondeo al último
    if machine_lines:
        diff = _money(base_imponible_cliente - running_alloc)
        if diff != D("0.00"):
            last = machine_lines[-1]
            machine_lines[-1] = MachineLine(
                titulo=last.titulo,
                cantidad=last.cantidad,
                costo_linea=last.costo_linea,
                subtotal_cliente=_money(last.subtotal_cliente + diff),
            )

    # --- 3) Impuestos imprimibles
    tax_lines: List[TaxLine] = []
    total_impuestos = D("0.00")

    for ta in budget.impuestos.select_related("tax").all():
        if not ta.incluido:
            continue
        if not getattr(ta.tax, "se_imprime_en_presupuesto", False):
            continue

        pct = _pct(ta.porcentaje_snapshot)
        monto_pct = _money(base_imponible_cliente * (pct / D("100.00")))
        monto = monto_pct

        if ta.monto_minimo_snapshot is not None:
            minimo = _money(_money(ta.monto_minimo_snapshot) * factor)
            if minimo > monto:
                monto = minimo

        monto = _money(monto)
        total_impuestos += monto
        tax_lines.append(TaxLine(titulo=ta.tax.nombre, porcentaje=pct, subtotal=monto))

    total_impuestos = _money(total_impuestos)

    # --- 4) TOTAL: suma de subtotales mostrados (máquinas + impuestos)
    total_cliente = _money(
        sum((ml.subtotal_cliente for ml in machine_lines), D("0.00"))
        + sum((tl.subtotal for tl in tax_lines), D("0.00"))
    )


    # --- 5) Construcción PDF
    buff = BytesIO()
    doc = SimpleDocTemplate(
        buff,
        pagesize=pagesizes.A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title=f"Presupuesto {budget.numero}",
    )
    styles = getSampleStyleSheet()
    normal = styles["Normal"]
    title = styles["Title"]

    story: List[object] = []

    cliente_txt = budget.cliente.nombre if getattr(budget, "cliente_id", None) and getattr(budget, "cliente", None) else "-"
    story.append(Paragraph(f"Presupuesto {budget.numero}", title))
    story.append(Paragraph(f"Fecha: {budget.fecha}  |  Cliente: {cliente_txt}", normal))
    story.append(Spacer(1, 8))

    # Tabla única
    header = ["Título", "Cantidad", "%", "Precio unitario", "Subtotal", "Total"]
    rows: List[List[object]] = [header]

    # Filas máquinas
    for ml in machine_lines:
        unit = _money(ml.subtotal_cliente / D(str(max(ml.cantidad, 1))))
        rows.append(
            [
                Paragraph(ml.titulo, normal),
                str(ml.cantidad),
                "-",
                _fmt_usd(unit),
                _fmt_usd(ml.subtotal_cliente),
                "",
            ]
        )

    # Filas impuestos
    for tl in tax_lines:
        rows.append(
            [
                Paragraph(tl.titulo, normal),
                "-",
                _fmt_pct(tl.porcentaje),
                "-",
                _fmt_usd(tl.subtotal),
                "",
            ]
        )

    # Fila TOTAL (suma de subtotales)
    rows.append(
        [
            "",
            "",
            "",
            "",
            "",
            Paragraph(f"<b>{_fmt_usd(total_cliente)}</b>", normal),
        ]
    )

    tbl = Table(rows, colWidths=[88 * mm, 18 * mm, 18 * mm, 28 * mm, 28 * mm, 28 * mm])

    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("FONTSIZE", (0, 1), (-1, -1), 9),

                ("VALIGN", (0, 0), (-1, -1), "TOP"),

                ("ALIGN", (1, 1), (1, -2), "RIGHT"),
                ("ALIGN", (2, 1), (2, -2), "RIGHT"),
                ("ALIGN", (3, 1), (5, -1), "RIGHT"),

                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),

                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),

                # Última fila (TOTAL)
                ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#F9FAFB")),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ]
        )
    )

    story.append(tbl)
    doc.build(story)
    return buff.getvalue()
