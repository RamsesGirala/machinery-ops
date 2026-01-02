from __future__ import annotations

from dataclasses import dataclass
from typing import Type, TypeVar

from django.db import models

from machinery.models import MachineBase, Accessory, Tax, LogisticsLeg

ModelT = TypeVar("ModelT", bound=models.Model)

@dataclass(frozen=True)
class BaseRepository:
    model: Type[ModelT]

    def get(self, pk: int) -> ModelT:
        return self.model.objects.get(pk=pk)

    def list_qs(self) -> models.QuerySet[ModelT]:
        return self.model.objects.all()

    def create(self, **kwargs) -> ModelT:
        return self.model.objects.create(**kwargs)

    def update(self, instance: ModelT, **kwargs) -> ModelT:
        for k, v in kwargs.items():
            setattr(instance, k, v)
        instance.save(update_fields=list(kwargs.keys()))
        return instance

    def delete(self, instance: ModelT) -> None:
        instance.delete()


class MachineBaseRepository(BaseRepository):
    def __init__(self) -> None:
        super().__init__(model=MachineBase)


class AccessoryRepository(BaseRepository):
    def __init__(self) -> None:
        super().__init__(model=Accessory)


class TaxRepository(BaseRepository):
    def __init__(self) -> None:
        super().__init__(model=Tax)


class LogisticsLegRepository(BaseRepository):
    def __init__(self) -> None:
        super().__init__(model=LogisticsLeg)
