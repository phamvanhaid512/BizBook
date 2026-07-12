import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  PackageCheck,
  ShoppingBag,
  XCircle,
} from "lucide-react";

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

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentYear() {
  return String(new Date().getFullYear());
}

function formatOrderDateTime(value) {
  if (!value) return "Chưa có thời gian";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [filterType, setFilterType] = useState("day");
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [pagination, setPagination] = useState(initialPagination);

  const [loading, setLoading] = useState(false);

  const statusMap = {
    PENDING: {
      text: "Chờ xác nhận",
      step: 1,
      className: "pending",
      icon: <Clock3 size={16} />,
    },
    PROCESSING: {
      text: "Đang chuẩn bị",
      step: 2,
      className: "processing",
      icon: <PackageCheck size={16} />,
    },
    COMPLETED: {
      text: "Hoàn thành",
      step: 3,
      className: "completed",
      icon: <CheckCircle2 size={16} />,
    },
    CANCELLED: {
      text: "Đã hủy",
      step: 0,
      className: "cancelled",
      icon: <XCircle size={16} />,
    },
  };

  useEffect(() => {
    if (filterType === "day") {
      setSelectedDate(getTodayDate());
    }

    if (filterType === "month") {
      setSelectedDate(getCurrentMonth());
    }

    if (filterType === "year") {
      setSelectedDate(getCurrentYear());
    }

    setCurrentPage(1);
  }, [filterType]);

  useEffect(() => {
    loadOrders();
  }, [currentPage, itemsPerPage, statusFilter, filterType, selectedDate]);

  const buildFilterParams = () => {
    const params = {
      page: currentPage,
      page_size: itemsPerPage,
    };

    if (statusFilter !== "ALL") {
      params.status = statusFilter;
    }

    if (filterType === "day") {
      params.filter = "day";
      params.date = selectedDate;
    }

    if (filterType === "month") {
      const [year, month] = selectedDate.split("-");
      params.filter = "month";
      params.month = Number(month);
      params.year = year;
    }

    if (filterType === "year") {
      params.filter = "year";
      params.year = selectedDate;
    }

    return params;
  };

  const loadOrders = async () => {
    try {
      setLoading(true);

      const res = await orderApi.getAll(buildFilterParams());
      const result = res.data?.data || {};
      const orderItems = result.items || [];

      setOrders(orderItems);
      setPagination(result.pagination || initialPagination);

      setSelectedOrder((prev) => {
        if (!orderItems.length) return null;
        if (!prev) return orderItems[0];

        const matchedOrder = orderItems.find((item) => item.id === prev.id);
        return matchedOrder || orderItems[0];
      });
    } catch (error) {
      toast.error("Không thể tải danh sách đơn hàng");
      console.log("Lỗi load đơn hàng:", error);

      setOrders([]);
      setSelectedOrder(null);
      setPagination(initialPagination);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterTypeChange = (e) => {
    setFilterType(e.target.value);
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
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
        icon: <Clock3 size={16} />,
      }
    );
  };

  useEffect(() => {
    if (!selectedOrder?.id) return;

    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    const wsUrl = `${backendUrl.replace(/^http/, "ws")}/ws/orders/${selectedOrder.id}/`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log(`WebSocket Connected successfully to order: ${selectedOrder.id}`);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data?.status) {
          setOrders((prevOrders) =>
            prevOrders.map((order) =>
              order.id === selectedOrder.id ? { ...order, status: data.status } : order
            )
          );

          setSelectedOrder((prev) => {
            if (prev && prev.status !== data.status) {
              return { ...prev, status: data.status };
            }
            return prev;
          });
        }

        if (data?.payment_status) {
          setOrders((prevOrders) =>
            prevOrders.map((order) =>
              order.id === selectedOrder.id
                ? { ...order, payment_status: data.payment_status }
                : order
            )
          );

          setSelectedOrder((prev) => {
            if (prev && prev.payment_status !== data.payment_status) {
              return { ...prev, payment_status: data.payment_status };
            }
            return prev;
          });
        }
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
  }, [selectedOrder?.id]);

  const updateOrderStatus = async (status) => {
    if (!selectedOrder) return;

    try {
      await orderApi.updatOrderStatus(selectedOrder.id, { status });
      toast.success("Cập nhật trạng thái đơn hàng thành công");

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === selectedOrder.id ? { ...order, status } : order
        )
      );

      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              status,
            }
          : prev
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Cập nhật trạng thái thất bại");
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

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === selectedOrder.id
            ? { ...order, payment_status: "PAID" }
            : order
        )
      );

      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              payment_status: "PAID",
            }
          : prev
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Cập nhật thanh toán thất bại");
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
    setCurrentPage((prev) => Math.min(prev + 1, pagination.total_pages || 1));
  };

  const currentStep = selectedOrder
    ? getStatusInfo(selectedOrder.status).step
    : 1;

  const selectedStatusInfo = selectedOrder
    ? getStatusInfo(selectedOrder.status)
    : getStatusInfo("PENDING");

  return (
    <div className="orders-page">
      <div className="orders-page__top">
        <div className="orders-header">
          <div>
            <span className="orders-header__eyebrow">Quản lý vận hành</span>
            <h1>Quản lý đơn hàng</h1>
            <p>Theo dõi đơn QR realtime với giao diện gọn gàng, thoáng và dễ thao tác.</p>
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
      </div>

      <div className="orders-layout">
        <section className="orders-list-card">
          <div className="orders-list-top">
            <div className="orders-list-top__title">
              <h2>Danh sách đơn</h2>
              <p>Lọc theo trạng thái và thời gian</p>
            </div>

            <div className="orders-filters">
              <select value={statusFilter} onChange={handleStatusFilter}>
                <option value="ALL">Tất cả</option>
                <option value="PENDING">Chờ xác nhận</option>
                <option value="PROCESSING">Đang chuẩn bị</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>

              <select value={filterType} onChange={handleFilterTypeChange}>
                <option value="day">Theo ngày</option>
                <option value="month">Theo tháng</option>
                <option value="year">Theo năm</option>
              </select>

              {filterType === "day" && (
                <input type="date" value={selectedDate} onChange={handleDateChange} />
              )}

              {filterType === "month" && (
                <input type="month" value={selectedDate} onChange={handleDateChange} />
              )}

              {filterType === "year" && (
                <select value={selectedDate} onChange={handleDateChange}>
                  {Array.from({ length: 6 }, (_, index) => {
                    const year = String(new Date().getFullYear() - index);
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          </div>

          <div className="orders-list">
            {loading ? (
              <div className="empty-orders">Đang tải đơn hàng...</div>
            ) : orders.length > 0 ? (
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
                    <div className="order-list-item__top">
                      <div>
                        <h3>{order.order_code}</h3>
                        <p>
                          {order.table_name || "Chưa có bàn"} •{" "}
                          {formatOrderDateTime(order.created_at)}
                        </p>
                      </div>

                      <strong>{formatMoney(order.total_amount)}</strong>
                    </div>

                    <div className="order-list-item__bottom">
                      <span className={`order-status ${statusInfo.className}`}>
                        {statusInfo.icon}
                        {statusInfo.text}
                      </span>

                      <span
                        className={
                          order.payment_status === "PAID"
                            ? "payment paid"
                            : "payment unpaid"
                        }
                      >
                        <CreditCard size={14} />
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

              <button disabled={!pagination.has_previous} onClick={goToPreviousPage}>
                Trước
              </button>

              {Array.from({ length: pagination.total_pages || 1 }, (_, index) => {
                const pageNumber = index + 1;

                return (
                  <button
                    key={pageNumber}
                    className={currentPage === pageNumber ? "active-page" : ""}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                );
              })}

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
                <div className="detail-hero__content">
                  <span className="detail-hero__label">Đơn hàng đang chọn</span>
                  <h2>{selectedOrder.order_code}</h2>

                  <div className="detail-hero__meta">
                    <span>
                      <ShoppingBag size={15} />
                      {selectedOrder.table_name || "Chưa có bàn"}
                    </span>

                    <span>
                      <CalendarDays size={15} />
                      {formatOrderDateTime(selectedOrder.created_at)}
                    </span>
                  </div>
                </div>

                <div className="detail-hero__amount">
                  <small>Tổng tiền</small>
                  <strong>{formatMoney(selectedOrder.total_amount)}</strong>
                </div>
              </div>

              <div className="detail-summary-row">
                <div className={`detail-summary-chip ${selectedStatusInfo.className}`}>
                  {selectedStatusInfo.icon}
                  {selectedStatusInfo.text}
                </div>

                <div
                  className={
                    selectedOrder.payment_status === "PAID"
                      ? "detail-summary-chip paid"
                      : "detail-summary-chip unpaid"
                  }
                >
                  <CreditCard size={15} />
                  {selectedOrder.payment_status === "PAID"
                    ? "Đã thanh toán"
                    : "Chưa thanh toán"}
                </div>
              </div>

              <div className="tracking-box">
                <div className="tracking-row">
                  <div className={`track-step ${currentStep >= 1 ? "active" : ""}`}>
                    <div>1</div>
                    <span>Đã nhận</span>
                  </div>

                  <div className={`track-line ${currentStep >= 2 ? "active" : ""}`}></div>

                  <div className={`track-step ${currentStep >= 2 ? "active" : ""}`}>
                    <div>2</div>
                    <span>Đang làm</span>
                  </div>

                  <div className={`track-line ${currentStep >= 3 ? "active" : ""}`}></div>

                  <div className={`track-step ${currentStep >= 3 ? "active" : ""}`}>
                    <div>3</div>
                    <span>Hoàn thành</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <div className="section-header">
                  <h3>Món khách đã đặt</h3>
                  <span>
                    {selectedOrder.details?.length || 0} món
                  </span>
                </div>

                {selectedOrder.details && selectedOrder.details.length > 0 ? (
                  <div className="order-food-list">
                    {selectedOrder.details.map((item) => (
                      <div className="order-food-item" key={item.id}>
                        <div className="food-avatar">
                          {item.product_name?.charAt(0) || "?"}
                        </div>

                        <div className="order-food-item__content">
                          <h4>{item.product_name || "Chưa có tên món"}</h4>
                          <p>Số lượng: x{item.quantity || 0}</p>
                        </div>

                        <strong>{formatMoney(item.total_price)}</strong>
                      </div>
                    ))}
                  </div>
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
                  Đánh dấu đã thanh toán
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