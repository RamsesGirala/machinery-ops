from __future__ import annotations

import logging
from typing import Any

from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError, NotAuthenticated, PermissionDenied

from machinery.shared.errors import DomainError, ErrorCodes

logger = logging.getLogger("machinery.audit")


def _wrap_error(*, code: str, message: str, details: dict[str, Any] | None = None) -> dict:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
        }
    }


def custom_exception_handler(exc, context):
    # 1) Dominio (services)
    if isinstance(exc, DomainError):
        payload = _wrap_error(code=exc.code, message=exc.message, details=exc.details)
        return Response(payload, status=exc.http_status)

    # 2) Dejamos que DRF genere la respuesta base (para 404, MethodNotAllowed, etc.)
    response = drf_exception_handler(exc, context)

    # Si DRF no lo manejó, es un 500 real
    if response is None:
        logger.exception("Unhandled exception", extra={"path": getattr(context.get("request"), "path", None)})
        payload = _wrap_error(
            code=ErrorCodes.UNEXPECTED_ERROR.code,
            message=ErrorCodes.UNEXPECTED_ERROR.default_message,
            details={},
        )
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # 3) ValidationError (serializer / request data)
    if isinstance(exc, DRFValidationError):
        payload = _wrap_error(
            code=ErrorCodes.VALIDATION_ERROR.code,
            message=ErrorCodes.VALIDATION_ERROR.default_message,
            details=response.data if isinstance(response.data, (dict, list)) else {"detail": response.data},
        )
        return Response(payload, status=response.status_code)

    # 4) Auth/perm (no lo usás hoy, pero lo dejamos igual para consistencia)
    if isinstance(exc, NotAuthenticated):
        payload = _wrap_error(
            code="NOT_AUTHENTICATED",
            message="Autenticación requerida.",
            details=response.data if isinstance(response.data, dict) else {},
        )
        return Response(payload, status=response.status_code)

    if isinstance(exc, PermissionDenied):
        payload = _wrap_error(
            code="PERMISSION_DENIED",
            message="No tenés permisos para realizar esta acción.",
            details=response.data if isinstance(response.data, dict) else {},
        )
        return Response(payload, status=response.status_code)

    # 5) Otros errores DRF (404, MethodNotAllowed, etc.) también los envolvemos
    detail = response.data.get("detail") if isinstance(response.data, dict) else None
    payload = _wrap_error(
        code=f"HTTP_{response.status_code}",
        message=str(detail) if detail else "Error.",
        details=response.data if isinstance(response.data, (dict, list)) else {},
    )
    return Response(payload, status=response.status_code)
