import random
from datetime import date, timedelta
from decimal import Decimal
from django.db import migrations
from django.utils import timezone


def seed_orders_from_september(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    OrderDetail = apps.get_model("orders", "OrderDetail")
    Product = apps.get_model("products", "Product")

    products = list(Product.objects.all())
    if not products:
        print("⚠️ Không tìm thấy sản phẩm nào trong DB để tạo chi tiết đơn hàng.")
        return

    start_date = date(2026, 9, 1)
    end_date = timezone.localdate()

    if start_date > end_date:
        return

    current_tz = timezone.get_current_timezone()
    delta_days = (end_date - start_date).days + 1

    print(f"\n🚀 Đang tạo dữ liệu đơn hàng từ {start_date} đến {end_date} ({delta_days} ngày)...")

    order_fields = [f.name for f in Order._meta.get_fields()]
    order_detail_fields = [f.name for f in OrderDetail._meta.get_fields()]

    for day_offset in range(delta_days):
        cur_date = start_date + timedelta(days=day_offset)
        is_weekend = cur_date.weekday() in [4, 5, 6]
        orders_today_count = random.randint(18, 30) if is_weekend else random.randint(8, 16)

        for seq in range(orders_today_count):
            hour = random.randint(8, 21)
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            order_time = timezone.datetime(
                cur_date.year,
                cur_date.month,
                cur_date.day,
                hour,
                minute,
                second,
                tzinfo=current_tz,
            )

            order_create_kwargs = {
                "status": "COMPLETED",
                "total_amount": Decimal("0.0"),
            }
            if "created_at" in order_fields:
                order_create_kwargs["created_at"] = order_time
            if "updated_at" in order_fields:
                order_create_kwargs["updated_at"] = order_time

            unique_code = f"ORD{cur_date.strftime('%Y%m%d')}{hour:02d}{minute:02d}{seq:02d}{random.randint(100, 999)}"
            for code_field in ["order_code", "code", "invoice_number", "order_number"]:
                if code_field in order_fields:
                    order_create_kwargs[code_field] = unique_code

            order = Order.objects.create(**order_create_kwargs)

            num_items = random.randint(1, 4)
            selected_products = random.sample(products, min(num_items, len(products)))

            order_total = Decimal("0.0")
            for prod in selected_products:
                qty = random.randint(1, 3)
                prod_price = getattr(prod, "price", Decimal("35000.0"))
                subtotal = prod_price * qty
                order_total += subtotal

                detail_kwargs = {
                    "order": order,
                    "product": prod,
                    "quantity": qty,
                }

                if "unit_price" in order_detail_fields:
                    detail_kwargs["unit_price"] = prod_price
                elif "price" in order_detail_fields:
                    detail_kwargs["price"] = prod_price
                elif "item_price" in order_detail_fields:
                    detail_kwargs["item_price"] = prod_price

                if "subtotal" in order_detail_fields:
                    detail_kwargs["subtotal"] = subtotal
                elif "total_price" in order_detail_fields:
                    detail_kwargs["total_price"] = subtotal

                if "created_at" in order_detail_fields:
                    detail_kwargs["created_at"] = order_time
                if "updated_at" in order_detail_fields:
                    detail_kwargs["updated_at"] = order_time

                OrderDetail.objects.create(**detail_kwargs)

            update_data = {"total_amount": order_total}
            if "created_at" in order_fields:
                update_data["created_at"] = order_time
            if "updated_at" in order_fields:
                update_data["updated_at"] = order_time

            Order.objects.filter(id=order.id).update(**update_data)


def reverse_func(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    start_date = timezone.datetime(2026, 9, 1, 0, 0, 0, tzinfo=timezone.get_current_timezone())
    Order.objects.filter(created_at__gte=start_date).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0007_redistribute_order_dates"),
    ]

    operations = [
        migrations.RunPython(seed_orders_from_september, reverse_func),
    ]