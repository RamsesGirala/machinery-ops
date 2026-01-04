from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

from machinery.models import MachineBase, Accessory, Tax, LogisticsLeg, Client, PreTaxCharge
from .repositories import (
    MachineBaseRepository,
    AccessoryRepository,
    TaxRepository,
    LogisticsLegRepository,
    ClientRepository,
    PreTaxChargeRepository
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
        self.repo.delete(obj)

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
        self.repo.delete(obj)

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
        self.repo.delete(obj)

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
        self.repo.delete(obj)

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
        self.repo.delete(obj)

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
        self.repo.delete(obj)
