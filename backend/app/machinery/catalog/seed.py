from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, List, Optional
from datetime import date
import random

from django.db import transaction
from django.utils import timezone

from machinery.models.catalog import (
    MachineBase,
    Accessory,
    Tax,
    LogisticsLeg,
    LogisticsType,
    LogisticsStage,
)

from machinery.models import (
    Budget,
    BudgetItem,
    BudgetItemAccessory,
    BudgetTaxApplied,
    BudgetSelectedLogisticsLeg,
    Purchase,
    PurchasedUnit,
    RevenueEvent,
    RevenueEventUnit, UnitStatus,
)
from machinery.budgets.repositories import BudgetRepository
from machinery.budgets.services import BudgetService
from machinery.purchases.services import PurchaseService, UnitLifecycleService

@dataclass(frozen=True)
class SeedResult:
    machines: int
    accessories: int
    taxes: int
    logistics_legs: int


def _d(value: str) -> Decimal:
    return Decimal(value)


@transaction.atomic
def clear_catalog() -> SeedResult:
    """
    Borra TODO el catálogo (solo tablas del catálogo).
    """
    LogisticsLeg.objects.all().delete()
    Tax.objects.all().delete()
    Accessory.objects.all().delete()
    MachineBase.objects.all().delete()

    return SeedResult(machines=0, accessories=0, taxes=0, logistics_legs=0)


