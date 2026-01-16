from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("machinery", "0002_alter_purchase_budget_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="budgetpretaxchargeapplied",
            name="applied_to_budget_item_ids",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
