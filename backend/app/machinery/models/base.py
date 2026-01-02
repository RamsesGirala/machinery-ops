from __future__ import annotations

from decimal import Decimal
from django.core.validators import MinValueValidator
from django.db import models

USD_VALIDATOR = MinValueValidator(Decimal("0.00"))


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
