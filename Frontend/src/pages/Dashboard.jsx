import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Download,
  Filter,
  PackageCheck,
  Search,
  ShoppingBag,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import dashboardApi from "../api/dashboardApi";
import orderApi from "../api/orderApi";

import "./Dashboard.css";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const periods = [
  {
    value: "day",
    label: "Theo ngày",
  },
  {
    value: "month",
    label: "Theo tháng",
  },
  {
    value: "year",
    label: "Theo năm",
  },
];

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatCompactCurrency(value) {
  const number = Number(value || 0);

  if (number >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toFixed(1)} tỷ`;
  }

  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(1)} tr`;
  }

  if (number >= 1_000) {
    return `${Math.round(number / 1_000)} nghìn`;
  }

  return number.toString();
}

function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonth() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getCurrentYear() {
  return String(new Date().getFullYear());
}

function buildDashboardParams(period, selectedDate) {
  const params = {
    filter: period,
  };

  if (period === "day") {
    params.date = selectedDate;
  }

  if (period === "month") {
    const [year, month] = selectedDate.split("-");

    params.month = Number(month);
    params.year = Number(year);
  }

  if (period === "year") {
    params.year = Number(selectedDate);
  }

  return params;
}

function getChartLabel(item) {
  if (item?.date) {
    const date = new Date(`${item.date}T00:00:00`);

    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }).format(date);
    }

    return item.date;
  }

  if (item?.month) {
    const monthValue = String(item.month);

    if (/^\d{4}-\d{2}$/.test(monthValue)) {
      const [year, month] = monthValue.split("-");

      return `Tháng ${Number(month)}/${year}`;
    }

    const monthDate = new Date(monthValue);

    if (!Number.isNaN(monthDate.getTime())) {
      return new Intl.DateTimeFormat("vi-VN", {
        month: "2-digit",
        year: "numeric",
      }).format(monthDate);
    }

    return monthValue;
  }

  if (item?.year) {
    return String(item.year);
  }

  if (item?.label) {
    return String(item.label);
  }

  return "-";
}

function getAxiosErrorMessage(error, fallbackMessage) {
  const backendData = error?.response?.data;

  if (typeof backendData === "string") {
    return backendData;
  }

  return (
    backendData?.message ||
    backendData?.data?.error ||
    backendData?.detail ||
    error?.message ||
    fallbackMessage
  );
}

function getStatusInfo(status) {
  const normalizedStatus = String(status || "").toUpperCase();

  const statusMap = {
    PENDING: {
      text: "Chờ xác nhận",
      className: "pending",
    },

    PROCESSING: {
      text: "Đang chuẩn bị",
      className: "processing",
    },

    COMPLETED: {
      text: "Hoàn thành",
      className: "completed",
    },

    CANCELLED: {
      text: "Đã hủy",
      className: "cancelled",
    },

    CANCELED: {
      text: "Đã hủy",
      className: "cancelled",
    },
  };

  return (
    statusMap[normalizedStatus] || {
      text: status || "Không xác định",
      className: "pending",
    }
  );
}

function normalizeOrder(order) {
  const revenue = Number(order?.total_amount || 0);

  const itemList =
    order?.order_items ||
    order?.items ||
    order?.order_details ||
    [];

  const productCost = itemList.reduce((total, item) => {
    const quantity = Number(item?.quantity || 0);

    const costPrice = Number(
      item?.product?.cost_price ||
      item?.cost_price ||
      item?.costPrice ||
      0
    );

    return total + quantity * costPrice;
  }, 0);

  const backendTotalCost = Number(
    order?.total_cost || order?.cost_total || 0
  );

  const totalCost =
    backendTotalCost > 0 ? backendTotalCost : productCost;

  const backendProfit = Number(
    order?.total_profit || order?.profit || 0
  );

  const profit =
    order?.total_profit !== undefined ||
      order?.profit !== undefined
      ? backendProfit
      : revenue - totalCost;

  const profitMargin =
    revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    ...order,

    code:
      order?.order_code ||
      order?.code ||
      (order?.id ? `#${order.id}` : "Không có mã"),

    createdAt:
      order?.created_at ||
      order?.createdAt ||
      null,

    customer:
      order?.customer_name ||
      order?.customer?.full_name ||
      order?.customer?.name ||
      (typeof order?.customer === "string"
        ? order.customer
        : "Khách lẻ"),

    orderType:
      order?.order_type ||
      (order?.table_name ? "Tại quán" : "Mang đi"),

    revenue,
    netRevenue: revenue,
    productCost,
    otherCost: 0,
    totalCost,
    profit,
    profitMargin,

    items: itemList.map((item, index) => {
      const product = item?.product || {};

      return {
        id: item?.id || `${order?.id || "order"}-${index}`,

        name:
          item?.product_name ||
          product?.name ||
          item?.name ||
          "Sản phẩm",

        quantity: Number(item?.quantity || 0),

        sellingPrice: Number(
          item?.unit_price ||
          item?.selling_price ||
          item?.price ||
          product?.selling_price ||
          product?.price ||
          0
        ),

        costPrice: Number(
          product?.cost_price ||
          item?.cost_price ||
          item?.costPrice ||
          0
        ),
      };
    }),
  };
}

