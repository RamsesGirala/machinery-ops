from __future__ import annotations

# Fachada/backwards-compat: mantenemos nombres usados por el viewset
from .seed_catalog import (
    SeedCatalogResult as SeedResult,
    clear_catalog,
    apply_catalog_seed as apply_seed,
)
from .seed_demo import (
    DemoSeedResult,
    clear_demo_data,
    apply_demo_seed,
)

__all__ = [
    "SeedResult",
    "DemoSeedResult",
    "clear_catalog",
    "apply_seed",
    "clear_demo_data",
    "apply_demo_seed",
]