@transaction.atomic
def apply_seed(clear_first: bool = True) -> SeedResult:
    """
    Borra y recrea catálogo con datos de ejemplo realistas.
    """
    if clear_first:
        clear_catalog()

    # ----------------------------
    # 30 máquinas base (USD)
    # ----------------------------
    machine_names: List[str] = [
        "Excavadora 20T",
        "Excavadora 35T",
        "Retroexcavadora 4x4",
        "Minicargadora Skid Steer",
        "Cargadora Frontal 3m3",
        "Motoniveladora 140H",
        "Rodillo Compactador 12T",
        "Rodillo Compactador 20T",
        "Grua Telescopica 35T",
        "Grua Telescopica 60T",
        "Grua Torre 8T",
        "Plataforma Tijera 10m",
        "Plataforma Tijera 14m",
        "Plataforma Articulada 18m",
        "Autoelevador 3T",
        "Autoelevador 5T",
        "Generador 50 kVA",
        "Generador 100 kVA",
        "Bomba de Hormigon",
        "Mixer Hormigonero 8m3",
        "Perforadora Neumatica",
        "Martillo Hidraulico",
        "Camion Volcador 20m3",
        "Camion Cisterna 10kL",
        "Compresor 750 cfm",
        "Torre Iluminacion LED",
        "Soldadora Industrial",
        "Montacargas Todo Terreno",
        "Tractor Oruga D6",
        "Zanjadora",
    ]
    machine_totals = [
        "95000.00", "165000.00", "78000.00", "52000.00", "110000.00",
        "210000.00", "68000.00", "98000.00", "175000.00", "310000.00",
        "240000.00", "18000.00", "26000.00", "42000.00", "22000.00",
        "36000.00", "12000.00", "22000.00", "65000.00", "58000.00",
        "34000.00", "19000.00", "88000.00", "52000.00", "14000.00",
        "9000.00", "7000.00", "48000.00", "260000.00", "69000.00",
    ]
    MachineBase.objects.bulk_create(
        [
            MachineBase(nombre=n, total=_d(t))
            for n, t in zip(machine_names, machine_totals)
        ],
        ignore_conflicts=False,
    )

    # ----------------------------
    # 50 accesorios (USD)
    # ----------------------------
    accessory_names: List[str] = [
        "Kit de Mantenimiento (filtros + aceites)",
        "Baldes Excavadora 0.8m3",
        "Baldes Excavadora 1.2m3",
        "Baldes Excavadora 1.8m3",
        "Uñas y portauñas",
        "Martillo Hidráulico (acople)",
        "Pinza para Demolición",
        "Garra Forestal",
        "Zanjón / Trinchera (cabezal)",
        "Barredora Skid Steer",
        "Horquillas Skid Steer",
        "Cucharón 4 en 1",
        "Kit Hidráulico Auxiliar",
        "Enganche Rápido",
        "Cadena de Oruga (repuesto)",
        "Rodillos de Oruga (set)",
        "Bomba Hidráulica",
        "Mangueras Hidráulicas (kit)",
        "Neumáticos Industriales (set)",
        "Orugas de Goma (set)",
        "Cabina de Protección ROPS",
        "Cámara + Sensor Reversa",
        "GPS / Nivelación (kit)",
        "Sistema Telemática (módulo)",
        "Juego de Luces LED",
        "Batería Heavy Duty",
        "Cargador Batería Industrial",
        "Cadenas de Izaje (set)",
        "Eslingas de Izaje (set)",
        "Ganchos y Grilletes",
        "Extintor Industrial",
        "Kit Seguridad (balizas + conos)",
        "Kit Pintura Anticorrosiva",
        "Repuestos Frenos",
        "Repuestos Embrague",
        "Kit de Rodamientos",
        "Juego de Correas",
        "Radiador (repuesto)",
        "Alternador (repuesto)",
        "Arranque (repuesto)",
        "Filtros de aire (caja)",
        "Filtros de combustible (caja)",
        "Aceite Hidráulico (tambor)",
        "Aceite Motor (tambor)",
        "Grasa Industrial (caja)",
        "Anticongelante (bidones)",
        "Malacate / Winch",
        "Pluma / Boom Extensión",
        "Control Remoto (plataforma)",
        "Kit Herramientas",
    ]
    # precios con dispersión razonable
    accessory_totals = []
    for i in range(50):
        base = 250 + (i * 37)  # arranca barato y sube
        # capeo y variación
        price = min(18000, base * 3)
        accessory_totals.append(f"{price:.2f}")

    Accessory.objects.bulk_create(
        [Accessory(nombre=n, total=_d(t)) for n, t in zip(accessory_names, accessory_totals)],
        ignore_conflicts=False,
    )

    # ----------------------------
    # Taxes (referencia realista AR, importación)
    # - No es un cálculo legal exacto, es “catálogo” con sentido.
    # ----------------------------
    taxes = [
        ("IVA", "21.00", True, None),
        ("Derechos de Importación", "14.00", True, None),
        ("Tasa de Estadística", "3.00", True, None),
        ("Percepción IVA", "20.00", False, None),
        ("Percepción Ganancias", "6.00", False, None),
        ("Ingresos Brutos", "3.50", False, None),
        ("Tasa Aduanera/Servicios", "1.00", False, 250),
    ]
    Tax.objects.bulk_create(
        [Tax(nombre=n, porcentaje=_d(p), siempre_incluir=si, monto_minimo=mn) for n, p, si, mn in taxes],
        ignore_conflicts=False,
    )

    # ----------------------------
    # 15 Logistics Legs
    # China -> Chile (marítimo / aéreo) + Chile -> Mendoza (terrestre)
    # etapado: HASTA_ADUANA / POST_ADUANA
    # ----------------------------
    legs: List[Dict] = [
        # China -> Chile
        dict(desde="Shanghai, CN", hasta="Valparaíso, CL", tipo=LogisticsType.MARITIMO, etapa=LogisticsStage.HASTA_ADUANA, total="4800.00"),
        dict(desde="Shenzhen, CN", hasta="San Antonio, CL", tipo=LogisticsType.MARITIMO, etapa=LogisticsStage.HASTA_ADUANA, total="5200.00"),
        dict(desde="Hong Kong, CN", hasta="Santiago, CL", tipo=LogisticsType.AEREO, etapa=LogisticsStage.HASTA_ADUANA, total="9800.00"),
        dict(desde="Ningbo, CN", hasta="Valparaíso, CL", tipo=LogisticsType.MARITIMO, etapa=LogisticsStage.HASTA_ADUANA, total="5100.00"),
        dict(desde="Qingdao, CN", hasta="San Antonio, CL", tipo=LogisticsType.MARITIMO, etapa=LogisticsStage.HASTA_ADUANA, total="5400.00"),

        # Chile interno / post
        dict(desde="Valparaíso, CL", hasta="Santiago, CL", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.POST_ADUANA, total="420.00"),
        dict(desde="San Antonio, CL", hasta="Santiago, CL", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.POST_ADUANA, total="390.00"),

        # Chile -> Argentina
        dict(desde="Santiago, CL", hasta="Mendoza, AR", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.POST_ADUANA, total="950.00"),
        dict(desde="Valparaíso, CL", hasta="Mendoza, AR", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.POST_ADUANA, total="1120.00"),
        dict(desde="San Antonio, CL", hasta="Mendoza, AR", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.POST_ADUANA, total="1180.00"),

        # Variantes con etapa hasta aduana para tramo terrestre (p.ej. frontera/aduana)
        dict(desde="Santiago, CL", hasta="Los Andes, CL", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.HASTA_ADUANA, total="210.00"),
        dict(desde="Los Andes, CL", hasta="Uspallata, AR", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.HASTA_ADUANA, total="260.00"),
        dict(desde="Uspallata, AR", hasta="Mendoza, AR", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.POST_ADUANA, total="180.00"),

        # alternativas
        dict(desde="Santiago, CL", hasta="Buenos Aires, AR", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.POST_ADUANA, total="2400.00"),
        dict(desde="Buenos Aires, AR", hasta="Mendoza, AR", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.POST_ADUANA, total="1350.00"),
    ]

    LogisticsLeg.objects.bulk_create(
        [
            LogisticsLeg(
                desde=l["desde"],
                hasta=l["hasta"],
                tipo=l["tipo"],
                etapa=l["etapa"],
                total=_d(l["total"]),
            )
            for l in legs
        ],
        ignore_conflicts=False,
    )

    return SeedResult(
        machines=MachineBase.objects.count(),
        accessories=Accessory.objects.count(),
        taxes=Tax.objects.count(),
        logistics_legs=LogisticsLeg.objects.count(),
    )

