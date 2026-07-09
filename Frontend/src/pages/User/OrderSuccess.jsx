import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import menuApi from "../../api/menuApi";
import "./OrderSuccess.css";

function OrderSuccess() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderStatus();

    const interval = setInterval(() => {
      loadOrderStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId]);

  const loadOrderStatus = async () => {
    try {
      const res = await menuApi.getOrderStatus(orderId);

      console.log("Order:", res.data);

      if (res.data.success) {
        setOrder(res.data.data);
      } else {
        setOrder(null);
      }
    } catch (error) {
      console.error("Lỗi lấy đơn hàng:", error);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString("vi-VN") + "đ";

  const statusMap = {
    PENDING: {
      text: "Chờ quán xác nhận",
      step: 1,
    },
    PROCESSING: {
      text: "Đang chuẩn bị món",
      step: 2,
    },
    COMPLETED: {
      text: "Đã hoàn thành",
      step: 3,
    },
    CANCELLED: {
      text: "Đã hủy",
      step: 0,
    },
  };

  const currentStep = statusMap[order?.status]?.step || 1;

  if (loading) {
    return (
      <div className="order-screen-loading">
        Đang tải đơn hàng...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-screen-loading">
        Không tìm thấy đơn hàng
      </div>
    );
  }

  return (
    <div className="order-screen">
      <div className="order-appbar">
        <div>
          <p>BizBook QR Order</p>
          <h1>Theo dõi đơn hàng</h1>
        </div>

        <span className="live-dot">LIVE</span>
      </div>

      <div className="order-status-card">
        <div className="status-icon">🍽️</div>

        <div>
          <h2>{statusMap[order.status]?.text}</h2>
          <p>Đơn hàng của bạn đang được cập nhật tự động</p>
        </div>
      </div>

      <div className="tracking-card">
        <div className="tracking-row">

          <div className={`track-item ${currentStep >= 1 ? "active" : ""}`}>
            <div className="track-circle">1</div>
            <span>Đã gửi đơn</span>
          </div>

          <div className={`track-line ${currentStep >= 2 ? "active" : ""}`} />

          <div className={`track-item ${currentStep >= 2 ? "active" : ""}`}>
            <div className="track-circle">2</div>
            <span>Đang làm món</span>
          </div>

          <div className={`track-line ${currentStep >= 3 ? "active" : ""}`} />

          <div className={`track-item ${currentStep >= 3 ? "active" : ""}`}>
            <div className="track-circle">3</div>
            <span>Hoàn thành</span>
          </div>

        </div>
      </div>

      <div className="info-card">

        <div className="info-row">
          <span>Mã đơn</span>
          <strong>{order.order_code}</strong>
        </div>

        <div className="info-row">
          <span>Bàn</span>
          <strong>
            {order.table?.table_name || "Khách mang đi"}
          </strong>
        </div>

        <div className="info-row">
          <span>Khách hàng</span>
          <strong>
            {order.customer?.customer_name || "Khách QR"}
          </strong>
        </div>

        <div className="info-row">
          <span>Thanh toán</span>
          <strong
            className={
              order.payment_status === "PAID"
                ? "paid"
                : "unpaid"
            }
          >
            {order.payment_status === "PAID"
              ? "Đã thanh toán"
              : "Chưa thanh toán"}
          </strong>
        </div>

        <div className="info-row">
          <span>Thời gian</span>
          <strong>
            {new Date(order.created_at).toLocaleString("vi-VN")}
          </strong>
        </div>

      </div>

      <div className="items-card">

        <h3>Món đã đặt</h3>

        {order.details.length === 0 && (
          <p>Không có món nào.</p>
        )}

        {order.details.map((item) => (
          <div className="food-item" key={item.id}>

            <div className="food-thumb">
              {item.product_name.charAt(0)}
            </div>

            <div className="food-info">
              <h4>{item.product_name}</h4>

              <p>
                {formatMoney(item.unit_price)} × {item.quantity}
              </p>
            </div>

            <strong>
              {formatMoney(item.total_price)}
            </strong>

          </div>
        ))}

      </div>

      <div className="total-card">
        <div>
          <span>Tổng cộng</span>
          <strong>
            {formatMoney(order.total_amount)}
          </strong>
        </div>

        <p>
          Vui lòng thanh toán tại quầy sau khi dùng món.
        </p>
      </div>

      <p className="auto-refresh">
        Tự động cập nhật mỗi 5 giây
      </p>

    </div>
  );
}

export default OrderSuccess;