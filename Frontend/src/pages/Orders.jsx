import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import orderApi from "../api/orderApi";
import "./Orders.css";

const initialPagination = {
  current_page: 1,
  page_size: 5,
  total_items: 0,
  total_pages: 1,
  has_next: false,
  has_previous: false,
};

function Orders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [pagination, setPagination] = useState(initialPagination);

  const statusMap = {
    PENDING: {
      text: "Chờ xác nhận",
      step: 1,
      className: "pending",
    },
    PROCESSING: {
      text: "Đang chuẩn bị",
      step: 2,
      className: "processing",
    },
    COMPLETED: {
      text: "Hoàn thành",
      step: 3,
      className: "completed",
    },
    CANCELLED: {
      text: "Đã hủy",
      step: 0,
      className: "cancelled",
    },
  };

  useEffect(() => {
    loadOrders();
  }, [currentPage, itemsPerPage, statusFilter]);

  const loadOrders = async () => {
    try {
      const res = await orderApi.getAll({
        page: currentPage,
        page_size: itemsPerPage,
        status: statusFilter,
      });

      const result = res.data?.data || {};
      const orderItems = result.items || [];

      setOrders(orderItems);
      setPagination(result.pagination || initialPagination);

      if (orderItems.length > 0) {
        setSelectedOrder(orderItems[0]);
      } else {
        setSelectedOrder(null);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách đơn hàng");
      console.log("Lỗi load đơn hàng:", error);

      setOrders([]);
      setSelectedOrder(null);
    }
  };

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  };

  const getStatusInfo = (status) => {
    return (
      statusMap[status] || {
        text: "Chờ xác nhận",
        step: 1,
        className: "pending",
      }
    );
  };

  // Giả sử component nhận vào `orderId` hoặc bạn lấy từ hook/state
  // Sửa useEffect WebSocket
  useEffect(() => {
    // Sử dụng selectedOrder?.id thay vì orderId
    if (!selectedOrder?.id) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    const wsUrl = `${backendUrl.replace(/^http/, "ws")}/ws/orders/${selectedOrder.id}/`;
    console.log("wsUrl",wsUrl)
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log(`WebSocket Connected successfully to order: ${selectedOrder.id}`);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Realtime update received for order:", data);
        loadOrders();
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onclose = (event) => {
      console.log("WebSocket Closed. Code:", event.code);
    };

    socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    return () => {
      socket.close();
    };
  }, [selectedOrder?.id]); // Dependency array cập nhật theo selectedOrder.id
  // 
  //  // Bắt buộc phải đưa orderId vào dependency array để cập nhật kết nối khi ID thay đổi
  const updateOrderStatus = async (status) => {
    if (!selectedOrder) return;
    console.log("status", status)
    console.log("selectedOrder", selectedOrder)

    try {
      await orderApi.updatOrderStatus(selectedOrder.id, {
        status,
      });
      toast.success("Cập nhật trạng thái đơn hàng thành công");

      const updatedOrders = orders.map((order) =>
        order.id === selectedOrder.order_code ? { ...order, status } : order
      );

      setOrders(updatedOrders);

      setSelectedOrder((prev) => ({
        ...prev,
        status,
      }));
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Cập nhật trạng thái thất bại"
      );
      console.log("Lỗi cập nhật trạng thái:", error);
    }
  };

  const updatePaymentStatus = async () => {
    if (!selectedOrder) return;

    try {
      await orderApi.updatePaymentStatus(selectedOrder.id, {
        payment_status: "PAID",
      });

      toast.success("Cập nhật thanh toán thành công");

      const updatedOrders = orders.map((order) =>
        order.id === selectedOrder.id
          ? { ...order, payment_status: "PAID" }
          : order
      );

      setOrders(updatedOrders);

      setSelectedOrder((prev) => ({
        ...prev,
        payment_status: "PAID",
      }));
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Cập nhật thanh toán thất bại"
      );
      console.log("Lỗi cập nhật thanh toán:", error);
    }
  };

  const getStartItem = () => {
    if ((pagination.total_items || 0) === 0) return 0;
    return (currentPage - 1) * itemsPerPage + 1;
  };

  const getEndItem = () => {
    return Math.min(currentPage * itemsPerPage, pagination.total_items || 0);
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) =>
      Math.min(prev + 1, pagination.total_pages || 1)
    );
  };

  const currentStep = selectedOrder
    ? getStatusInfo(selectedOrder.status).step
    : 1;

  return (
    <div className="orders-page">
      <div className="orders-header">
        <div>
          <h1>Quản lý đơn hàng</h1>
          <p>Theo dõi đơn QR realtime theo phong cách giao đồ ăn</p>
        </div>

        <div className="orders-live">
          <span></span>
          LIVE ORDER
        </div>
      </div>

      <div className="orders-stat-grid">
        <div className="order-stat-card orange">
          <span>Tổng đơn</span>
          <strong>{pagination.total_items || 0}</strong>
        </div>

        <div className="order-stat-card blue">
          <span>Trang hiện tại</span>
          <strong>{pagination.current_page || currentPage}</strong>
        </div>

        <div className="order-stat-card green">
          <span>Tổng trang</span>
          <strong>{pagination.total_pages || 1}</strong>
        </div>

        <div className="order-stat-card red">
          <span>Số đơn trang này</span>
          <strong>{orders.length}</strong>
        </div>
      </div>

      <div className="orders-layout">
        <section className="orders-list-card">
          <div className="orders-list-top">
            <h2>Danh sách đơn</h2>

            <select value={statusFilter} onChange={handleStatusFilter}>
              <option value="ALL">Tất cả</option>
              <option value="PENDING">Chờ xác nhận</option>
              <option value="PROCESSING">Đang chuẩn bị</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          <div className="orders-list">
            {orders.length > 0 ? (
              orders.map((order) => {
                const statusInfo = getStatusInfo(order.status);

                return (
                  <button
                    key={order.id}
                    className={
                      selectedOrder?.id === order.id
                        ? "order-list-item active"
                        : "order-list-item"
                    }
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="order-list-main">
                      <div>
                        <h3>{order.order_code}</h3>
                        <p>
                          {order.table_name || "Chưa có bàn"} •{" "}
                          {order.created_at || "Chưa có thời gian"}
                        </p>
                      </div>

                      <strong>{formatMoney(order.total_amount)}</strong>
                    </div>

                    <div className="order-list-footer">
                      <span className={`order-status ${statusInfo.className}`}>
                        {statusInfo.text}
                      </span>

                      <span
                        className={
                          order.payment_status === "PAID"
                            ? "payment paid"
                            : "payment unpaid"
                        }
                      >
                        {order.payment_status === "PAID"
                          ? "Đã thanh toán"
                          : "Chưa thanh toán"}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="empty-orders">Không có đơn hàng nào</div>
            )}
          </div>

          <div className="pagination-box">
            <div className="pagination-left">
              <div className="pagination-info">
                Hiển thị <strong>{getStartItem()}</strong> -{" "}
                <strong>{getEndItem()}</strong> /{" "}
                <strong>{pagination.total_items || 0}</strong> đơn hàng
              </div>

              <div className="pagination-page">
                Trang <strong>{currentPage}</strong> /{" "}
                <strong>{pagination.total_pages || 1}</strong>
              </div>
            </div>

            <div className="pagination-right">
              <select value={itemsPerPage} onChange={handlePageSizeChange}>
                <option value={5}>5 / trang</option>
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
              </select>

              <button
                disabled={!pagination.has_previous}
                onClick={goToPreviousPage}
              >
                Trước
              </button>

              {Array.from(
                { length: pagination.total_pages || 1 },
                (_, index) => {
                  const pageNumber = index + 1;

                  return (
                    <button
                      key={pageNumber}
                      className={
                        currentPage === pageNumber ? "active-page" : ""
                      }
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                }
              )}

              <button disabled={!pagination.has_next} onClick={goToNextPage}>
                Sau
              </button>
            </div>
          </div>
        </section>

        <section className="order-detail-card">
          {selectedOrder ? (
            <>
              <div className="detail-hero">
                <div>
                  <p>Đơn hàng</p>
                  <h2>{selectedOrder.order_code}</h2>
                  <span>{selectedOrder.table_name || "Chưa có bàn"}</span>
                </div>

                <div className="detail-icon">🍽️</div>
              </div>

              <div className="tracking-box">
                <div className="tracking-row">
                  <div
                    className={`track-step ${currentStep >= 1 ? "active" : ""
                      }`}
                  >
                    <div>1</div>
                    <span>Đã nhận</span>
                  </div>

                  <div
                    className={`track-line ${currentStep >= 2 ? "active" : ""
                      }`}
                  ></div>

                  <div
                    className={`track-step ${currentStep >= 2 ? "active" : ""
                      }`}
                  >
                    <div>2</div>
                    <span>Đang làm</span>
                  </div>

                  <div
                    className={`track-line ${currentStep >= 3 ? "active" : ""
                      }`}
                  ></div>

                  <div
                    className={`track-step ${currentStep >= 3 ? "active" : ""
                      }`}
                  >
                    <div>3</div>
                    <span>Hoàn thành</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Món khách đã đặt</h3>

                {selectedOrder.details && selectedOrder.details.length > 0 ? (
                  selectedOrder.details.map((item) => (
                    <div className="order-food-item" key={item.id}>
                      <div className="food-avatar">
                        {item.product_name?.charAt(0) || "?"}
                      </div>

                      <div>
                        <h4>{item.product_name || "Chưa có tên món"}</h4>
                        <p>Số lượng: x{item.quantity || 0}</p>
                      </div>

                      <strong>{formatMoney(item.total_price)}</strong>
                    </div>
                  ))
                ) : (
                  <div className="empty-orders">Đơn này chưa có món</div>
                )}
              </div>

              <div className="detail-info">
                <div>
                  <span>Ghi chú</span>
                  <strong>{selectedOrder.note || "Không có"}</strong>
                </div>

                <div>
                  <span>Thanh toán</span>
                  <strong
                    className={
                      selectedOrder.payment_status === "PAID"
                        ? "paid-text"
                        : "unpaid-text"
                    }
                  >
                    {selectedOrder.payment_status === "PAID"
                      ? "Đã thanh toán"
                      : "Chưa thanh toán"}
                  </strong>
                </div>

                <div>
                  <span>Tổng tiền</span>
                  <strong className="total-price">
                    {formatMoney(selectedOrder.total_amount)}
                  </strong>
                </div>
              </div>

              <div className="order-actions-panel">
                <button
                  className="action-confirm"
                  onClick={() => updateOrderStatus("PROCESSING")}
                  disabled={selectedOrder.status !== "PENDING"}
                >
                  Xác nhận đơn
                </button>

                <button
                  className="action-complete"
                  onClick={() => updateOrderStatus("COMPLETED")}
                  disabled={selectedOrder.status !== "PROCESSING"}
                >
                  Hoàn thành món
                </button>

                <button
                  className="action-paid"
                  onClick={updatePaymentStatus}
                  disabled={selectedOrder.payment_status === "PAID"}
                >
                  Đã thanh toán
                </button>

                <button
                  className="action-cancel"
                  onClick={() => updateOrderStatus("CANCELLED")}
                  disabled={selectedOrder.status === "COMPLETED"}
                >
                  Hủy đơn
                </button>
              </div>
            </>
          ) : (
            <div className="empty-order-detail">
              Chưa có đơn hàng để hiển thị
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Orders;