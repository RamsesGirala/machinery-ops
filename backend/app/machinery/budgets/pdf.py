from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO
from typing import List, Optional
from django.conf import settings
from reportlab.lib import pagesizes, colors
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image

from machinery.models import Budget

from pathlib import Path

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


def build_budget_pdf_bytes(*, budget: Budget, rentabilidad_pct: Decimal, validez_dias: int) -> bytes:
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

    # Base imponible cliente (NO se imprime como base, pero la usamos como "SUBTOTAL" de items)
    base_imponible_cliente = _money((budget.base_imponible_snapshot or D("0.00")) * factor)

    # --- 2) Distribuir base imponible cliente proporcional a costo interno
    machine_lines: List[MachineLine] = []
    running_alloc = D("0.00")

    for idx, it in enumerate(items):
        accs = list(it.accesorios.all())
        accesorios_txt = "; ".join([f"{a.accessory.nombre} x {a.cantidad}" for a in accs])
        titulo = f"{it.machine_base.nombre} ({accesorios_txt})" if accesorios_txt else f"{it.machine_base.nombre}"

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

    # --- 4) Totales (para bloque resumen separado)
    subtotal_items = _money(sum((ml.subtotal_cliente for ml in machine_lines), D("0.00")))
    total_cliente = _money(subtotal_items + sum((tl.subtotal for tl in tax_lines), D("0.00")))

    # --- 5) Construcción PDF (NUEVO LAYOUT)
    buff = BytesIO()
    doc = SimpleDocTemplate(
        buff,
        pagesize=pagesizes.A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=24 * mm,
        bottomMargin=14 * mm,
        title=f"Presupuesto {budget.numero}",
    )

    styles = getSampleStyleSheet()
    normal = styles["Normal"]

    title_center = ParagraphStyle(
        "TitleCenter",
        parent=styles["Title"],
        alignment=TA_CENTER,
        fontSize=16,
        leading=18,
        spaceAfter=6,
    )

    label_small = ParagraphStyle(
        "LabelSmall",
        parent=normal,
        fontSize=9,
        leading=11,
    )

    story: List[object] = []

    # --- Header con logo + título
    logo_path = Path(settings.BASE_DIR) / "machinery" / "static" / "pdf" / "qstrong_logo.png"

    logo_w = 28 * mm
    logo = ""
    if logo_path.exists():
        logo = Image(str(logo_path), width=logo_w, height=logo_w)

    header_title = Paragraph(f"<b>Presupuesto</b> (N° {budget.numero})", title_center)

    # 3 columnas: logo | título | spacer (mismo ancho que logo) => centra el título
    header_tbl = Table(
        [[logo, header_title, ""]],
        colWidths=[logo_w, doc.width - (2 * logo_w), logo_w],
    )
    header_tbl.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 0), (1, 0), "CENTER"),
                ("LINEBELOW", (0, 0), (-1, 0), 1.2, colors.HexColor("#D1D5DB")),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ]
        )
    )
    story.append(header_tbl)
    story.append(Spacer(1, 8))

    # --- Datos Empresa / Cliente (dos cajas)
    # Empresa fija (la que me pasaste)
    emp_nombre = "GARUFA SAS"
    emp_cuit = "30-71900488-8"
    emp_dir = "Terrada 6701"
    emp_tel = "2615575877"
    emp_mail = "comercial@qstrong.com.ar"

    # Cliente (solo nombre, numero, mail)
    cli = getattr(budget, "cliente", None)
    cli_nombre = getattr(cli, "nombre", None) if cli else None
    cli_numero = getattr(cli, "telefono", None) if cli else None
    cli_mail = getattr(cli, "email", None) if cli else None

    cli_nombre = cli_nombre or "-"
    cli_numero = cli_numero or "-"
    cli_mail = cli_mail or "-"

    left_box = [
        [Paragraph("<b>Datos Empresa</b>", label_small)],
        [Paragraph(f"<b>Nombre:</b> {emp_nombre}", label_small)],
        [Paragraph(f"<b>CUIT:</b> {emp_cuit}", label_small)],
        [Paragraph(f"<b>Dirección:</b> {emp_dir}", label_small)],
        [Paragraph(f"<b>Teléfono:</b> {emp_tel}", label_small)],
        [Paragraph(f"<b>Mail:</b> {emp_mail}", label_small)],
    ]

    right_box = [
        [Paragraph("<b>Datos Cliente</b>", label_small)],
        [Paragraph(f"<b>Nombre:</b> {cli_nombre}", label_small)],
        [Paragraph(f"<b>Número:</b> {cli_numero}", label_small)],
        [Paragraph(f"<b>Mail:</b> {cli_mail}", label_small)],
    ]

    boxes_tbl = Table(
        [[Table(left_box), Table(right_box)]],
        colWidths=[95 * mm, 95 * mm],
    )
    boxes_tbl.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (0, 0), 1, colors.HexColor("#9CA3AF")),
                ("BOX", (1, 0), (1, 0), 1, colors.HexColor("#9CA3AF")),
                ("INNERPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(boxes_tbl)
    story.append(Spacer(1, 10))

    # --- Fecha + Validez
    story.append(
        Paragraph(
            f"<b>Fecha del presupuesto:</b> {budget.fecha} &nbsp;&nbsp; <b>Validez:</b> {validez_dias} días",
            normal,
        )
    )
    story.append(Spacer(1, 10))

    # --- Tabla DETALLE (solo items/máquinas)
    detail_rows: List[List[object]] = [
        [
            Paragraph("<b>DESCRIPCIÓN</b>", label_small),
            Paragraph("<b>UNIDADES</b>", label_small),
            Paragraph("<b>PRECIO UNITARIO</b>", label_small),
            Paragraph("<b>TOTAL</b>", label_small),
        ]
    ]

    for ml in machine_lines:
        unit = _money(ml.subtotal_cliente / D(str(max(ml.cantidad, 1))))
        detail_rows.append(
            [
                Paragraph(ml.titulo, label_small),
                Paragraph(str(ml.cantidad), label_small),
                Paragraph(_fmt_usd(unit), label_small),
                Paragraph(_fmt_usd(ml.subtotal_cliente), label_small),
            ]
        )

    detail_tbl = Table(detail_rows, colWidths=[118 * mm, 22 * mm, 25 * mm, 25 * mm])

    detail_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 1), (1, -1), "RIGHT"),
                ("ALIGN", (2, 1), (3, -1), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(detail_tbl)
    story.append(Spacer(1, 50))

    # --- Bloque RESUMEN (separado, tipo “Sub-total / Impuestos / Total”)
    resumen_rows: List[List[object]] = [
        [Paragraph("<b>SUBTOTAL</b>", label_small), Paragraph(_fmt_usd(subtotal_items), label_small)],
    ]

    # Cada impuesto en su propia fila
    for tl in tax_lines:
        resumen_rows.append(
            [
                Paragraph(f"<b>{tl.titulo}</b> ({_fmt_pct(tl.porcentaje)})", label_small),
                Paragraph(_fmt_usd(tl.subtotal), label_small),
            ]
        )

    resumen_rows.append(
        [Paragraph("<b>TOTAL PRESUPUESTO</b>", label_small), Paragraph(f"<b>{_fmt_usd(total_cliente)}</b>", label_small)]
    )

    # --- Bloque RESUMEN alineado a la derecha y dentro del ancho del documento
    summary_width = 85 * mm
    spacer_width = doc.width - summary_width

    resumen_tbl = Table(
        resumen_rows,
        colWidths=[summary_width * 0.65, summary_width * 0.35],
    )
    resumen_tbl.setStyle(
        TableStyle(
            [
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
                ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#F9FAFB")),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )

    resumen_wrap = Table([["", resumen_tbl]], colWidths=[spacer_width, summary_width])
    resumen_wrap.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(resumen_wrap)
    story.append(Spacer(1, 12))

    # --- Observaciones

    obs = Table(
        [[Paragraph("<b>Observaciones</b>", label_small)],
         [Paragraph("• Precios en USD.  • Entrega sujeta a disponibilidad.  • Garantía según fabricante.",
                    label_small)]],
        colWidths=[190 * mm],
    )
    obs.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#9CA3AF")),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(obs)
    story.append(Spacer(1, 12))

    # --- Firmas (opcional, como tus ejemplos)
    firmas = Table(
        [[Paragraph("Firma", label_small), Paragraph("Firma del cliente", label_small)]],
        colWidths=[95 * mm, 95 * mm],
        rowHeights=[22 * mm],
    )
    firmas.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (0, 0), 1, colors.HexColor("#9CA3AF")),
                ("BOX", (1, 0), (1, 0), 1, colors.HexColor("#9CA3AF")),
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(firmas)

    doc.build(story)
    return buff.getvalue()

