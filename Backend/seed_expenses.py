import os
import sys
import django
import random
from datetime import date
from decimal import Decimal

# 1. Khởi tạo môi trường Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.models import Account
from expenses.models import ExpenseCategory, Expenses


def run_seed_expenses():
    print("⏳ Đang khởi tạo dữ liệu chi phí (Expenses) tháng 7, 8, 9/2026...")

    # Lấy tài khoản quản trị
    admin_user = Account.objects.first()

    # 2. Khởi tạo các danh mục chi phí mẫu nếu chưa có
    categories_def = {
        "Mặt bằng": "Tiền thuê địa điểm kinh doanh hàng tháng",
        "Nhập nguyên vật liệu": "Tiền mua hạt cà phê, trà, sữa đặc, siro, bánh mì",
        "Điện nước & Internet": "Hóa đơn điện lực, nước sinh hoạt, mạng cáp quang",
        "Lương nhân viên": "Tiền công trả cho nhân viên phục vụ, pha chế",
        "Chi phí khác": "Mua sắm dụng cụ, đồ dùng vệ sinh, bao bì mang đi",
    }

    category_map = {}
    for cat_name, desc in categories_def.items():
        cat_obj, _ = ExpenseCategory.objects.get_or_create(
            name=cat_name, defaults={"description": desc}
        )
        category_map[cat_name] = cat_obj

    # 3. Danh sách chi tiết chi phí phân bổ tháng 7, 8, 9 năm 2026
    expenses_data = [
        # ==================== THÁNG 7/2026 ====================
        ("Mặt bằng", Decimal("10000000"), date(2026, 7, 1), "Tiền thuê mặt bằng tháng 07/2026", "CONFIRMED", "receipt_mb_07.jpg"),
        ("Nhập nguyên vật liệu", Decimal("3200000"), date(2026, 7, 2), "Nhập hạt Robusta và Arabica đầu tháng", "CONFIRMED", "ocr_cf_0702.png"),
        ("Nhập nguyên vật liệu", Decimal("1800000"), date(2026, 7, 5), "Nhập sữa đặc, sữa tươi thanh trùng", "CONFIRMED", "bill_sua_0705.jpg"),
        ("Điện nước & Internet", Decimal("2150000"), date(2026, 7, 8), "Thanh toán tiền điện quán tháng 6", "CONFIRMED", "bill_dien_0708.png"),
        ("Chi phí khác", Decimal("450000"), date(2026, 7, 10), "Mua ly nhựa, ống hút giấy và túi mang về", "CONFIRMED", "receipt_ly_0710.jpg"),
        ("Nhập nguyên vật liệu", Decimal("2500000"), date(2026, 7, 12), "Nhập trà đào, siro bạc hà và đào ngâm", "CONFIRMED", "bill_tra_0712.png"),
        ("Nhập nguyên vật liệu", Decimal("1400000"), date(2026, 7, 16), "Nhập bánh mì và pate, sốt bơ", "CONFIRMED", "bill_bm_0716.jpg"),
        ("Điện nước & Internet", Decimal("350000"), date(2026, 7, 18), "Thanh toán cước Internet cáp quang", "CONFIRMED", "bill_net_0718.png"),
        ("Nhập nguyên vật liệu", Decimal("2800000"), date(2026, 7, 20), "Nhập bổ sung cà phê và sữa tươi", "CONFIRMED", "bill_cf_0720.jpg"),
        ("Chi phí khác", Decimal("300000"), date(2026, 7, 23), "Mua nước lau sàn, xà phòng rửa ly", "CONFIRMED", "receipt_vs_0723.jpg"),
        ("Nhập nguyên vật liệu", Decimal("1900000"), date(2026, 7, 26), "Nhập khoai tây đông lạnh và xúc xích", "CONFIRMED", "bill_anvat_0726.png"),
        ("Lương nhân viên", Decimal("6500000"), date(2026, 7, 31), "Chi trả lương nhân viên phục vụ tháng 7", "CONFIRMED", "salary_07.pdf"),

        # ==================== THÁNG 8/2026 ====================
        ("Mặt bằng", Decimal("10000000"), date(2026, 8, 1), "Tiền thuê mặt bằng tháng 08/2026", "CONFIRMED", "receipt_mb_08.jpg"),
        ("Nhập nguyên vật liệu", Decimal("3800000"), date(2026, 8, 3), "Nhập hạt cà phê và trà xanh pha chế", "CONFIRMED", "ocr_cf_0803.png"),
        ("Điện nước & Internet", Decimal("2400000"), date(2026, 8, 7), "Tiền điện máy lạnh cao điểm tháng 7", "CONFIRMED", "bill_dien_0807.png"),
        ("Nhập nguyên vật liệu", Decimal("2100000"), date(2026, 8, 10), "Nhập sữa đặc đóng thùng và sốt caramel", "CONFIRMED", "bill_sua_0810.jpg"),
        ("Chi phí khác", Decimal("600000"), date(2026, 8, 13), "Thay bộ lọc nước quầy pha chế", "CONFIRMED", "receipt_locnuoc_0813.jpg"),
        ("Nhập nguyên vật liệu", Decimal("2700000"), date(2026, 8, 16), "Nhập đào ngâm, chanh vàng và cam sả", "CONFIRMED", "bill_tra_0816.jpg"),
        ("Điện nước & Internet", Decimal("350000"), date(2026, 8, 19), "Cước Internet tháng 8", "CONFIRMED", "bill_net_0819.png"),
        ("Nhập nguyên vật liệu", Decimal("3100000"), date(2026, 8, 22), "Nhập thêm hạt Robusta đóng gói 1kg", "CONFIRMED", "ocr_cf_0822.png"),
        ("Nhập nguyên vật liệu", Decimal("1650000"), date(2026, 8, 25), "Nhập vỏ bánh mì tươi và pate", "CONFIRMED", "bill_bm_0825.jpg"),
        ("Chi phí khác", Decimal("400000"), date(2026, 8, 28), "Mua cuộn giấy in bill tính tiền", "CONFIRMED", "receipt_giayin_0828.jpg"),
        ("Lương nhân viên", Decimal("6500000"), date(2026, 8, 31), "Chi trả lương nhân viên phục vụ tháng 8", "CONFIRMED", "salary_08.pdf"),

        # ==================== THÁNG 9/2026 ====================
        ("Mặt bằng", Decimal("10000000"), date(2026, 9, 1), "Tiền thuê mặt bằng tháng 09/2026", "CONFIRMED", "receipt_mb_09.jpg"),
        ("Nhập nguyên vật liệu", Decimal("3500000"), date(2026, 9, 1), "Nhập cà phê và nguyên liệu lễ 2/9", "CONFIRMED", "ocr_cf_0901.png"),
        ("Chi phí khác", Decimal("500000"), date(2026, 9, 1), "Trang trí cờ hoa ngày Quốc Khánh 2/9", "CONFIRMED", "receipt_decor_0901.jpg"),
    ]

    created_count = 0
    for cat_name, amount, exp_date, desc, status, img in expenses_data:
        # Kiểm tra tránh tạo trùng nếu đã tồn tại bản ghi cùng ngày và cùng mô tả
        if Expenses.objects.filter(expense_date=exp_date, description=desc).exists():
            continue

        Expenses.objects.create(
            user=admin_user,
            category=category_map[cat_name],
            amount=amount,
            expense_date=exp_date,
            description=desc,
            status=status,
            receipt_image=img,
        )
        created_count += 1

    print(f"🎉 Hoàn tất! Đã thêm thành công {created_count} khoản chi phí mẫu cho tháng 7, 8, 9/2026.")


if __name__ == "__main__":
    run_seed_expenses()