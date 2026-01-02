from __future__ import annotations

from dataclasses import dataclass
from typing import Type, TypeVar

from django.db import models

from machinery.models import (
    Budget,
    BudgetItem,
    BudgetItemAccessory,
    BudgetTaxApplied,
    BudgetSelectedLogisticsLeg,
)

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

    def delete(self, instance: ModelT) -> None:
        instance.delete()


class BudgetRepository(BaseRepository):
    def __init__(self) -> None:
        super().__init__(model=Budget)

    def get_by_id_for_update(self, budget_id: int) -> Budget:
        return Budget.objects.select_for_update().get(pk=budget_id)


class BudgetItemRepository(BaseRepository):
    def __init__(self) -> None:
        super().__init__(model=BudgetItem)


class BudgetItemAccessoryRepository(BaseRepository):
    def __init__(self) -> None:
        super().__init__(model=BudgetItemAccessory)


class BudgetTaxAppliedRepository(BaseRepository):
    def __init__(self) -> None:
        super().__init__(model=BudgetTaxApplied)


class BudgetSelectedLogisticsLegRepository(BaseRepository):
    def __init__(self) -> None:
        super().__init__(model=BudgetSelectedLogisticsLeg)
