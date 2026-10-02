import random
from datetime import timedelta
from decimal import Decimal
from django.db import migrations
from django.utils import timezone


def seed_apriori_dataset(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    OrderDetail = apps.get_model("orders", "OrderDetail")
    Product = apps.get_model("products", "Product")
    Customer = apps.get_model("customers", "Customer")

    try:
        Bussiness_Tables = apps.get_model("bussiness_tables", "Bussiness_Tables")
        tables = list(Bussiness_Tables.objects.all())
    except LookupError:
        tables = []

    try:
        Account = apps.get_model("accounts", "Account")
        accounts = list(Account.objects.all())
    except LookupError:
        accounts = []

    now = timezone.now()
    prefix = f"APR{now.strftime('%y%m')}"

    # Dọn dẹp dữ liệu của lần chạy lỗi trước (nếu có) để tránh Duplicate entry order_code
    OrderDetail.objects.filter(order__order_code__startswith=prefix).delete()
    Order.objects.filter(order_code__startswith=prefix).delete()

    customers = list(Customer.objects.all())
    all_products = list(Product.objects.filter(status="ACTIVE"))
    if not all_products:
        all_products = list(Product.objects.all())

    product_dict = {p.product_name: p for p in all_products}

    def get_prod(keyword):
        for name, obj in product_dict.items():
            if keyword.lower() in name.lower():
                return obj
        return random.choice(all_products) if all_products else None

    # Danh sách combo phục vụ thuật toán Apriori
    combos = [
        [get_prod("Cà phê sữa đá"), get_prod("Bánh Mì Thịt Nướng Barbecue")],
        [
            get_prod("Trà Sữa Trân Châu Đường Đen"),
            get_prod("Khoai Tây Chiên Bơ Tỏi"),
            get_prod("Phô Mai Que Chiên Giòn"),
        ],
        [get_prod("Trà Đào Cam Sả"), get_prod("Bánh Tráng Trộn Sài Gòn")],
        [get_prod("Cappuccino Nóng"), get_prod("Bánh Croissant Bơ Tỏi")],
        [get_prod("Cơm Tấm Sườn Bì Chả"), get_prod("Coca Cola Lon 330ml")],
        [get_prod("Phở Bò Tái Lăn"), get_prod("Trà Tắc Mật Ong")],
        [get_prod("Cold Brew Truyền thống"), get_prod("Cheesecake Chanh Dây")],
    ]
    combos = [[p for p in group if p is not None] for group in combos if len(group) >= 2]

    TOTAL_ORDERS = 2500
    start_date = now - timedelta(days=120)

    orders_to_create = []
    # Lưu dạng: (order_code, items_data) để sau này map lại với ID
    details_plan = []

    for i in range(1, TOTAL_ORDERS + 1):
        order_code = f"{prefix}{i:05d}"
        order_time = start_date + timedelta(
            days=random.randint(0, 120),
            seconds=random.randint(0, 86400),
        )

        selected_items = set()
        if random.random() < 0.70 and combos:
            chosen_combo = random.choice(combos)
            for prod in chosen_combo:
                selected_items.add(prod)

            if random.random() < 0.5:
                extra_items = random.sample(all_products, min(random.randint(1, 2), len(all_products)))
                for prod in extra_items:
                    selected_items.add(prod)
        else:
            basket_size = random.randint(2, 4)
            selected_items = set(random.sample(all_products, min(basket_size, len(all_products))))

        total_amount = Decimal("0.00")
        items_temp = []

        for prod in selected_items:
            qty = random.randint(1, 2)
            unit_price = Decimal(str(prod.price))
            subtotal = unit_price * qty
            total_amount += subtotal

            items_temp.append({
                "product": prod,
                "quantity": qty,
                "unit_price": unit_price,
                "total_price": subtotal,
                "created_at": order_time,
                "updated_at": order_time,
            })

        order_obj = Order(
            order_code=order_code,
            customer=random.choice(customers) if customers and random.random() < 0.85 else None,
            table=random.choice(tables) if tables else None,
            created_by=random.choice(accounts) if accounts else None,
            total_amount=total_amount,
            status="COMPLETED",
            payment_status="PAID",
            note="Dữ liệu mẫu kiểm thử Apriori",
            created_at=order_time,
            updated_at=order_time,
        )
        orders_to_create.append(order_obj)
        details_plan.append((order_code, items_temp))

    # 1. Bulk Create Orders
    Order.objects.bulk_create(orders_to_create, batch_size=500)

    # 2. Lấy lại mapping order_code -> order_id trực tiếp từ DB (khắc phục lỗi MySQL không trả ID)
    order_code_to_id = dict(
        Order.objects.filter(order_code__startswith=prefix).values_list("order_code", "id")
    )

    # 3. Gán trực tiếp order_id vào OrderDetail
    details_to_create = []
    for order_code, items in details_plan:
        order_id = order_code_to_id.get(order_code)
        if not order_id:
            continue
        for item in items:
            details_to_create.append(
                OrderDetail(
                    order_id=order_id,
                    product=item["product"],
                    quantity=item["quantity"],
                    unit_price=item["unit_price"],
                    total_price=item["total_price"],
                    created_at=item["created_at"],
                    updated_at=item["updated_at"],
                )
            )

    # 4. Bulk Create OrderDetails
    OrderDetail.objects.bulk_create(details_to_create, batch_size=1000)


def reverse_apriori_dataset(apps, schema_editor):
    now = timezone.now()
    prefix = f"APR{now.strftime('%y%m')}"
    Order = apps.get_model("orders", "Order")
    OrderDetail = apps.get_model("orders", "OrderDetail")

    OrderDetail.objects.filter(order__order_code__startswith=prefix).delete()
    Order.objects.filter(order_code__startswith=prefix).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0005_orderdetail_created_at_orderdetail_updated_at"),
        ("products", "0006_seed_100_products"),
    ]

    operations = [
        migrations.RunPython(seed_apriori_dataset, reverse_apriori_dataset),
    ]