def _add_months(d: date, months: int) -> date:
    y = d.year + ((d.month - 1 + months) // 12)
    m = ((d.month - 1 + months) % 12) + 1
    return date(y, m, 1)


def _last_month_starts(months_back: int = 6) -> List[date]:
    today = timezone.now().date()
    cur = date(today.year, today.month, 1)
    starts = [_add_months(cur, -i) for i in range(months_back - 1, -1, -1)]
    return starts

@transaction.atomic
def clear_demo_data() -> None:
    """
    Borra TODO lo generado por la demo (presupuestos, compras, unidades, ventas/alquileres).
    Importante el orden por FK/PROTECT.
    """
    RevenueEventUnit.objects.all().delete()
    RevenueEvent.objects.all().delete()

    PurchasedUnit.objects.all().delete()
    Purchase.objects.all().delete()

    BudgetSelectedLogisticsLeg.objects.all().delete()
    BudgetTaxApplied.objects.all().delete()
    BudgetItemAccessory.objects.all().delete()
    BudgetItem.objects.all().delete()
    Budget.objects.all().delete()


@dataclass(frozen=True)
class DemoSeedResult:
    budgets: int
    purchases: int
    units: int
    revenue_events: int


@transaction.atomic
def apply_demo_seed(*, months_back: int = 6, clear_first: bool = True) -> DemoSeedResult:
    """
    Genera data DEMO para poder navegar toda la app.
    - Distribuye movimientos mes a mes (últimos N meses).
    - Crea presupuestos, compras, unidades (derivadas del purchase).
    - Genera alquileres (activos y finalizados) y ventas.
    """
    # -----------------------------
    # Config DEMO (ajustable)
    # -----------------------------
    BUDGETS_PER_MONTH = 8              # 6 * 8 = 48
    CLOSE_RATE = Decimal("0.80")       # 80% se compra
    QTY_OPTIONS = [1, 2, 3]            # máquinas por presupuesto
    RENTALS_MULTI_MIN = 2
    RENTALS_MULTI_MAX = 4

    if clear_first:
        clear_demo_data()

    budget_service = BudgetService(repo=BudgetRepository())
    purchase_service = PurchaseService()

    machines = list(MachineBase.objects.all().order_by("id"))
    accessories = list(Accessory.objects.all().order_by("id"))
    taxes = list(Tax.objects.all().order_by("id"))
    legs_hasta = list(LogisticsLeg.objects.filter(etapa=LogisticsStage.HASTA_ADUANA).order_by("id"))
    legs_post = list(LogisticsLeg.objects.filter(etapa=LogisticsStage.POST_ADUANA).order_by("id"))

    if not machines or not taxes or not legs_hasta or not legs_post:
        return DemoSeedResult(budgets=0, purchases=0, units=0, revenue_events=0)

    month_starts = _last_month_starts(months_back)  # List[date] = primeros de cada mes, de antiguo -> actual

    # -----------------------------
    # Helpers internos
    # -----------------------------
    def _unit_cost(unit: PurchasedUnit) -> Decimal:
        """
        Devuelve el costo base de la unidad para cálculos demo (venta/alquiler).
        Intenta varios campos posibles y cae al total del presupuesto asociado al purchase.
        """
        # 1) campos directos comunes en unit
        for attr in ["total_compra", "total_compra_snapshot", "costo_compra", "costo_compra_snapshot"]:
            if hasattr(unit, attr):
                v = getattr(unit, attr)
                if v is not None:
                    return Decimal(str(v)).quantize(Decimal("0.01"))

        # 2) desde purchase (si existiera)
        if hasattr(unit, "purchase") and unit.purchase is not None:
            p = unit.purchase

            for attr in ["total_compra", "total_compra_snapshot", "total"]:
                if hasattr(p, attr):
                    v = getattr(p, attr)
                    if v is not None:
                        return Decimal(str(v)).quantize(Decimal("0.01"))

            # 3) desde budget asociado al purchase (muy típico)
            for budget_attr in ["budget", "presupuesto"]:
                if hasattr(p, budget_attr):
                    b = getattr(p, budget_attr)
                    if b is not None:
                        for attr in ["total_snapshot", "total", "total_final", "monto_total"]:
                            if hasattr(b, attr):
                                v = getattr(b, attr)
                                if v is not None:
                                    return Decimal(str(v)).quantize(Decimal("0.01"))

        # fallback final
        return Decimal("10000.00")

    def _venta_20_30(unit: PurchasedUnit) -> Decimal:
        base = _unit_cost(unit)
        margen = Decimal(str(random.randint(20, 30))) / Decimal("100")
        return (base * (Decimal("1.00") + margen)).quantize(Decimal("0.01"))

    def _monto_mensual(unit: PurchasedUnit) -> Decimal:
        base = _unit_cost(unit)
        pct = Decimal(str(random.randint(3, 5))) / Decimal("100")  # 3%..5% mensual
        return (base * pct).quantize(Decimal("0.01"))

    def _month_idx_safe(i: int) -> int:
        return max(0, min(len(month_starts) - 1, i))

    def _pick_month_index(max_idx: int) -> int:
        return random.randint(0, max_idx)

    # -----------------------------
    # 1) Crear Budgets (48 aprox)
    # -----------------------------
    created_budgets: List[Budget] = []

    for ms in month_starts:
        for _ in range(BUDGETS_PER_MONTH):
            day = random.randint(1, 28)
            fecha = date(ms.year, ms.month, day)

            mb = random.choice(machines)
            qty = random.choice(QTY_OPTIONS)

            # accesorios (0-2)
            if accessories:
                accs = random.sample(accessories, k=random.choice([0, 1, 2]))
            else:
                accs = []
            acc_payload = [{"accessory_id": a.id, "cantidad": 1} for a in accs]

            lg1 = random.choice(legs_hasta)
            lg2 = random.choice(legs_post)

            impuestos_payload = []
            for t in taxes:
                if t.siempre_incluir:
                    impuestos_payload.append(
                        {"tax_id": t.id, "incluido": True, "porcentaje": str(t.porcentaje)}
                    )

            extras = [t for t in taxes if not t.siempre_incluir]
            if extras:
                pick = random.choice(extras)
                impuestos_payload.append(
                    {"tax_id": pick.id, "incluido": random.choice([True, False]), "porcentaje": str(pick.porcentaje)}
                )

            # Si el tax tiene mínimo, probamos override a veces
            for obj in impuestos_payload:
                t = next((x for x in taxes if x.id == obj["tax_id"]), None)
                if t and t.monto_minimo is not None and random.choice([True, False]):
                    mult = Decimal(str(random.choice([1, 2, 3])))
                    obj["monto_minimo"] = str((t.monto_minimo * mult).quantize(Decimal("0.01")))

            payload = {
                "fecha": fecha,
                "items": [
                    {
                        "machine_base_id": mb.id,
                        "cantidad": qty,
                        "accesorios": acc_payload,
                    }
                ],
                "logisticas": [
                    {"logistics_leg_id": lg1.id},
                    {"logistics_leg_id": lg2.id},
                ],
                "impuestos": impuestos_payload,
            }

            # retry por cualquier colisión rara
            last_exc: Optional[Exception] = None
            for _try in range(10):
                try:
                    b = budget_service.create_from_payload(payload)
                    created_budgets.append(b)
                    last_exc = None
                    break
                except Exception as e:
                    last_exc = e
                    # cambiamos el día, por si el número dependiera de la fecha
                    day = random.randint(1, 28)
                    payload["fecha"] = date(ms.year, ms.month, day)

            if last_exc is not None:
                raise last_exc

    # -----------------------------
    # 2) Comprar (Purchase) el 80% de Budgets
    # -----------------------------
    target = int(round(len(created_budgets) * float(CLOSE_RATE)))
    to_buy = random.sample(created_budgets, k=target) if target > 0 else []

    # Compras distribuidas por mes (según fecha del budget)
    by_month = {}
    for b in to_buy:
        key = (b.fecha.year, b.fecha.month)
        by_month.setdefault(key, []).append(b)

    for (y, m), budgets_mes in by_month.items():
        for b in budgets_mes:
            fecha_compra = date(y, m, random.randint(1, 28)).isoformat()
            budget_service.purchase_from_draft(
                purchase_service=purchase_service,
                budget_id=b.id,
                fecha_compra=fecha_compra,
                notas="Compra demo",
            )

    # -----------------------------
    # 3) Unidades derivadas de compras
    # -----------------------------
    units = list(PurchasedUnit.objects.select_related("purchase", "purchase__budget").order_by("id"))
    random.shuffle(units)

    # -----------------------------
    # 4) Lifecycle: alquileres + ventas
    # -----------------------------
    max_i = len(month_starts) - 1

    for u in units:
        if u.estado != UnitStatus.DEPOSITO:
            continue

        roll = random.random()

        # 15% venta directa
        if roll < 0.15:
            ms = month_starts[_pick_month_index(max_i)]
            UnitLifecycleService.mark_sold(
                unit_id=u.id,
                fecha_venta=ms,
                monto_total=_venta_20_30(u),
                cliente_texto="Cliente demo",
                notas="Venta demo directa",
            )
            continue

        # 20% alquiler(es) y luego venta
        if roll < 0.35:
            start = random.randint(0, max(0, max_i - 2))
            rentals = random.randint(1, 3)

            for k in range(rentals):
                ms = month_starts[_month_idx_safe(start + k)]
                next_ms = _add_months(ms, 1)

                UnitLifecycleService.mark_rented(
                    unit_id=u.id,
                    inicio_year=ms.year,
                    inicio_month=ms.month,
                    retorno_estimada_year=next_ms.year,
                    retorno_estimada_month=next_ms.month,
                    monto_mensual=_monto_mensual(u),
                    notas="Alquiler demo",
                )
                UnitLifecycleService.finish_rental(
                    unit_id=u.id,
                    retorno_real_year=next_ms.year,
                    retorno_real_month=next_ms.month,
                )

            venta_ms = month_starts[_month_idx_safe(start + rentals)]
            UnitLifecycleService.mark_sold(
                unit_id=u.id,
                fecha_venta=venta_ms,
                monto_total=_venta_20_30(u),
                cliente_texto="Cliente demo",
                notas="Venta demo luego de alquiler",
            )
            continue

        # 65% varios alquileres (muchos revenue events)
        rentals = random.randint(RENTALS_MULTI_MIN, RENTALS_MULTI_MAX)
        start = random.randint(0, max(0, max_i - 1))

        for k in range(rentals):
            ms = month_starts[_month_idx_safe(start + k)]
            next_ms = _add_months(ms, 1)

            UnitLifecycleService.mark_rented(
                unit_id=u.id,
                inicio_year=ms.year,
                inicio_month=ms.month,
                retorno_estimada_year=next_ms.year,
                retorno_estimada_month=next_ms.month,
                monto_mensual=_monto_mensual(u),
                notas="Alquiler demo",
            )

            # último alquiler: si cae en mes actual o anterior, lo dejamos activo
            is_last = (k == rentals - 1)
            is_recent = (_month_idx_safe(start + k) >= max_i - 1)
            if not (is_last and is_recent):
                UnitLifecycleService.finish_rental(
                    unit_id=u.id,
                    retorno_real_year=next_ms.year,
                    retorno_real_month=next_ms.month,
                )

    return DemoSeedResult(
        budgets=Budget.objects.count(),
        purchases=Purchase.objects.count(),
        units=PurchasedUnit.objects.count(),
        revenue_events=RevenueEvent.objects.count(),
    )
