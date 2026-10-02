from django.db import migrations

def populate_all_images(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    
    # Danh sách chuẩn xác 100% đủ 33 món (bao gồm cả các ID dự phòng bị ẩn)
    avatar_mapping = {
        1: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=500&q=80",  # Cà phê đen
        2: "https://images.unsplash.com/photo-1579888944880-d98341245702?w=500&q=80",  # Cà phê sữa
        3: "https://images.unsplash.com/photo-1534685715886-5778f24419cb?w=500&q=80",  # Bạc xỉu
        4: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500&q=80",  # Espresso
        5: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500&q=80",  # Latte
        6: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&q=80",  # Cappuccino
        7: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80",  # Trà đào
        8: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=500&q=80",  # Trà vải
        9: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80",  # Trà chanh
        10: "https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?w=500&q=80", # Trà tắc
        11: "https://images.unsplash.com/photo-1543621721-4f1155986968?w=500&q=80", # Trà sữa (Dự phòng)
        12: "https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=500&q=80", # Matcha Latte
        13: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80", # Nước ép cam
        14: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=500&q=80", # Nước ép táo
        15: "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=500&q=80", # Nước ép dưa hấu
        16: "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=500&q=80", # Nước ép thơm
        17: "https://images.unsplash.com/photo-1605270275822-446a8d672728?w=500&q=80", # Sinh tố bơ
        18: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=500&q=80", # Sinh tố xoài
        19: "https://images.unsplash.com/photo-1553530666-ba11a7ddbb58?w=500&q=80", # Sinh tố dâu
        20: "https://images.unsplash.com/photo-1577805947697-89e18249d767?w=500&q=80", # Sinh tố (Dự phòng)
        21: "https://images.unsplash.com/photo-1572490122747-3968b75bb8fb?w=500&q=80", # Chocolate đá xay
        22: "https://images.unsplash.com/photo-1558236284-e9185a6eb8a4?w=500&q=80", # Cookie đá xay
        23: "https://images.unsplash.com/photo-1553177595-4de2bb0842b9?w=500&q=80", # Caramel đá xay
        24: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=500&q=80", # Tiramisu
        25: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500&q=80", # Cheesecake
        26: "https://images.unsplash.com/photo-1502004960551-dc67f7c24cb3?w=500&q=80", # Bánh Flan
        27: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80", # Bánh mì chà bông
        28: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80", # Sandwich
        29: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80", # Coca Cola
        30: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=500&q=80", # Pepsi
        31: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80", # Nước ngọt (Dự phòng)
        32: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=500&q=80", # Nước tinh khiết (Dự phòng)
        33: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&q=80", # Khoai tây chiên
    }
    
    # Ảnh mặc định nếu có món ID 34, 35... phát sinh
    default_img = "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=500&q=80"
    
    products_to_update = []
    # Lưu ý: Cột của bạn lưu trong DB là image_avatar
    for product in Product.objects.all():
        product.image_avatar = avatar_mapping.get(product.id, default_img)
        products_to_update.append(product)
        
    if products_to_update:
        Product.objects.bulk_update(products_to_update, ['image_avatar'])

class Migration(migrations.Migration):

    dependencies = [
        # ĐÃ SỬA LẠI THÀNH FILE GỐC CỦA BẠN ĐỂ KHÔNG BỊ LỖI NODE NOT FOUND
        ('products', '0004_product_image_avatar'), 
    ]

    operations = [
        migrations.RunPython(populate_all_images),
    ]