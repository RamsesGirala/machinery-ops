from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import List, Dict

from django.db import transaction

from machinery.models.catalog import (
    MachineBase,
    Accessory,
    Tax,
    PreTaxCharge,
    Client,
    LogisticsLeg,
    LogisticsType,
    LogisticsStage,
)


def _d(v: str) -> Decimal:
    return Decimal(v)


@dataclass(frozen=True)
class SeedCatalogResult:
    machines: int
    accessories: int
    taxes: int
    pretax_charges: int
    clients: int
    logistics_legs: int


@transaction.atomic
def clear_catalog() -> SeedCatalogResult:
    """
    Borra TODO el catálogo (tablas del catálogo). OJO: si hay demo, primero borrar demo (FK PROTECT).
    """
    LogisticsLeg.objects.all().delete()
    Tax.objects.all().delete()
    PreTaxCharge.objects.all().delete()
    Client.objects.all().delete()
    Accessory.objects.all().delete()
    MachineBase.objects.all().delete()

    return SeedCatalogResult(
        machines=0,
        accessories=0,
        taxes=0,
        pretax_charges=0,
        clients=0,
        logistics_legs=0,
    )


@transaction.atomic
def apply_catalog_seed(*, clear_first: bool = True) -> SeedCatalogResult:
    """
    Crea catálogo realista orientado a:
    - elevadores y equipos típicos de depósitos
    - accesorios propios de esos equipos
    - logística China -> Argentina pasando por aduana
    - clientes y pretax charges
    """
    if clear_first:
        clear_catalog()

    # ----------------------------
    # Maquinas base (equipos de depósito / elevación)
    # ----------------------------
    machines: List[Dict[str, str]] = [
        {"nombre": "Plataforma Tijera Eléctrica 8m (compacta)", "total": "16500.00"},
        {"nombre": "Plataforma Tijera Eléctrica 12m", "total": "24800.00"},
        {"nombre": "Plataforma Tijera Diesel 14m (4x4)", "total": "36500.00"},
        {"nombre": "Plataforma Articulada Eléctrica 16m", "total": "52000.00"},
        {"nombre": "Plataforma Articulada Diesel 20m", "total": "78500.00"},
        {"nombre": "Plataforma Telescópica Diesel 26m", "total": "118000.00"},
        {"nombre": "Autoelevador Eléctrico 2.5T (3 ruedas)", "total": "29500.00"},
        {"nombre": "Autoelevador Eléctrico 3.5T (contrabalanceado)", "total": "41800.00"},
        {"nombre": "Autoelevador Diesel 3.0T", "total": "35500.00"},
        {"nombre": "Autoelevador Diesel 5.0T", "total": "58900.00"},
        {"nombre": "Reach Truck 1.6T (pasillo angosto)", "total": "47500.00"},
        {"nombre": "Order Picker 1.2T (preparación pedidos)", "total": "32800.00"},
        {"nombre": "Apilador Eléctrico 1.5T (walkie)", "total": "12900.00"},
        {"nombre": "Apilador Eléctrico 2.0T (con plataforma)", "total": "17500.00"},
        {"nombre": "Transpaleta Eléctrica 2.0T", "total": "6200.00"},
        {"nombre": "Transpaleta Manual 2.5T", "total": "690.00"},
    ]

    MachineBase.objects.bulk_create(
        [MachineBase(nombre=m["nombre"], total=_d(m["total"])) for m in machines],
        ignore_conflicts=False,
    )

    # ----------------------------
    # Accesorios (enfocados a depósito/elevación)
    # ----------------------------
    accessories: List[Dict[str, str]] = [
        {"nombre": "Batería Litio 48V (pack)", "total": "6800.00"},
        {"nombre": "Cargador Inteligente 48V", "total": "1450.00"},
        {"nombre": "Cargador Inteligente 80V", "total": "1850.00"},
        {"nombre": "Ruedas/Neumáticos No-Marking (set)", "total": "920.00"},
        {"nombre": "Ruedas Poliuretano (set transpaleta)", "total": "185.00"},
        {"nombre": "Kit Side-Shift (desplazador lateral)", "total": "1750.00"},
        {"nombre": "Posicionador de Horquillas", "total": "3200.00"},
        {"nombre": "Extensiones de Horquillas 1.2m (par)", "total": "420.00"},
        {"nombre": "Extensiones de Horquillas 1.8m (par)", "total": "610.00"},
        {"nombre": "Pinza para Bobinas", "total": "6900.00"},
        {"nombre": "Pinza para Cartón/Papel", "total": "5200.00"},
        {"nombre": "Baliza LED + Alarma Reversa", "total": "210.00"},
        {"nombre": "BlueSpot (luz seguridad peatonal)", "total": "165.00"},
        {"nombre": "Cámara + Monitor (kit)", "total": "340.00"},
        {"nombre": "Telemetría/IoT (módulo + 1 año)", "total": "390.00"},
        {"nombre": "Arnés + Línea de Vida (kit)", "total": "145.00"},
        {"nombre": "Barandas de Seguridad para Plataforma (kit)", "total": "520.00"},
        {"nombre": "Joystick / Control Plataforma (repuesto)", "total": "880.00"},
        {"nombre": "Kit Mantenimiento (filtros + aceites)", "total": "310.00"},
        {"nombre": "Seguro de Carga (póliza extra)", "total": "250.00"},
    ]

    Accessory.objects.bulk_create(
        [Accessory(nombre=a["nombre"], total=_d(a["total"])) for a in accessories],
        ignore_conflicts=False,
    )

    # ----------------------------
    # PreTax Charges (sobre base_pre_impuestos)
    # ----------------------------
    pretax = [
        ("Seguro Internacional", "1.20", True),
        ("Comisión Forwarder", "2.00", True),
        ("Gastos Bancarios/Swift", "0.60", False),
        ("Inspección/Certificación (origen)", "0.80", False),
    ]
    PreTaxCharge.objects.bulk_create(
        [PreTaxCharge(nombre=n, porcentaje=_d(p), siempre_incluir=si) for n, p, si in pretax],
        ignore_conflicts=False,
    )

    # ----------------------------
    # Taxes (referencia importación AR - catálogo)
    # ----------------------------
    taxes = [
        ("IVA", "21.00", True, None),
        ("Derechos de Importación", "14.00", True, None),
        ("Tasa de Estadística", "3.00", True, None),
        ("Percepción IVA", "20.00", False, None),
        ("Percepción Ganancias", "6.00", False, None),
        ("Ingresos Brutos", "3.50", False, None),
        ("Tasa Aduana/Servicios", "1.00", False, "250.00"),
    ]
    Tax.objects.bulk_create(
        [
            Tax(nombre=n, porcentaje=_d(p), siempre_incluir=si, monto_minimo=_d(mm) if mm else None)
            for n, p, si, mm in taxes
        ],
        ignore_conflicts=False,
    )

    # ----------------------------
    # Clients (algunos con mail, otros con cel, otros ambos)
    # ----------------------------
    clients = [
        {"nombre": "Depósito Andino SA", "telefono": "+54 261 555-0101", "email": "compras@depositoandino.com"},
        {"nombre": "Logística Cuyo SRL", "telefono": "+54 261 555-0122", "email": None},
        {"nombre": "Centro Distribución Norte", "telefono": None, "email": "abastecimiento@cdnorte.com"},
        {"nombre": "Warehouse Prime", "telefono": "+54 11 5555-0199", "email": "ops@warehouseprime.com"},
        {"nombre": "Operador 3PL Mendoza", "telefono": "+54 261 555-0144", "email": None},
        {"nombre": "Frío y Seco SA", "telefono": None, "email": "compras@frioyseco.com"},
        {"nombre": "Retail DC CABA", "telefono": "+54 11 5555-0110", "email": "mantenimiento@retaildc.com"},
        {"nombre": "Parque Industrial Este", "telefono": "+54 261 555-0188", "email": None},
        {"nombre": "Fulfillment Express", "telefono": None, "email": "finance@fulfillmentexpress.com"},
        {"nombre": "Distribuidora Regional", "telefono": "+54 261 555-0166", "email": "contacto@distribuidoraregional.com"},
    ]
    Client.objects.bulk_create(
        [Client(nombre=c["nombre"], telefono=c["telefono"], email=c["email"]) for c in clients],
        ignore_conflicts=False,
    )

    # ----------------------------
    # Logistics Legs: China -> Chile -> Mendoza (AR)
    # Regla: POST_ADUANA SOLO desde Aduana Mendoza -> Depósito Mendoza
    # ----------------------------
    legs: List[Dict] = [
        # Internacional (HASTA_ADUANA)
        dict(desde="Shanghai, CN", hasta="Puerto San Antonio, CL", tipo=LogisticsType.MARITIMO, etapa=LogisticsStage.HASTA_ADUANA, total="5900.00"),
        dict(desde="Ningbo, CN", hasta="Puerto San Antonio, CL", tipo=LogisticsType.MARITIMO, etapa=LogisticsStage.HASTA_ADUANA, total="6150.00"),
        dict(desde="Shenzhen, CN", hasta="Puerto Valparaíso, CL", tipo=LogisticsType.MARITIMO, etapa=LogisticsStage.HASTA_ADUANA, total="6250.00"),
        dict(desde="Hong Kong, CN", hasta="Santiago (SCL), CL", tipo=LogisticsType.AEREO, etapa=LogisticsStage.HASTA_ADUANA, total="11200.00"),

        # Chile: puerto/aeropuerto -> aduana (HASTA_ADUANA)
        dict(desde="Puerto San Antonio, CL", hasta="Aduana San Antonio, CL", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.HASTA_ADUANA, total="380.00"),
        dict(desde="Puerto Valparaíso, CL", hasta="Aduana Valparaíso, CL", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.HASTA_ADUANA, total="360.00"),
        dict(desde="Santiago (SCL), CL", hasta="Aduana Metropolitana (Santiago), CL", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.HASTA_ADUANA, total="260.00"),

        # Cruce / arribo hasta Aduana Mendoza (HASTA_ADUANA)
        dict(desde="Santiago, CL", hasta="Complejo Los Libertadores, CL", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.HASTA_ADUANA, total="260.00"),
        dict(desde="Complejo Los Libertadores, CL", hasta="Uspallata (Control Integrado), AR", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.HASTA_ADUANA, total="180.00"),
        dict(desde="Uspallata (Control Integrado), AR", hasta="Aduana Mendoza, AR", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.HASTA_ADUANA, total="140.00"),

        # Post aduana: SOLO Aduana Mendoza -> Depósito Mendoza (POST_ADUANA)
        dict(desde="Aduana Mendoza, AR", hasta="Depósito Central Mendoza, AR", tipo=LogisticsType.TERRESTRE, etapa=LogisticsStage.POST_ADUANA, total="120.00"),
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

    return SeedCatalogResult(
        machines=MachineBase.objects.count(),
        accessories=Accessory.objects.count(),
        taxes=Tax.objects.count(),
        pretax_charges=PreTaxCharge.objects.count(),
        clients=Client.objects.count(),
        logistics_legs=LogisticsLeg.objects.count(),
    )
