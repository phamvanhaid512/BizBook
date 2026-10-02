import random
from datetime import timedelta
from django.db import migrations
from django.utils import timezone


def seed_inventory_data(apps, schema_editor):
    Warehouse = apps.get_model("inventory", "Warehouse")
    Stock = apps.get_model("inventory", "Stock")
    StockMovement = apps.get_model("inventory", "StockMovement")
    Product = apps.get_model("products", "Product")

    random.seed(42)
    now = timezone.now()

    # 1. Khởi tạo 3 kho hàng cố định
    warehouses_data = [
        {"id": 1, "code": "KHO-TONG", "name": "Kho Tổng Trung Tâm", "location": "Tổng kho BizBook Hub"},
        {"id": 2, "code": "KHO-BAR-01", "name": "Kho Quầy Pha Chế Bar 01", "location": "Quầy Bar Tầng 1"},
        {"id": 3, "code": "KHO-CN2", "name": "Kho Chi Nhánh 2", "location": "Chi nhánh BizBook Quận 3"},
    ]

    warehouse_objs = []
    for w in warehouses_data:
        wh, _ = Warehouse.objects.update_or_create(
            id=w["id"],
            defaults={
                "code": w["code"],
                "name": w["name"],
                "location": w["location"],
                "status": "ACTIVE",
                "created_at": now - timedelta(days=60),
            },
        )
        warehouse_objs.append(wh)

    # 2. Lấy danh sách Product bắt đầu từ ID 134
    products = list(Product.objects.filter(id__gte=134).order_by("id"))
    if not products:
        products = list(Product.objects.all().order_by("id"))

    if not products:
        print("\n[CẢNH BÁO] Không tìm thấy sản phẩm nào! Vui lòng kiểm tra lại bảng products.")
        return

    print(f"\n>>> Đang seed tồn kho cho {len(products)} sản phẩm (ID từ {products[0].id} đến {products[-1].id})...")

    # Dọn dẹp dữ liệu tồn kho cũ của riêng các sản phẩm này
    product_ids = [p.id for p in products]
    old_stocks = Stock.objects.filter(product_id__in=product_ids)
    StockMovement.objects.filter(stock__in=old_stocks).delete()
    old_stocks.delete()

    # 3. Tạo bản ghi Stock (Tồn kho)
    stock_objs = []
    for prod in products:
        # Mỗi sản phẩm ngẫu nhiên lưu tại 2 hoặc 3 kho
        assigned_warehouses = random.sample(warehouse_objs, k=random.choice([2, 3]))

        for wh in assigned_warehouses:
            roll = random.random()
            if roll < 0.05:
                qty = 0  # Hết hàng
            elif roll < 0.20:
                qty = random.randint(1, 8)  # Chạm ngưỡng tối thiểu
            else:
                qty = random.randint(30, 150)  # Tồn kho dồi dào

            stock_objs.append(
                Stock(
                    product_id=prod.id,
                    warehouse_id=wh.id,
                    quantity=qty,
                    min_threshold=10,
                    created_at=now - timedelta(days=random.randint(20, 50)),
                    updated_at=now,
                )
            )

    Stock.objects.bulk_create(stock_objs)
    print(f">>> [THÀNH CÔNG] Đã tạo Stock cho {len(products)} sản phẩm.")

    # 4. Tạo lịch sử biến động kho (StockMovement)
    saved_stocks = list(Stock.objects.filter(product_id__in=product_ids))
    movement_objs = []
    order_code_idx = 88001
    import_code_idx = 1001

    for idx, stock in enumerate(saved_stocks):
        # Phiếu nhập kho ban đầu (IMPORT)
        init_qty = stock.quantity + random.randint(20, 40)
        movement_objs.append(
            StockMovement(
                stock_id=stock.id,
                movement_type="IMPORT",
                quantity=init_qty,
                reference_code=f"PNK-2026-{import_code_idx}",
                note=f"Nhập hàng ban đầu cho sản phẩm #{stock.product_id} vào kho {stock.warehouse_id}",
                created_at=now - timedelta(days=random.randint(30, 50)),
            )
        )
        import_code_idx += 1

        # Xuất bán đơn hàng POS (EXPORT)
        for _ in range(random.randint(1, 2)):
            movement_objs.append(
                StockMovement(
                    stock_id=stock.id,
                    movement_type="EXPORT",
                    quantity=random.randint(1, 4),
                    reference_code=f"ORD-2026-{order_code_idx}",
                    note=f"Xuất bán đơn hàng POS ORD-2026-{order_code_idx}",
                    created_at=now - timedelta(days=random.randint(1, 20), hours=random.randint(1, 10)),
                )
            )
            order_code_idx += 1

        # Phiếu chuyển kho điều phối (TRANSFER)
        if idx % 4 == 0 and stock.warehouse_id == 1:
            movement_objs.append(
                StockMovement(
                    stock_id=stock.id,
                    movement_type="TRANSFER",
                    quantity=random.randint(5, 10),
                    reference_code=f"TRF-2026-{random.randint(100, 999)}",
                    note=f"Điều chuyển điều phối sang quầy Bar pha chế",
                    created_at=now - timedelta(days=random.randint(2, 10)),
                )
            )

    StockMovement.objects.bulk_create(movement_objs)
    print(f">>> [THÀNH CÔNG] Đã tạo {len(movement_objs)} biến động kho (StockMovement).")


def rollback_inventory_data(apps, schema_editor):
    Warehouse = apps.get_model("inventory", "Warehouse")
    Stock = apps.get_model("inventory", "Stock")
    StockMovement = apps.get_model("inventory", "StockMovement")

    stocks = Stock.objects.filter(warehouse_id__in=[1, 2, 3])
    StockMovement.objects.filter(stock__in=stocks).delete()
    stocks.delete()
    Warehouse.objects.filter(id__in=[1, 2, 3]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0002_seed_inventory_data"),  # Nối tiếp file 0002 hiện có
        ("products", "0006_seed_100_products"),      # Chờ seed xong 100 sản phẩm
    ]

    operations = [
        migrations.RunPython(seed_inventory_data, rollback_inventory_data),
    ]