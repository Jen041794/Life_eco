import random
import string

from django.db import migrations, models

CHARS = string.ascii_uppercase + string.digits


def populate_order_numbers(apps, schema_editor):
    """替既有訂單補上唯一的 13 碼訂單編號。"""
    Order = apps.get_model("orders", "Order")
    used = set(
        Order.objects.exclude(order_number__isnull=True)
        .exclude(order_number="")
        .values_list("order_number", flat=True)
    )
    for order in Order.objects.filter(models.Q(order_number__isnull=True) | models.Q(order_number="")):
        while True:
            number = "".join(random.choices(CHARS, k=13))
            if number not in used:
                used.add(number)
                break
        order.order_number = number
        order.save(update_fields=["order_number"])


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0003_order_recipient_name_order_recipient_phone_and_more"),
    ]

    operations = [
        # 1) 先加可空欄位（避免在有資料的表上加 NOT NULL/unique 失敗）
        migrations.AddField(
            model_name="order",
            name="order_number",
            field=models.CharField(max_length=13, null=True, editable=False),
        ),
        # 2) 替既有訂單補號
        migrations.RunPython(populate_order_numbers, migrations.RunPython.noop),
        # 3) 鎖成 unique、不可空（與 model 定義一致）
        migrations.AlterField(
            model_name="order",
            name="order_number",
            field=models.CharField(max_length=13, unique=True, editable=False),
        ),
    ]
