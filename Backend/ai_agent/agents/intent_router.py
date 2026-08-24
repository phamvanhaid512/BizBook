import re
import unicodedata


class IntentRouter:
    FORECASTING = "forecasting"
    APRIORI = "apriori"
    BUSINESS_OVERVIEW = "business_overview"
    CAPABILITIES = "capabilities"
    GENERAL = "general"

    def route(self, message, previous_intent=None):
        normalized = self._normalize(message)
        days = self._extract_days(normalized)

        forecasting_keywords = [
            "du bao",
            "doanh thu tuong lai",
            "doanh thu sap toi",
            "tuan toi",
            "thang toi",
            "xu huong doanh thu",
        ]
        apriori_keywords = [
            "mua cung",
            "ban kem",
            "combo",
            "san pham lien quan",
            "apriori",
        ]
        overview_keywords = [
            "tong quan",
            "tinh hinh kinh doanh",
            "bao cao kinh doanh",
            "doanh thu hien tai",
            "san pham ban chay",
        ]
        capability_keywords = [
            "ban lam duoc gi",
            "tro ly lam duoc gi",
            "huong dan",
            "giup gi",
        ]

        if any(keyword in normalized for keyword in forecasting_keywords):
            intent = self.FORECASTING
        elif any(keyword in normalized for keyword in apriori_keywords):
            intent = self.APRIORI
        elif any(keyword in normalized for keyword in overview_keywords):
            intent = self.BUSINESS_OVERVIEW
        elif any(keyword in normalized for keyword in capability_keywords):
            intent = self.CAPABILITIES
        elif previous_intent and (
            days is not None
            or normalized.startswith(("con", "vay", "neu", "the"))
        ):
            intent = previous_intent
        else:
            intent = self.GENERAL

        return {
            "intent": intent,
            "entities": {
                "days": days,
                "product_name": self._extract_product_name(message),
            },
            "normalized_message": normalized,
        }

    @staticmethod
    def _normalize(value):
        value = value.lower().strip()
        value = "".join(
            character
            for character in unicodedata.normalize("NFD", value)
            if unicodedata.category(character) != "Mn"
        )
        return re.sub(r"\s+", " ", value)

    @staticmethod
    def _extract_days(normalized_message):
        match = re.search(
            r"(\d{1,3})\s*(ngay|day)",
            normalized_message,
        )

        if match:
            return max(1, min(int(match.group(1)), 90))

        if "tuan toi" in normalized_message:
            return 7

        if "thang toi" in normalized_message:
            return 30

        return None

    @staticmethod
    def _extract_product_name(original_message):
        patterns = [
            r"(?:với|cùng|cho)\s+(.+?)(?:\?|$)",
            r"sản phẩm\s+(.+?)(?:\?|$)",
        ]

        for pattern in patterns:
            match = re.search(
                pattern,
                original_message,
                flags=re.IGNORECASE,
            )
            if match:
                value = match.group(1).strip(" .?!")
                if value:
                    return value

        return None
