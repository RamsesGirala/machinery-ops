from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

from django.db.models import ProtectedError

from machinery.models import MachineBase, Accessory, Tax, LogisticsLeg, Client, PreTaxCharge
from .repositories import (
    MachineBaseRepository,
    AccessoryRepository,
    TaxRepository,
    LogisticsLegRepository,
    ClientRepository,
    PreTaxChargeRepository
)
from ..shared.errors import DomainError, ErrorCodes


def _raise_delete_protected(*, obj, pk: int, exc: ProtectedError, label: str) -> None:
    details = {
        "model": obj.__class__.__name__,
        "id": pk,
        "protected_by": sorted({o.__class__.__name__ for o in exc.protected_objects}),
        "protected_count": len(exc.protected_objects),
    }
    raise DomainError(
        ErrorCodes.CATALOG_DELETE_PROTECTED,
        message_override=f"No se puede eliminar {label} porque está asociado a {len(exc.protected_objects)} registro(s).",
        details=details,
    )

@dataclass
class MachineBaseService:
    repo: MachineBaseRepository

    def list_qs(self):
        return self.repo.list_qs()

    def create(self, data: Dict[str, Any]) -> MachineBase:
        return self.repo.create(**data)

    def update(self, pk: int, data: Dict[str, Any]) -> MachineBase:
        obj = self.repo.get(pk)
        return self.repo.update(obj, **data)

    def delete(self, pk: int) -> None:
        obj = self.repo.get(pk)
        try:
            self.repo.delete(obj)
        except ProtectedError as e:
            _raise_delete_protected(obj=obj, pk=pk, exc=e, label="La maquina")

@dataclass
class AccessoryService:
    repo: AccessoryRepository

    def list_qs(self):
        return self.repo.list_qs()

    def create(self, data: Dict[str, Any]) -> Accessory:
        return self.repo.create(**data)

    def update(self, pk: int, data: Dict[str, Any]) -> Accessory:
        obj = self.repo.get(pk)
        return self.repo.update(obj, **data)

    def delete(self, pk: int) -> None:
        obj = self.repo.get(pk)
        try:
            self.repo.delete(obj)
        except ProtectedError as e:
            _raise_delete_protected(obj=obj, pk=pk, exc=e, label="El accesorio")

@dataclass
class TaxService:
    repo: TaxRepository

    def list_qs(self):
        return self.repo.list_qs()

    def create(self, data: Dict[str, Any]) -> Tax:
        return self.repo.create(**data)

    def update(self, pk: int, data: Dict[str, Any]) -> Tax:
        obj = self.repo.get(pk)
        return self.repo.update(obj, **data)

    def delete(self, pk: int) -> None:
        obj = self.repo.get(pk)
        try:
            self.repo.delete(obj)
        except ProtectedError as e:
            _raise_delete_protected(obj=obj, pk=pk, exc=e, label="El impuesto")

@dataclass
class LogisticsLegService:
    repo: LogisticsLegRepository

    def list_qs(self):
        return self.repo.list_qs()

    def create(self, data: Dict[str, Any]) -> LogisticsLeg:
        return self.repo.create(**data)

    def update(self, pk: int, data: Dict[str, Any]) -> LogisticsLeg:
        obj = self.repo.get(pk)
        return self.repo.update(obj, **data)

    def delete(self, pk: int) -> None:
        obj = self.repo.get(pk)
        try:
            self.repo.delete(obj)
        except ProtectedError as e:
            _raise_delete_protected(obj=obj, pk=pk, exc=e, label="El camino de logistica")

@dataclass
class ClientService:
    repo: ClientRepository

    def list_qs(self):
        return self.repo.list_qs()

    def create(self, data: Dict[str, Any]) -> Client:
        return self.repo.create(**data)

    def update(self, pk: int, data: Dict[str, Any]) -> Client:
        obj = self.repo.get(pk)
        return self.repo.update(obj, **data)

    def delete(self, pk: int) -> None:
        obj = self.repo.get(pk)
        try:
            self.repo.delete(obj)
        except ProtectedError as e:
            _raise_delete_protected(obj=obj, pk=pk, exc=e, label="El cliente")

@dataclass
class PreTaxChargeService:
    repo: PreTaxChargeRepository

    def list_qs(self):
        return self.repo.list_qs()

    def create(self, data: Dict[str, Any]) -> PreTaxCharge:
        return self.repo.create(**data)

    def update(self, pk: int, data: Dict[str, Any]) -> PreTaxCharge:
        obj = self.repo.get(pk)
        return self.repo.update(obj, **data)

    def delete(self, pk: int) -> None:
        obj = self.repo.get(pk)
        try:
            self.repo.delete(obj)
        except ProtectedError as e:
            _raise_delete_protected(obj=obj, pk=pk, exc=e, label="La carga pre impuesto")
