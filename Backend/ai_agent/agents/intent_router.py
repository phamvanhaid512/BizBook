import re
import unicodedata
from datetime import datetime, timedelta
import calendar


class IntentRouter:
    def __init__(self):
        self.intent_rules = {
            "PROFIT_QUERY": [
                "loi nhuan", "lai lo", "loi bao nhieu", "lo bao nhieu", "loi nhuan rong",
                "thu chi", "tong ket loi nhuan", "loi hay lo"
            ],
            "REVENUE_QUERY": [
                "doanh thu", "tien thu", "thu nhap", "ban duoc bao nhieu", 
                "doanh so", "kiem duoc bao nhieu", "tong thu", "tien vao", 
                "tong tien ban", "dong tien"
            ],
            "EXPENSE_QUERY": [
                "chi phi", "tien chi", "chi tieu", "tien nhap hang", "ton bao nhieu", 
                "nhap hang", "mat bang", "tien dien nuoc", "tien nguyen lieu", "tong chi"
            ],
            "TOP_PRODUCTS": [
                "ban chay", "mon hot", "dat khach", "san pham ban chay", "top mon", 
                "best seller", "mon nao ban duoc nhieu", "hang ban chay"
            ],
            "WORST_PRODUCTS": [
                "ban e", "it nguoi mua", "ban cham", "ton nhieu", "mon e", 
                "hang ton", "ban it nhat", "e am"
            ],
            "APRIORI_RULES": [
                "mua kem", "mua chung", "combo", "goi y combo", "san pham di kem", 
                "ban kem", "hay mua cung nhau", "goi kem", "mua kem mon gi"
            ],
            "CUSTOMER_CLUSTERING": [
                "khach quen", "khach vip", "nhom khach", "phan loai khach", "rfm", 
                "khach hang", "khach trung thanh", "khach moi", "khach sap bo di"
            ],
            "REVENUE_FORECAST": [
                "du bao", "du doan", "ngay mai", "tuan toi", "sap toi", 
                "xu huong", "uoc tinh doanh thu", "tuong lai"
            ],
        }

    def _remove_accents(self, text: str) -> str:
        if not text:
            return ""
        text = text.lower().strip()
        text = unicodedata.normalize("NFD", text)
        text = re.sub(r"[\u0300-\u036f]", "", text)
        return text.replace("đ", "d")

    def route(self, message: str, previous_intent: str = None) -> dict:
        msg_normalized = self._remove_accents(message)
        matched_intent = "GENERAL_ADVICE"

        for intent, keywords in self.intent_rules.items():
            if any(self._remove_accents(k) in msg_normalized for k in keywords):
                matched_intent = intent
                break

        if matched_intent == "GENERAL_ADVICE" and previous_intent:
            matched_intent = previous_intent

        entities = self._extract_entities(msg_normalized)
        return {
            "intent": matched_intent,
            "raw_message": message,
            "entities": entities
        }

    def _extract_entities(self, msg_norm: str) -> dict:
        today = datetime.now().date()
        current_year = today.year
        
        # Mặc định lấy 30 ngày gần nhất nếu không có từ khóa
        start_date = today - timedelta(days=30)
        end_date = today

        # 1. Bắt trường hợp người dùng hỏi tháng cụ thể: "thang 7", "thang 07", "thang 12"
        month_match = re.search(r"thang\s*(\d{1,2})", msg_norm)
        if month_match:
            month = int(month_match.group(1))
            if 1 <= month <= 12:
                # Lấy số ngày tối đa của tháng đó trong năm hiện tại
                _, last_day = calendar.monthrange(current_year, month)
                start_date = datetime(current_year, month, 1).date()
                end_date = datetime(current_year, month, last_day).date()
                return {
                    "date_range": [start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")]
                }

        # 2. Bắt các mốc thời gian tương đối khác
        if "hom nay" in msg_norm:
            start_date, end_date = today, today
        elif "hom qua" in msg_norm:
            yesterday = today - timedelta(days=1)
            start_date, end_date = yesterday, yesterday
        elif "thang nay" in msg_norm:
            _, last_day = calendar.monthrange(current_year, today.month)
            start_date = today.replace(day=1)
            end_date = today.replace(day=last_day)
        elif "thang truoc" in msg_norm:
            first_this_month = today.replace(day=1)
            last_month_end = first_this_month - timedelta(days=1)
            start_date = last_month_end.replace(day=1)
            end_date = last_month_end
        elif "tuan nay" in msg_norm:
            start_date = today - timedelta(days=today.weekday())
            end_date = today

        return {
            "date_range": [start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")]
        }