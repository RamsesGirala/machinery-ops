from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional


@dataclass(frozen=True)
class ErrorDef:
    code: str
    default_message: str
    http_status: int


class ErrorCodes:
    # ---- Genéricos ----
    VALIDATION_ERROR = ErrorDef(
        code="VALIDATION_ERROR",
        default_message="Los datos enviados no son válidos.",
        http_status=400,
    )
    UNEXPECTED_ERROR = ErrorDef(
        code="UNEXPECTED_ERROR",
        default_message="Ocurrió un error inesperado.",
        http_status=500,
    )
    NOT_FOUND = ErrorDef(
        code="NOT_FOUND",
        default_message="Recurso no encontrado.",
        http_status=404,
    )
    CONFLICT = ErrorDef(
        code="CONFLICT",
        default_message="Conflicto con el estado actual del recurso.",
        http_status=409,
    )

    # ---- Budget ----
    BUDGET_DELETE_NOT_ALLOWED = ErrorDef(
        code="BUDGET_DELETE_NOT_ALLOWED",
        default_message="No se puede eliminar el presupuesto en el estado actual.",
        http_status=409,
    )

    BUDGET_EDIT_NOT_ALLOWED = ErrorDef(
        code="BUDGET_EDIT_NOT_ALLOWED",
        default_message="No se puede editar el presupuesto en el estado actual.",
        http_status=409,
    )

    BUDGET_ALREADY_PURCHASED = ErrorDef(
        code="BUDGET_ALREADY_PURCHASED",
        default_message="El presupuesto ya fue comprado y no puede modificarse.",
        http_status=409,
    )



class DomainError(Exception):
    """
    Error de dominio (negocio). No depende de DRF.
    Lo tiran los services y el exception handler global lo transforma a HTTP.
    """

    def __init__(
        self,
        error: ErrorDef,
        *,
        message_override: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ):
        self.error = error
        self.code = error.code
        self.http_status = error.http_status
        self.message = message_override or error.default_message
        self.details = details or {}
        super().__init__(self.message)
