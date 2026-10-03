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

    # 1. Khởi tạo 3 Kho hàng cố định với ID (1, 2, 3)
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
            }
        )
        warehouse_objs.append(wh)

    # 2. Lấy danh sách Product thực tế bắt đầu từ ID 134
    products = list(Product.objects.filter(id__gte=134).order_by("id"))
    if not products:
        # Fallback nếu DB chưa có sản phẩm >= 134
        products = list(Product.objects.all().order_by("id"))

    if not products:
        print("\n[CẢNH BÁO] Không tìm thấy sản phẩm nào trong database! Vui lòng kiểm tra lại bảng products.")
        return

    print(f"\n>>> Tìm thấy {len(products)} sản phẩm (ID từ {products[0].id} đến {products[-1].id}) để tạo tồn kho.")

    # Dọn dẹp sạch bản ghi cũ trước khi nạp mới
    StockMovement.objects.all().delete()
    Stock.objects.all().delete()

    # 3. Tạo 150 - 200 bản ghi Stock (ID từ 1 trở đi, product_id bắt đầu từ 134)
    stock_objs = []
    stock_id_counter = 1

    for prod in products:
        # Mỗi sản phẩm phân bổ ngẫu nhiên vào 2 hoặc 3 kho
        assigned_warehouses = random.sample(warehouse_objs, k=random.choice([2, 3]))

        for wh in assigned_warehouses:
            roll = random.random()
            if roll < 0.05:
                qty = 0  # Hết hàng
            elif roll < 0.20:
                qty = random.randint(1, 5)  # Dưới mức tối thiểu để test cảnh báo
            else:
                qty = random.randint(30, 160)  # Tồn kho an toàn

            min_threshold = 10

            stock_objs.append(
                Stock(
                    id=stock_id_counter,
                    product_id=prod.id,           # Gán chuẩn xác ID sản phẩm (>= 134)
                    warehouse_id=wh.id,           # Kho ID 1, 2, hoặc 3
                    quantity=qty,
                    min_threshold=min_threshold,
                    created_at=now - timedelta(days=random.randint(20, 60)),
                    updated_at=now,
                )
            )
            stock_id_counter += 1

    Stock.objects.bulk_create(stock_objs)
    print(f">>> [THÀNH CÔNG] Đã tạo {len(stock_objs)} bản ghi Stock (ID từ 1 đến {stock_id_counter - 1})")

    # 4. Tạo hơn 200 biến động kho (StockMovement)
    movement_objs = []
    movement_id_counter = 1
    order_code_idx = 88001
    import_code_idx = 1001

    for idx, stock in enumerate(stock_objs):
        # Phiếu nhập kho ban đầu (IMPORT)
        init_qty = stock.quantity + random.randint(20, 50)
        movement_objs.append(
            StockMovement(
                id=movement_id_counter,
                stock_id=stock.id,
                movement_type="IMPORT",
                quantity=init_qty,
                reference_code=f"PNK-2026-{import_code_idx}",
                note=f"Nhập lô đầu kỳ cho sản phẩm ID #{stock.product_id} vào kho ID #{stock.warehouse_id}",
                created_at=now - timedelta(days=random.randint(30, 50)),
            )
        )
        movement_id_counter += 1
        import_code_idx += 1

        # 1 - 2 phiếu xuất bán theo đơn hàng POS (EXPORT)
        for _ in range(random.randint(1, 2)):
            sold_qty = random.randint(1, 4)
            movement_objs.append(
                StockMovement(
                    id=movement_id_counter,
                    stock_id=stock.id,
                    movement_type="EXPORT",
                    quantity=sold_qty,
                    reference_code=f"ORD-2026-{order_code_idx}",
                    note=f"Trừ tồn kho tự động theo hóa đơn ORD-2026-{order_code_idx}",
                    created_at=now - timedelta(days=random.randint(1, 20), hours=random.randint(1, 12)),
                )
            )
            movement_id_counter += 1
            order_code_idx += 1

        # Phiếu chuyển kho điều phối (TRANSFER)
        if idx % 5 == 0 and stock.warehouse_id == 1:
            movement_objs.append(
                StockMovement(
                    id=movement_id_counter,
                    stock_id=stock.id,
                    movement_type="TRANSFER",
                    quantity=random.randint(5, 10),
                    reference_code=f"TRF-2026-{random.randint(100, 999)}",
                    note=f"Chuyển tiếp ứng sản phẩm ID #{stock.product_id} sang quầy Bar pha chế",
                    created_at=now - timedelta(days=random.randint(2, 10)),
                )
            )
            movement_id_counter += 1

    StockMovement.objects.bulk_create(movement_objs)
    print(f">>> [THÀNH CÔNG] Đã tạo {len(movement_objs)} bản ghi StockMovement (ID từ 1 đến {movement_id_counter - 1})")


def rollback_inventory_data(apps, schema_editor):
    StockMovement = apps.get_model("inventory", "StockMovement")
    Stock = apps.get_model("inventory", "Stock")
    Warehouse = apps.get_model("inventory", "Warehouse")

    StockMovement.objects.all().delete()
    Stock.objects.all().delete()
    Warehouse.objects.filter(id__in=[1, 2, 3]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0001_initial"),
        ("products", "0006_seed_100_products"),
    ]

    operations = [
        migrations.RunPython(seed_inventory_data, rollback_inventory_data),
    ]