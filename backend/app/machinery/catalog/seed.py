from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, List

from django.db import transaction

from machinery.models.catalog import (
    MachineBase,
    Accessory,
    Tax,
    LogisticsLeg,
    LogisticsType,
    LogisticsStage,
)


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