function formatOrderDate(dateValue) {
  if (!dateValue) {
    return {
      date: "--",
      time: "--",
    };
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return {
      date: "--",
      time: "--",
    };
  }

  const formattedValue = dateTimeFormatter.format(date);
  const [datePart, timePart] = formattedValue.split(",");

  return {
    date: datePart?.trim() || "--",
    time: timePart?.trim() || "--",
  };
}

function KpiCard({
  label,
  value,
  change,
  trend,
  icon,
  variant,
}) {
  const positive = trend === "up";

  return (
    <article className={`kpi-card ${variant}`}>
      <div className="kpi-card__top">
        <div className="kpi-icon">{icon}</div>

        <span
          className={`kpi-change ${positive ? "positive" : "negative"
            }`}
        >
          {positive ? (
            <ArrowUpRight size={15} />
          ) : (
            <ArrowDownRight size={15} />
          )}

          {change}
        </span>
      </div>

      <div className="kpi-card__content">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function InsightRow({ label, value }) {
  return (
    <div className="insight-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  emphasized = false,
}) {
  return (
    <div
      className={`breakdown-row ${emphasized ? "emphasized" : ""
        }`}
    >
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
    </div>
  );
}

export default function Dashboard() {
  const [period, setPeriod] = useState("month");

  const [selectedDate, setSelectedDate] = useState(
    getCurrentMonth()
  );

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const [dashboardData, setDashboardData] =
    useState(null);

  const [chartData, setChartData] = useState([]);

  const [orders, setOrders] = useState([]);

  const [loadingSummary, setLoadingSummary] =
    useState(false);

  const [loadingOrders, setLoadingOrders] =
    useState(false);

  const [summaryError, setSummaryError] =
    useState("");

  const [ordersError, setOrdersError] = useState("");

  function handlePeriodChange(newPeriod) {
    setPeriod(newPeriod);

    if (newPeriod === "day") {
      setSelectedDate(getTodayDate());
      return;
    }

    if (newPeriod === "month") {
      setSelectedDate(getCurrentMonth());
      return;
    }

    if (newPeriod === "year") {
      setSelectedDate(getCurrentYear());
    }
  }
  function isValidSelectedDate(period, selectedDate) {
    if (!selectedDate) {
      return false;
    }

    if (period === "day") {
      return /^\d{4}-\d{2}-\d{2}$/.test(selectedDate);
    }

    if (period === "month") {
      return /^\d{4}-\d{2}$/.test(selectedDate);
    }

    if (period === "year") {
      return /^\d{4}$/.test(selectedDate);
    }

    return false;
  }

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardSummary() {
      try {
        setLoadingSummary(true);
        setSummaryError("");

        const params = buildDashboardParams(
          period,
          selectedDate
        );

        console.log("Dashboard params:", params);

        const response =
          await dashboardApi.getDashboardSummary(params);

        const result = response?.data;

        if (!result?.success) {
          throw new Error(
            result?.message ||
            "Không thể lấy dữ liệu dashboard"
          );
        }

        const apiData = result?.data || {};

        const normalizedChartData = (
          apiData.chart_data || []
        ).map((item) => ({
          ...item,
          label: getChartLabel(item),
          revenue: Number(
            item.revenue || item.total_revenue || 0
          ),
          order_count: Number(
            item.order_count || item.total_orders || 0
          ),
        }));

        if (!isMounted) {
          return;
        }

        setDashboardData(apiData);
        setChartData(normalizedChartData);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.data?.error ||
          error.message ||
          "Không thể tải dữ liệu dashboard";

        setSummaryError(errorMessage);
        setDashboardData(null);
        setChartData([]);
      } finally {
        if (isMounted) {
          setLoadingSummary(false);
        }
      }
    }

    if (!isValidSelectedDate(period, selectedDate)) {
      return;
    }

    fetchDashboardSummary();

    return () => {
      isMounted = false;
    };
  }, [period, selectedDate]);

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      try {
        setLoadingOrders(true);
        setOrdersError("");

        const response = await orderApi.getAll({
          page: 1,
          page_size: 20,
          status: "ALL",
        });

        const responseData = response?.data;

        if (
          responseData?.success === false
        ) {
          throw new Error(
            responseData?.message ||
            "Không thể tải danh sách đơn hàng"
          );
        }

        const result =
          responseData?.data || responseData || {};

        const orderItems =
          result?.items ||
          result?.results ||
          result?.orders ||
          [];

        const normalizedOrders =
          orderItems.map(normalizeOrder);

        if (!isMounted) {
          return;
        }

        setOrders(normalizedOrders);

        setSelectedOrder((previousOrder) => {
          if (!normalizedOrders.length) {
            return null;
          }

          if (!previousOrder) {
            return normalizedOrders[0];
          }

          const matchedOrder =
            normalizedOrders.find(
              (item) =>
                String(item.id) ===
                String(previousOrder.id)
            );

          return matchedOrder || normalizedOrders[0];
        });
      } catch (error) {
        console.error("Lỗi load orders:", error);

        if (!isMounted) {
          return;
        }

        const errorMessage = getAxiosErrorMessage(
          error,
          "Không thể tải danh sách đơn hàng"
        );

        setOrdersError(errorMessage);
        setOrders([]);
        setSelectedOrder(null);

        toast.error(errorMessage);
      } finally {
        if (isMounted) {
          setLoadingOrders(false);
        }
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    if (!normalizedSearch) {
      return orders;
    }

    return orders.filter((order) => {
      const orderCode = String(
        order?.code || ""
      ).toLowerCase();

      const customerName = String(
        order?.customer || ""
      ).toLowerCase();

      return (
        orderCode.includes(normalizedSearch) ||
        customerName.includes(normalizedSearch)
      );
    });
  }, [orders, searchTerm]);

  const summary = useMemo(() => {
    if (!dashboardData) {
      return {
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        profitMargin: 0,
      };
    }

    const totalRevenue = Number(
      dashboardData?.total_revenue || 0
    );

    const totalCost = Number(
      dashboardData?.total_cost || 0
    );

    const totalProfit = Number(
      dashboardData?.total_profit || 0
    );

    const totalOrders = Number(
      dashboardData?.total_orders || 0
    );

    const averageOrderValue = Number(
      dashboardData?.average_order_value || 0
    );

    const backendProfitMargin = Number(
      dashboardData?.profit_margin || 0
    );

    const calculatedProfitMargin =
      totalRevenue > 0
        ? (totalProfit / totalRevenue) * 100
        : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalOrders,
      averageOrderValue,

      profitMargin:
        dashboardData?.profit_margin !== undefined
          ? backendProfitMargin
          : calculatedProfitMargin,
    };
  }, [dashboardData]);

  const profitableOrdersCount = useMemo(() => {
    return orders.filter(
      (order) => order.profit > 0
    ).length;
  }, [orders]);

  const headerDateText = useMemo(() => {
    const startDate = dashboardData?.start_date;
    const endDate = dashboardData?.end_date;

    if (!startDate || !endDate) {
      return "Chưa có dữ liệu";
    }

    if (startDate === endDate) {
      return startDate;
    }

    return `${startDate} - ${endDate}`;
  }, [dashboardData]);

  const lastUpdatedText = useMemo(() => {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());
  }, [dashboardData, orders]);

  return (
    <main className="cost-dashboard">
      <header className="cost-dashboard__header">
        <div>
          <span className="cost-dashboard__eyebrow">
            Báo cáo hoạt động bán hàng
          </span>

          <h1>Chi phí và lợi nhuận</h1>

          <p>
            Tổng quan doanh thu, giá vốn và lợi nhuận
            dựa trên dữ liệu dashboard và đơn hàng từ
            backend.
          </p>
        </div>

        <div className="header-actions">
          <button
            className="secondary-action"
            type="button"
          >
            <Download size={18} />
            Xuất báo cáo
          </button>

          <button
            className="primary-action"
            type="button"
          >
            <CalendarDays size={18} />
            {headerDateText}
          </button>
        </div>
      </header>

      <section className="dashboard-toolbar">
        <div
          className="period-tabs"
          role="tablist"
          aria-label="Chọn khoảng thời gian"
        >
          {periods.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={
                period === item.value
              }
              key={item.value}
              className={
                period === item.value
                  ? "active"
                  : ""
              }
              onClick={() => handlePeriodChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="toolbar-meta">
          Cập nhật lần cuối lúc {lastUpdatedText}
        </div>
      </section>

      <section
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {period === "day" && (
          <input
            type="date"
            value={selectedDate}
            onChange={(event) =>
              setSelectedDate(event.target.value)
            }
          />
        )}

        {period === "month" && (
          <input
            type="month"
            value={selectedDate}
            onChange={(event) =>
              setSelectedDate(event.target.value)
            }
          />
        )}

        {period === "year" && (
          <select
            value={selectedDate}
            onChange={(event) =>
              setSelectedDate(event.target.value)
            }
          >
            {Array.from({
              length: 6,
            }).map((_, index) => {
              const year = String(
                new Date().getFullYear() - index
              );

              return (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              );
            })}
          </select>
        )}
      </section>

      {loadingSummary && (
        <div
          className="dashboard-card"
          style={{
            marginBottom: 20,
            padding: 16,
          }}
        >
          Đang tải dữ liệu dashboard...
        </div>
      )}

      {summaryError && (
        <div
          className="dashboard-card"
          style={{
            marginBottom: 20,
            padding: 16,
            color: "#b91c1c",
          }}
        >
          {summaryError}
        </div>
      )}

      <section className="kpi-grid">
        <KpiCard
          label="Tổng doanh thu"
          value={formatCurrency(
            summary.totalRevenue
          )}
          change={`${summary.totalOrders} đơn`}
          trend="up"
          icon={
            <CircleDollarSign size={22} />
          }
          variant="primary"
        />

        <KpiCard
          label="Tổng giá vốn"
          value={formatCurrency(
            summary.totalCost
          )}
          change={
            summary.totalOrders > 0
              ? formatCurrency(
                summary.totalCost /
                summary.totalOrders
              )
              : formatCurrency(0)
          }
          trend="up"
          icon={<WalletCards size={22} />}
          variant="neutral"
        />

        <KpiCard
          label="Tổng lợi nhuận"
          value={formatCurrency(
            summary.totalProfit
          )}
          change={`${summary.profitMargin.toFixed(
            1
          )}%`}
          trend={
            summary.totalProfit >= 0
              ? "up"
              : "down"
          }
          icon={<TrendingUp size={22} />}
          variant="success"
        />

        <KpiCard
          label="Giá trị đơn trung bình"
          value={formatCurrency(
            summary.averageOrderValue
          )}
          change={`${profitableOrdersCount}/${orders.length} đơn có lãi`}
          trend="up"
          icon={<PackageCheck size={22} />}
          variant="purple"
        />
      </section>

      <section className="analytics-grid">
        <article className="dashboard-card chart-card">
          <div className="card-heading">
            <div>
              <h2>Xu hướng doanh thu</h2>
              <p>
                Dữ liệu theo bộ lọc đang chọn
              </p>
            </div>

            <button
              className="icon-action"
              type="button"
            >
              <Filter size={18} />
            </button>
          </div>

          <div className="chart-wrapper">
            {chartData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={320}
              >
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -8,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="revenueFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#2563eb"
                        stopOpacity={0.25}
                      />

                      <stop
                        offset="95%"
                        stopColor="#2563eb"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="#e9edf5"
                  />

                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: "#7b8496",
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={
                      formatCompactCurrency
                    }
                    tick={{
                      fill: "#7b8496",
                      fontSize: 12,
                    }}
                  />

                  <Tooltip
                    formatter={(value) =>
                      formatCurrency(value)
                    }
                    contentStyle={{
                      borderRadius: 14,
                      border:
                        "1px solid #e5e9f2",
                      boxShadow:
                        "0 14px 34px rgba(15, 23, 42, 0.12)",
                    }}
                  />

                  <Legend />

                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Doanh thu"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fill="url(#revenueFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: 320,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "#7b8496",
                }}
              >
                Chưa có dữ liệu biểu đồ
              </div>
            )}
          </div>
        </article>

        <article className="dashboard-card insight-card">
          <div className="card-heading">
            <div>
              <h2>Hiệu quả kinh doanh</h2>
              <p>
                Tóm tắt theo dữ liệu hiện tại
              </p>
            </div>
          </div>

          <div className="profit-ring">
            <div className="profit-ring__inner">
              <span>Biên lợi nhuận</span>

              <strong>
                {summary.profitMargin.toFixed(1)}%
              </strong>

              <small>
                {summary.totalProfit >= 0
                  ? "Đang có lãi"
                  : "Đang lỗ"}
              </small>
            </div>
          </div>

          <div className="insight-list">
            <InsightRow
              label="Giá trị đơn trung bình"
              value={formatCurrency(
                summary.averageOrderValue
              )}
            />

            <InsightRow
              label="Chi phí trung bình/đơn"
              value={formatCurrency(
                summary.totalOrders > 0
                  ? summary.totalCost /
                  summary.totalOrders
                  : 0
              )}
            />

            <InsightRow
              label="Đơn hàng có lãi"
              value={`${profitableOrdersCount}/${orders.length}`}
            />
          </div>

          <div className="business-insight">
            <div className="business-insight__icon">
              <TrendingUp size={19} />
            </div>

            <div>
              <strong>
                {summary.totalProfit >= 0
                  ? "Hoạt động đang tích cực"
                  : "Cần tối ưu giá vốn"}
              </strong>

              <p>
                {summary.totalProfit >= 0
                  ? "Lợi nhuận đang dương trong khoảng thời gian đã chọn."
                  : "Hãy kiểm tra lại giá vốn từng món và tổng doanh thu."}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-card orders-section">
        <div className="orders-header">
          <div>
            <h2>Chi tiết theo đơn hàng</h2>
            <p>
              Danh sách lấy từ API đơn hàng.
            </p>
          </div>

          <div className="orders-tools">
            <label className="search-box">
              <Search size={18} />

              <input
                type="search"
                value={searchTerm}
                placeholder="Tìm mã đơn hoặc khách hàng"
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
              />
            </label>

            <button
              className="filter-button"
              type="button"
            >
              <Filter size={18} />
              Bộ lọc
            </button>
          </div>
        </div>

        {loadingOrders && (
          <div style={{ padding: 16 }}>
            Đang tải đơn hàng...
          </div>
        )}

        {ordersError && (
          <div
            style={{
              padding: 16,
              color: "#b91c1c",
            }}
          >
            {ordersError}
          </div>
        )}

        <div className="orders-table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Đơn hàng</th>
                <th>Thời gian</th>
                <th>Doanh thu</th>
                <th>Giá vốn</th>
                <th>Lợi nhuận</th>
                <th>Biên lợi nhuận</th>
                <th>Trạng thái</th>
                <th aria-label="Chi tiết" />
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => {
                const statusInfo =
                  getStatusInfo(order.status);

                const orderDate =
                  formatOrderDate(
                    order.createdAt
                  );

                return (
                  <tr
                    key={order.id}
                    onClick={() =>
                      setSelectedOrder(order)
                    }
                  >
                    <td>
                      <div className="order-identity">
                        <div className="order-icon">
                          <ShoppingBag
                            size={17}
                          />
                        </div>

                        <div>
                          <strong>
                            {order.code}
                          </strong>

                          <span>
                            {order.customer}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="date-cell">
                        <strong>
                          {orderDate.date}
                        </strong>

                        <span>
                          {orderDate.time}
                        </span>
                      </div>
                    </td>

                    <td className="money-cell">
                      {formatCurrency(
                        order.netRevenue
                      )}
                    </td>

                    <td className="money-cell cost">
                      {formatCurrency(
                        order.totalCost
                      )}
                    </td>

                    <td
                      className={`money-cell ${order.profit >= 0
                        ? "positive"
                        : "negative"
                        }`}
                    >
                      {formatCurrency(
                        order.profit
                      )}
                    </td>

                    <td>
                      <div className="margin-cell">
                        <div className="margin-track">
                          <span
                            style={{
                              width: `${Math.min(
                                Math.max(
                                  order.profitMargin,
                                  0
                                ),
                                100
                              )}%`,
                            }}
                          />
                        </div>

                        <strong>
                          {order.profitMargin.toFixed(
                            1
                          )}
                          %
                        </strong>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`status-pill ${statusInfo.className}`}
                      >
                        {statusInfo.text}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="row-action"
                        aria-label={`Xem ${order.code}`}
                        onClick={(event) => {
                          event.stopPropagation();

                          setSelectedOrder(order);
                        }}
                      >
                        <ChevronRight
                          size={18}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!loadingOrders &&
                filteredOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        textAlign: "center",
                        padding: 20,
                      }}
                    >
                      Không có đơn hàng phù hợp
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder && (
        <>
          <div
            className="drawer-overlay"
            onClick={() =>
              setSelectedOrder(null)
            }
          />

          <aside className="order-drawer">
            <div className="drawer-header">
              <div>
                <span>Chi tiết đơn hàng</span>
                <h2>{selectedOrder.code}</h2>
              </div>

              <button
                type="button"
                className="drawer-close"
                aria-label="Đóng chi tiết đơn hàng"
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                <X size={20} />
              </button>
            </div>

            <div className="drawer-meta">
              <div>
                <span>Khách hàng</span>

                <strong>
                  {selectedOrder.customer}
                </strong>
              </div>

              <div>
                <span>Loại đơn</span>

                <strong>
                  {selectedOrder.orderType}
                </strong>
              </div>
            </div>

            <section className="drawer-section">
              <h3>Các món trong đơn</h3>

              <div className="drawer-items">
                {selectedOrder.items?.length >
                  0 ? (
                  selectedOrder.items.map(
                    (item) => {
                      const quantity = Number(
                        item.quantity || 0
                      );

                      const revenue =
                        quantity *
                        Number(
                          item.sellingPrice || 0
                        );

                      const cost =
                        quantity *
                        Number(
                          item.costPrice || 0
                        );

                      return (
                        <div
                          className="drawer-item"
                          key={item.id}
                        >
                          <div>
                            <strong>
                              {item.name}
                            </strong>

                            <span>
                              {quantity} ×{" "}
                              {formatCurrency(
                                item.sellingPrice
                              )}
                            </span>
                          </div>

                          <div>
                            <strong>
                              {formatCurrency(
                                revenue
                              )}
                            </strong>

                            <span>
                              Lãi{" "}
                              {formatCurrency(
                                revenue - cost
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )
                ) : (
                  <div className="drawer-item">
                    <div>
                      <strong>
                        Chưa có chi tiết sản phẩm
                      </strong>

                      <span>
                        API order chưa trả danh
                        sách sản phẩm
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="drawer-section breakdown">
              <h3>Phân tích tài chính</h3>

              <BreakdownRow
                label="Doanh thu bán hàng"
                value={selectedOrder.revenue}
              />

              <BreakdownRow
                label="Doanh thu thuần"
                value={
                  selectedOrder.netRevenue
                }
                emphasized
              />

              <BreakdownRow
                label="Giá vốn sản phẩm"
                value={
                  selectedOrder.productCost
                }
              />

              <BreakdownRow
                label="Chi phí phát sinh"
                value={selectedOrder.otherCost}
              />

              <BreakdownRow
                label="Tổng chi phí"
                value={selectedOrder.totalCost}
                emphasized
              />
            </section>

            <section className="drawer-profit-card">
              <div>
                <span>
                  Lợi nhuận đơn hàng
                </span>

                <strong>
                  {formatCurrency(
                    selectedOrder.profit
                  )}
                </strong>
              </div>

              <div className="drawer-profit-badge">
                {selectedOrder.profit >= 0 ? (
                  <ArrowUpRight size={16} />
                ) : (
                  <ArrowDownRight size={16} />
                )}

                {selectedOrder.profitMargin.toFixed(
                  1
                )}
                %
              </div>
            </section>
          </aside>
        </>
      )}
    </main>
  );
}