from __future__ import annotations

from datetime import date

from rest_framework.decorators import api_view
from rest_framework.response import Response

from machinery.shared.errors import DomainError, ErrorCodes
from .services import FinanceReportService


def _parse_date(value: str) -> date:
    try:
        return date.fromisoformat(value)  # YYYY-MM-DD
    except Exception:
        raise DomainError(
            ErrorCodes.VALIDATION_ERROR,
            message_override=f"Fecha inválida: '{value}'. Formato esperado YYYY-MM-DD.",
        )


@api_view(["GET"])
def finance_report(request):
    desde_str = request.query_params.get("desde")
    hasta_str = request.query_params.get("hasta")

    if not desde_str or not hasta_str:
        raise DomainError(
            ErrorCodes.VALIDATION_ERROR,
            message_override="Parámetros requeridos: desde y hasta (YYYY-MM-DD).",
        )

    desde = _parse_date(desde_str)
    hasta = _parse_date(hasta_str)

    if hasta < desde:
        raise DomainError(
            ErrorCodes.VALIDATION_ERROR,
            message_override="El rango es inválido: hasta debe ser >= desde.",
        )

    rep = FinanceReportService.build(desde=desde, hasta=hasta)

    return Response(
        {
            "desde": rep.desde.isoformat(),
            "hasta": rep.hasta.isoformat(),
            "totales": {
                "ingresos": str(rep.totales.ingresos),
                "egresos": str(rep.totales.egresos),
                "ganancia": str(rep.totales.ganancia),
            },
            "serie_diaria": [
                {
                    "fecha": r.fecha.isoformat(),
                    "ingresos": str(r.ingresos),
                    "egresos": str(r.egresos),
                    "ganancia": str(r.ganancia),
                }
                for r in rep.serie_diaria
            ],
        }
    )
