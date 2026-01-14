from __future__ import annotations

from django.contrib import admin, messages
from django.db import transaction

from .models.budget import Budget
from .models.purchase import Purchase
from .models.revenue import RevenueEvent, RevenueEventUnit


@admin.action(description="🧨 Borrado profundo (budget + compra + unidades + revenue + pagos)")
def deep_delete_budgets(modeladmin, request, queryset):
    # guardrail
    if not request.user.is_superuser:
        modeladmin.message_user(request, "Solo superusuarios pueden ejecutar borrado profundo.", level=messages.ERROR)
        return

    with transaction.atomic():
        budgets = list(queryset)

        # 1) purchases asociadas a esos budgets (OneToOne)
        purchases = list(Purchase.objects.filter(budget__in=budgets))

        # 2) unidades compradas de esas purchases
        unit_ids = []
        for p in purchases:
            unit_ids.extend(p.unidades.values_list("id", flat=True))

        # 3) borrar revenue events vinculados a esas unidades (caen pagos por CASCADE)
        deleted_events = 0
        if unit_ids:
            event_ids = (
                RevenueEventUnit.objects
                .filter(purchased_unit_id__in=unit_ids)
                .values_list("revenue_event_id", flat=True)
                .distinct()
            )
            deleted_events = RevenueEvent.objects.filter(id__in=event_ids).delete()[0]

        # 4) borrar purchases (caen purchased_units por CASCADE)
        deleted_purchases = 0
        if purchases:
            deleted_purchases = Purchase.objects.filter(id__in=[p.id for p in purchases]).delete()[0]

        # 5) borrar budgets (ahora ya no hay unidades protegiendo budget_items)
        deleted_budgets = Budget.objects.filter(id__in=[b.id for b in budgets]).delete()[0]

    modeladmin.message_user(
        request,
        f"OK. Budgets eliminados: {deleted_budgets}. Purchases eliminadas: {deleted_purchases}. "
        f"RevenueEvents eliminados (incluye pagos): {deleted_events}.",
        level=messages.SUCCESS,
    )


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ("id", "numero", "fecha", "estado", "cliente")
    search_fields = ("numero",)
    list_filter = ("estado", "fecha")

    actions = [deep_delete_budgets]

    # Bloqueamos el delete normal del admin para evitar el ProtectedError del flujo estándar
    def has_delete_permission(self, request, obj=None) -> bool:
        return False
