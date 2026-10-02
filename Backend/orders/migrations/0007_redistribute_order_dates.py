import random
from datetime import timedelta
from django.db import migrations
from django.utils import timezone


def redistribute_order_dates(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    OrderDetail = apps.get_model("orders", "OrderDetail")

    orders = list(Order.objects.all().order_by("id"))
    total_orders = len(orders)
    if total_orders == 0:
        return

    now = timezone.now()
    DAYS_COUNT = 180
    start_date = now - timedelta(days=DAYS_COUNT)

    # Chia 2.500 đơn hàng thành 180 nhóm ngày
    chunk_size = max(1, total_orders // DAYS_COUNT)
    order_index = 0

    for day_offset in range(DAYS_COUNT):
        current_date = (start_date + timedelta(days=day_offset)).date()

        # Cuối tuần (Thứ 6, 7, CN) phân bổ nhiều đơn hơn ngày thường
        is_weekend = current_date.weekday() in [4, 5, 6]
        current_chunk = int(chunk_size * 1.5) if is_weekend else chunk_size

        day_orders = orders[order_index : order_index + current_chunk]
        order_index += current_chunk
        if not day_orders:
            break

        day_order_ids = [o.id for o in day_orders]

        # Giờ ngẫu nhiên trong ngày
        hour = random.randint(8, 21)
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        order_time = timezone.datetime(
            current_date.year,
            current_date.month,
            current_date.day,
            hour,
            minute,
            second,
            tzinfo=timezone.get_current_timezone(),
        )

        # Cập nhật theo batch (bỏ qua auto_now_add)
        Order.objects.filter(id__in=day_order_ids).update(
            created_at=order_time, updated_at=order_time
        )
        OrderDetail.objects.filter(order_id__in=day_order_ids).update(
            created_at=order_time, updated_at=order_time
        )

    # Cập nhật số đơn dư còn lại vào các ngày gần nhất
    if order_index < total_orders:
        remaining_ids = [o.id for o in orders[order_index:]]
        Order.objects.filter(id__in=remaining_ids).update(
            created_at=now, updated_at=now
        )
        OrderDetail.objects.filter(order_id__in=remaining_ids).update(
            created_at=now, updated_at=now
        )


def reverse_func(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0006_seed_apriori_dataset"),
    ]

    operations = [
        migrations.RunPython(redistribute_order_dates, reverse_func),
    ]