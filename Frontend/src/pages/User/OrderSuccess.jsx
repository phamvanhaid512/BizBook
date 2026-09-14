import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import menuApi from "../../api/menuApi";
import "./OrderSuccess.css";

function OrderSuccess() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [tableInfo, setTableInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isThankYouMode, setIsThankYouMode] = useState(false);

  // Dùng ref để tránh gọi lặp lại fetchTableDetail nhiều lần khi polling đơn hàng
  const hasFetchedTable = useRef(false);

  const fetchTableDetail = useCallback(async (tableId) => {
    if (!tableId || hasFetchedTable.current) return;
    try {
      hasFetchedTable.current = true;
      const res = await menuApi.getTableDetail(tableId);

      if (res.data?.success && res.data?.data) {
        setTableInfo(res.data.data);
      } else if (res.data?.table_name || res.data?.name) {
        setTableInfo(res.data);
      } else if (res.data) {
        setTableInfo(res.data);
      }
    } catch (err) {
      console.warn("Không thể tải thông tin chi tiết bàn:", err);
      hasFetchedTable.current = false; // Cho phép thử lại nếu lỗi
    }
  }, []);

  const loadOrderStatus = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await menuApi.getOrderStatus(orderId);

      if (res.data?.success) {
        const orderData = res.data.data;
        setOrder(orderData);

        // Trích xuất ID bàn từ nhiều định dạng backend thường trả về
        const rawTableId =
          orderData.table?.id ||
          (typeof orderData.table === "number" ? orderData.table : null) ||
          orderData.table_id;

        const currentTableName =
          orderData.table?.table_name ||
          orderData.table?.name ||
          orderData.table_name;
        
        console.log("currentTableName",orderData)

        // Nếu có ID bàn và chưa có tên bàn cụ thể, tiến hành gọi lấy chi tiết bàn
        if (rawTableId && !currentTableName) {
          fetchTableDetail(rawTableId);
        }
      } else {
        setOrder(null);
      }
    } catch (error) {
      console.error("Lỗi lấy đơn hàng:", error);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, fetchTableDetail]);

  useEffect(() => {
    loadOrderStatus();

    const interval = setInterval(() => {
      if (!isThankYouMode) {
        loadOrderStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [loadOrderStatus, isThankYouMode]);

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString("vi-VN") + "đ";

  // Kiểm tra trạng thái đã thanh toán
  const isPaid =
    order?.payment_status?.toUpperCase() === "PAID" ||
    order?.payment_status?.toUpperCase() === "COMPLETED" ||
    order?.is_paid === true;

  useEffect(() => {
    if (isPaid && !isThankYouMode) {
      const thankYouTimer = setTimeout(() => {
        setIsThankYouMode(true);
      }, 800);
      return () => clearTimeout(thankYouTimer);
    }
  }, [isPaid, isThankYouMode]);

  const statusMap = {
    NEW: { text: "Chờ quán xác nhận", step: 1 },
    PENDING: { text: "Chờ quán xác nhận", step: 1 },
    CONFIRMED: { text: "Đã xác nhận", step: 1 },
    PROCESSING: { text: "Đang chuẩn bị món", step: 2 },
    COMPLETED: { text: "Đã hoàn thành", step: 3 },
    CANCELLED: { text: "Đã hủy", step: 0 },
  };

  const currentStep = statusMap[order?.status]?.step || 1;

  const tableName =
    tableInfo?.table_name ||
    tableInfo?.name ||
    order?.table?.table_name ||
    order?.table?.name ||
    order?.table_name ||
    (order?.table_id ? `Bàn ${order.table_id}` : null) ||
    (typeof order?.table === "number" ? `Bàn ${order.table}` : null) ||
    "Khách tại bàn";

  const customerName =
    order?.customer?.customer_name ||
    order?.customer?.full_name ||
    order?.customer?.name ||
    order?.customer_name ||
    "Khách QR";

  const customerPhone =
    order?.customer?.phone ||
    order?.customer?.phone_number ||
    order?.phone_number ||
    "";

  if (loading) {
    return <div className="order-screen-loading">Đang tải đơn hàng...</div>;
  }

  if (!order) {
    return <div className="order-screen-loading">Không tìm thấy đơn hàng</div>;
  }

  // ========================================================
  // GIAO DIỆN CẢM ƠN QUÝ KHÁCH (GIỮ NGUYÊN)
  // ========================================================
  if (isThankYouMode) {
    return (
      <div className="thankyou-screen">
        <div className="thankyou-card">
          <div className="success-badge-wrapper">
            <div className="pulse-glow" />
            <div className="success-check-icon">✓</div>
          </div>

          <span className="thankyou-tag">GIAO DỊCH HOÀN TẤT</span>
          <h1>Cảm Ơn Quý Khách!</h1>
          <p className="thankyou-subtitle">
            BizBook và quán xin chân thành cảm ơn quý khách{" "}
            <strong>{customerName}</strong> đã dùng bữa. Chúc quý khách một ngày
            thật nhiều niềm vui!
          </p>

          <div className="thankyou-receipt-box">
            <div className="thankyou-row">
              <span>Bàn phục vụ:</span>
              <strong>{tableName}</strong>
            </div>
            <div className="thankyou-row">
              <span>Mã hóa đơn:</span>
              <strong>{order.order_code || order.id}</strong>
            </div>
            <div className="thankyou-row">
              <span>Thời gian thanh toán:</span>
              <strong>{new Date().toLocaleTimeString("vi-VN")}</strong>
            </div>
            <div className="thankyou-row">
              <span>Tổng thanh toán:</span>
              <strong className="thankyou-total">
                {formatMoney(order.total_amount)}
              </strong>
            </div>
            <div className="thankyou-row">
              <span>Trạng thái:</span>
              <span className="badge-paid">ĐÃ THANH TOÁN THÀNH CÔNG</span>
            </div>
          </div>

          <div className="thankyou-footer">
            <button
              className="btn-back-menu"
              onClick={() => {
                console.log("haipham",order)
                const tId = order?.table || order?.table;
                navigate(tId ? `/menu/table/${tId}` : "/menu/table/1");
              }}
            >
              Gọi thêm món / Đặt lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // GIAO DIỆN THEO DÕI ĐƠN HÀNG (LIVE TRACKING)
  // ========================================================
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
          <h2>{statusMap[order.status]?.text || "Đang cập nhật"}</h2>
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
          <strong>{order.order_code || order.id}</strong>
        </div>

        <div className="info-row">
          <span>Bàn</span>
          <strong>{tableName}</strong>
        </div>

        <div className="info-row">
          <span>Khách hàng</span>
          <strong>
            {customerName} {customerPhone ? `(${customerPhone})` : ""}
          </strong>
        </div>

        <div className="info-row">
          <span>Thanh toán</span>
          <strong className={isPaid ? "paid" : "unpaid"}>
            {isPaid ? "Đã thanh toán" : "Chưa thanh toán"}
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
        {(!order.details || order.details.length === 0) && (
          <p>Không có món nào.</p>
        )}

        {order.details?.map((item) => (
          <div className="food-item" key={item.id}>
            <div className="food-thumb">
              {(item.product_name || item.product?.product_name || "M").charAt(0)}
            </div>

            <div className="food-info">
              <h4>{item.product_name || item.product?.product_name}</h4>
              <p>
                {formatMoney(item.unit_price)} × {item.quantity}
              </p>
            </div>

            <strong>
              {formatMoney(item.total_price || item.line_total)}
            </strong>
          </div>
        ))}
      </div>

      <div className="total-card">
        <div>
          <span>Tổng cộng</span>
          <strong>{formatMoney(order.total_amount)}</strong>
        </div>
        <p>Vui lòng thanh toán tại quầy sau khi dùng món.</p>
      </div>

      <p className="auto-refresh">Tự động cập nhật mỗi 5 giây</p>
    </div>
  );
}

export default OrderSuccess;