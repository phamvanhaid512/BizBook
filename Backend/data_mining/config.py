from django.conf import settings


DEFAULT_DATA_MINING_CONFIG = {
    "ORDER_MODEL": "orders.Order",
    "ORDER_DETAIL_MODEL": "orders.OrderDetail",
    "ORDER_DATE_FIELD": "created_at",
    "ORDER_TOTAL_FIELD": "total_price",
    "ORDER_STATUS_FIELD": "status",
    "COMPLETED_STATUS_VALUES": ["COMPLETED"],
    "DETAIL_ORDER_FIELD": "order",
    "DETAIL_PRODUCT_FIELD": "product",
    "DETAIL_QUANTITY_FIELD": "quantity",
    "PRODUCT_NAME_FIELD": "product_name",
}


def get_data_mining_config():
    config = DEFAULT_DATA_MINING_CONFIG.copy()
    config.update(getattr(settings, "DATA_MINING_CONFIG", {}))
    return config
