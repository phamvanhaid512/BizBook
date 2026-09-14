import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
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
import dataMiningApi from "../api/dataMiningApi";
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
  { value: "day", label: "Theo ngày" },
  { value: "month", label: "Theo tháng" },
  { value: "year", label: "Theo năm" },
];

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatCompactCurrency(value) {
  const number = Number(value || 0);
  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(1)} tỷ`;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)} tr`;
  if (number >= 1_000) return `${Math.round(number / 1_000)} nghìn`;
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
  return String(new Date().getMonth() + 1).padStart(2, "0");
}

function getCurrentYear() {
  return String(new Date().getFullYear());
}

function buildDashboardParams(period, selectedDate) {
  if (period === "day") return { filter: "day", date: selectedDate };
  if (period === "month") return { filter: "month", month: selectedDate };
  if (period === "year") return { filter: "year", year: selectedDate };
  return { filter: period };
}

function getChartLabel(item) {
  if (item?.date) {
    const date = new Date(`${item.date}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(date);
    }
    return item.date;
  }
  if (item?.month) {
    const monthValue = String(item.month);
    if (/^\d{4}-\d{2}$/.test(monthValue)) {
      const [year, month] = monthValue.split("-");
      return `Tháng ${Number(month)}/${year}`;
    }
    return monthValue;
  }
  if (item?.year) return String(item.year);
  if (item?.label) return String(item.label);
  return "-";
}

function getAxiosErrorMessage(error, fallbackMessage) {
  const backendData = error?.response?.data;
  if (typeof backendData === "string") return backendData;
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
    PENDING: { text: "Chờ xác nhận", className: "pending" },
    PROCESSING: { text: "Đang chuẩn bị", className: "processing" },
    COMPLETED: { text: "Hoàn thành", className: "completed" },
    CANCELLED: { text: "Đã hủy", className: "cancelled" },
    CANCELED: { text: "Đã hủy", className: "cancelled" },
  };
  return statusMap[normalizedStatus] || { text: status || "Không xác định", className: "pending" };
}

function normalizeOrder(order) {
  const revenue = Number(order?.total_amount || 0);
  const itemList = order?.order_items || order?.items || order?.order_details || [];

  const productCost = itemList.reduce((total, item) => {
    const quantity = Number(item?.quantity || 0);
    const costPrice = Number(item?.product?.cost_price || item?.cost_price || item?.costPrice || 0);
    return total + quantity * costPrice;
  }, 0);

  const backendTotalCost = Number(order?.total_cost || order?.cost_total || 0);
  const totalCost = backendTotalCost > 0 ? backendTotalCost : productCost;
  const backendProfit = Number(order?.total_profit || order?.profit || 0);
  const profit = order?.total_profit !== undefined || order?.profit !== undefined ? backendProfit : revenue - totalCost;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    ...order,
    code: order?.order_code || order?.code || (order?.id ? `#${order.id}` : "Không có mã"),
    createdAt: order?.created_at || order?.createdAt || null,
    customer: order?.customer_name || order?.customer?.full_name || order?.customer?.name || (typeof order?.customer === "string" ? order.customer : "Khách lẻ"),
    orderType: order?.order_type || (order?.table_name ? "Tại quán" : "Mang đi"),
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
        name: item?.product_name || product?.name || item?.name || "Sản phẩm",
        quantity: Number(item?.quantity || 0),
        sellingPrice: Number(item?.unit_price || item?.selling_price || item?.price || product?.selling_price || 0),
        costPrice: Number(product?.cost_price || item?.cost_price || item?.costPrice || 0),
      };
    }),
  };
}

function formatOrderDate(dateValue) {
  if (!dateValue) return { date: "--", time: "--" };
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return { date: "--", time: "--" };
  const formattedValue = dateTimeFormatter.format(date);
  const [datePart, timePart] = formattedValue.split(",");
  return { date: datePart?.trim() || "--", time: timePart?.trim() || "--" };
}

function KpiCard({ label, value, change, trend, icon, variant }) {
  const positive = trend === "up";
  return (
    <article className={`kpi-card ${variant}`}>
      <div className="kpi-card__top">
        <div className="kpi-icon">{icon}</div>
        <span className={`kpi-change ${positive ? "positive" : "negative"}`}>
          {positive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
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

function BreakdownRow({ label, value, emphasized = false }) {
  return (
    <div className={`breakdown-row ${emphasized ? "emphasized" : ""}`}>
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
    </div>
  );
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function formatMiningDate(value) {
  if (!value) return "Chưa có thời gian";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có thời gian";
  return dateTimeFormatter.format(date);
}

function getRuleProducts(products) {
  if (Array.isArray(products)) return products.join(", ");
  return String(products || "--");
}

function getForecastRevenue(item) {
  return item?.revenue ?? item?.forecast_revenue ?? item?.predicted_revenue ?? 0;
}

function SmartAnalysisCard({ miningHighlights, loading, error }) {
  const apriori = miningHighlights?.apriori || null;
  const forecasting = miningHighlights?.forecasting || null;
  const aprioriResult = apriori?.result || {};
  const forecastingResult = forecasting?.result || {};
  const rules = Array.isArray(aprioriResult.rules) ? aprioriResult.rules : [];
  const frequentItemsets = Array.isArray(aprioriResult.frequent_itemsets) ? aprioriResult.frequent_itemsets : [];
  const forecastItems = Array.isArray(forecastingResult.forecast) ? forecastingResult.forecast : [];
  const forecastSummary = forecastingResult.summary || "Chưa có kết quả dự báo.";

  return (
    <section className="dashboard-card smart-analysis">
      <div className="card-heading smart-analysis__heading">
        <div className="smart-analysis__title">
          <h2>Phân tích thông minh</h2>
          <p>Kết quả Data Mining gần nhất, dùng để xem nhanh trên Dashboard.</p>
        </div>
        <div className="analysis-actions">
          <span className="analysis-badge">Data Mining</span>
          <Link to="/mining" className="analysis-link">
            Xem chi tiết <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="smart-analysis__state">Đang tải kết quả phân tích...</div>
      ) : error ? (
        <div className="smart-analysis__error">{error}</div>
      ) : (
        <div className="smart-analysis__grid">
          <article className="smart-panel">
            <div className="smart-panel__header">
              <div>
                <span className="smart-panel__type">Apriori</span>
                <h3>Sản phẩm thường mua cùng</h3>
              </div>
              <small>{formatMiningDate(apriori?.created_at)}</small>
            </div>

            {apriori ? (
              <>
                <div className="apriori-statistics">
                  <div>
                    <span>Số giao dịch</span>
                    <strong>{Number(aprioriResult.transaction_count || 0)}</strong>
                  </div>
                  <div>
                    <span>Số sản phẩm</span>
                    <strong>{Number(aprioriResult.product_count || 0)}</strong>
                  </div>
                  <div>
                    <span>Số luật kết hợp</span>
                    <strong>{rules.length}</strong>
                  </div>
                </div>

                {rules.length > 0 ? (
                  <div className="rule-list">
                    {rules.slice(0, 3).map((rule, index) => (
                      <div className="rule-item" key={`${getRuleProducts(rule.antecedents)}-${index}`}>
                        <div className="rule-item__content">
                          <strong>{getRuleProducts(rule.antecedents)}</strong>
                          <span> nên gợi ý <b>{getRuleProducts(rule.consequents)}</b></span>
                        </div>
                        <em>Tin cậy {formatPercent(rule.confidence)}</em>
                      </div>
                    ))}
                  </div>
                ) : frequentItemsets.length > 0 ? (
                  <div className="frequent-section">
                    <div className="frequent-heading">
                      <span>Sản phẩm xuất hiện phổ biến</span>
                      <small>Chưa đủ điều kiện tạo luật kết hợp</small>
                    </div>
                    <div className="frequent-list">
                      {frequentItemsets.slice(0, 3).map((item, index) => (
                        <div className="frequent-item" key={`${getRuleProducts(item.items)}-${index}`}>
                          <div>
                            <span className="frequent-index">{index + 1}</span>
                            <strong>{getRuleProducts(item.items)}</strong>
                          </div>
                          <em>Support {formatPercent(item.support)}</em>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="smart-analysis__empty">Chưa tìm thấy sản phẩm phổ biến hoặc luật kết hợp.</div>
                )}
              </>
            ) : (
              <div className="smart-analysis__empty">Chưa có lần chạy Apriori nào.</div>
            )}
          </article>

          <article className="smart-panel smart-panel--forecast">
            <div className="smart-panel__header">
              <div>
                <span className="smart-panel__type">Forecasting</span>
                <h3>Dự báo doanh thu</h3>
              </div>
              <small>{formatMiningDate(forecasting?.created_at)}</small>
            </div>

            {forecasting ? (
              <>
                <p className="forecast-summary">{forecastSummary}</p>
                {forecastItems.length > 0 ? (
                  <div className="forecast-mini-list">
                    {forecastItems.slice(0, 3).map((item, index) => (
                      <div key={item.date || index}>
                        <span>{item.date || `Ngày ${index + 1}`}</span>
                        <strong>{formatCurrency(getForecastRevenue(item))}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="smart-analysis__empty">Chưa có dữ liệu doanh thu dự báo.</div>
                )}
              </>
            ) : (
              <div className="forecast-empty">
                <div className="forecast-empty__icon"><TrendingUp size={25} /></div>
                <strong>Chưa có kết quả dự báo</strong>
                <p>Hãy sang trang Data Mining để chạy Forecasting.</p>
                <Link to="/mining">Chạy Forecasting <ChevronRight size={15} /></Link>
              </div>
            )}
          </article>
        </div>
      )}
    </section>
  );
}

export default function Dashboard() {
  const [period, setPeriod] = useState("month");
  const [selectedDate, setSelectedDate] = useState(getCurrentMonth());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [chartData, setChartData] = useState([]);

  // State danh sách đơn hàng & Phân trang từ Backend
  const [orders, setOrders] = useState([]);
  const [orderPagination, setOrderPagination] = useState({
    current_page: 1,
    page_size: 10,
    total_items: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  });

  const [miningHighlights, setMiningHighlights] = useState({ apriori: null, forecasting: null });
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingMining, setLoadingMining] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [ordersError, setOrdersError] = useState("");
  const [miningError, setMiningError] = useState("");

  function handlePeriodChange(newPeriod) {
    setPeriod(newPeriod);
    if (newPeriod === "day") setSelectedDate(getTodayDate());
    if (newPeriod === "month") setSelectedDate(getCurrentMonth());
    if (newPeriod === "year") setSelectedDate(getCurrentYear());
  }

  function isValidSelectedDate(p, sDate) {
    if (!sDate) return false;
    if (p === "day") return /^\d{4}-\d{2}-\d{2}$/.test(sDate);
    if (p === "month") return /^\d{2}$/.test(sDate);
    if (p === "year") return /^\d{4}$/.test(sDate);
    return false;
  }

  // Fetch Dashboard KPI & Chart
  useEffect(() => {
    let isMounted = true;
    async function fetchDashboardSummary() {
      try {
        setLoadingSummary(true);
        setSummaryError("");
        const params = buildDashboardParams(period, selectedDate);
        const response = await dashboardApi.getDashboardSummary(params);
        const result = response?.data;
        if (!result?.success) throw new Error(result?.message || "Không thể lấy dữ liệu dashboard");

        const apiData = result?.data || {};
        const normalizedChartData = (apiData.chart_data || []).map((item) => ({
          ...item,
          label: getChartLabel(item),
          revenue: Number(item.revenue || item.total_revenue || 0),
          order_count: Number(item.order_count || item.total_orders || 0),
        }));

        if (!isMounted) return;
        setDashboardData(apiData);
        setChartData(normalizedChartData);
      } catch (error) {
        if (!isMounted) return;
        setSummaryError(error.response?.data?.message || error.message || "Không thể tải dữ liệu dashboard");
        setDashboardData(null);
        setChartData([]);
      } finally {
        if (isMounted) setLoadingSummary(false);
      }
    }

    if (isValidSelectedDate(period, selectedDate)) fetchDashboardSummary();
    return () => { isMounted = false; };
  }, [period, selectedDate]);

  // Fetch Data Mining Highlights
  useEffect(() => {
    let isMounted = true;
    async function loadMiningHighlights() {
      try {
        setLoadingMining(true);
        setMiningError("");
        const response = await dataMiningApi.getHighlights();
        const result = response?.data;
        if (!result?.success) throw new Error(result?.message || "Không thể tải kết quả Data Mining");
        if (!isMounted) return;
        setMiningHighlights({
          apriori: result?.data?.apriori || null,
          forecasting: result?.data?.forecasting || null,
        });
      } catch (error) {
        if (!isMounted) return;
        setMiningError(getAxiosErrorMessage(error, "Không thể tải kết quả Data Mining"));
      } finally {
        if (isMounted) setLoadingMining(false);
      }
    }
    loadMiningHighlights();
    return () => { isMounted = false; };
  }, []);

  // Fetch Orders với Server-side Pagination & Search
  useEffect(() => {
    let isMounted = true;
    const debounceTimer = setTimeout(async () => {
      try {
        setLoadingOrders(true);
        setOrdersError("");

        const response = await orderApi.getAll({
          page: orderPagination.current_page,
          page_size: orderPagination.page_size,
          search: searchTerm.trim(),
          status: "ALL",
        });

        const responseData = response?.data;
        if (responseData?.success === false) {
          throw new Error(responseData?.message || "Không thể tải danh sách đơn hàng");
        }

        const result = responseData?.data || responseData || {};
        const orderItems = result?.items || result?.results || (Array.isArray(result) ? result : []);
        const paginationData = result?.pagination;

        const normalizedOrders = orderItems.map(normalizeOrder);
        if (!isMounted) return;

        setOrders(normalizedOrders);

        if (paginationData) {
          setOrderPagination((prev) => ({
            ...prev,
            total_items: paginationData.total_items || 0,
            total_pages: paginationData.total_pages || 1,
            has_next: Boolean(paginationData.has_next),
            has_previous: Boolean(paginationData.has_previous),
          }));
        } else {
          // Fallback nếu backend chưa bọc pagination object
          setOrderPagination((prev) => ({
            ...prev,
            total_items: normalizedOrders.length,
            total_pages: 1,
            has_next: false,
            has_previous: false,
          }));
        }

        setSelectedOrder((prevOrder) => {
          if (!normalizedOrders.length) return null;
          if (!prevOrder) return normalizedOrders[0];
          return normalizedOrders.find((item) => String(item.id) === String(prevOrder.id)) || normalizedOrders[0];
        });
      } catch (error) {
        if (!isMounted) return;
        const errorMessage = getAxiosErrorMessage(error, "Không thể tải danh sách đơn hàng");
        setOrdersError(errorMessage);
        setOrders([]);
        setSelectedOrder(null);
        toast.error(errorMessage);
      } finally {
        if (isMounted) setLoadingOrders(false);
      }
    }, 300); // 300ms debounce khi gõ search

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [orderPagination.current_page, orderPagination.page_size, searchTerm]);

  const handleOrderPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= orderPagination.total_pages && newPage !== orderPagination.current_page) {
      setOrderPagination((prev) => ({ ...prev, current_page: newPage }));
    }
  };

  const handleOrderPageSizeChange = (e) => {
    const size = parseInt(e.target.value, 10) || 10;
    setOrderPagination((prev) => ({ ...prev, page_size: size, current_page: 1 }));
  };

  const summary = useMemo(() => {
    if (!dashboardData) {
      return { totalRevenue: 0, totalCost: 0, totalProfit: 0, totalOrders: 0, averageOrderValue: 0, profitMargin: 0 };
    }
    const totalRevenue = Number(dashboardData?.total_revenue || 0);
    const totalCost = Number(dashboardData?.total_cost || 0);
    const totalProfit = Number(dashboardData?.total_profit || 0);
    const totalOrders = Number(dashboardData?.total_orders || 0);
    const averageOrderValue = Number(dashboardData?.average_order_value || 0);
    const backendProfitMargin = Number(dashboardData?.profit_margin || 0);
    const calculatedProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalOrders,
      averageOrderValue,
      profitMargin: dashboardData?.profit_margin !== undefined ? backendProfitMargin : calculatedProfitMargin,
    };
  }, [dashboardData]);

  const profitableOrdersCount = useMemo(() => {
    return orders.filter((order) => order.profit > 0).length;
  }, [orders]);

  const headerDateText = useMemo(() => {
    const startDate = dashboardData?.start_date;
    const endDate = dashboardData?.end_date;
    if (!startDate || !endDate) return "Chưa có dữ liệu";
    return startDate === endDate ? startDate : `${startDate} - ${endDate}`;
  }, [dashboardData]);

  const lastUpdatedText = useMemo(() => {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());
  }, [dashboardData]);

  return (
    <main className="cost-dashboard">
      <header className="cost-dashboard__header">
        <div>
          <span className="cost-dashboard__eyebrow">Báo cáo hoạt động bán hàng</span>
          <h1>Chi phí và lợi nhuận</h1>
          <p>Tổng quan doanh thu, giá vốn và lợi nhuận dựa trên dữ liệu dashboard và đơn hàng từ backend.</p>
        </div>

        <div className="header-actions">
          <button className="secondary-action" type="button">
            <Download size={18} /> Xuất báo cáo
          </button>
          <button className="primary-action" type="button">
            <CalendarDays size={18} /> {headerDateText}
          </button>
        </div>
      </header>

      <section className="dashboard-toolbar">
        <div className="period-tabs" role="tablist" aria-label="Chọn khoảng thời gian">
          {periods.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={period === item.value}
              key={item.value}
              className={period === item.value ? "active" : ""}
              onClick={() => handlePeriodChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="toolbar-meta">Cập nhật lần cuối lúc {lastUpdatedText}</div>
      </section>

      <section className="period-picker" style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {period === "day" && (
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        )}
        {period === "month" && (
          <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
            {Array.from({ length: 12 }).map((_, index) => {
              const month = String(index + 1).padStart(2, "0");
              return <option key={month} value={month}>Tháng {month}</option>;
            })}
          </select>
        )}
        {period === "year" && (
          <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
            {Array.from({ length: 6 }).map((_, index) => {
              const year = String(new Date().getFullYear() - index);
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        )}
      </section>

      {loadingSummary && <div className="dashboard-card" style={{ marginBottom: 20, padding: 16 }}>Đang tải dữ liệu dashboard...</div>}
      {summaryError && <div className="dashboard-card" style={{ marginBottom: 20, padding: 16, color: "#b91c1c" }}>{summaryError}</div>}

      <section className="kpi-grid">
        <KpiCard
          label="Tổng doanh thu"
          value={formatCurrency(summary.totalRevenue)}
          change={`${summary.totalOrders} đơn`}
          trend="up"
          icon={<CircleDollarSign size={22} />}
          variant="primary"
        />
        <KpiCard
          label="Tổng giá vốn"
          value={formatCurrency(summary.totalCost)}
          change={summary.totalOrders > 0 ? formatCurrency(summary.totalCost / summary.totalOrders) : formatCurrency(0)}
          trend="up"
          icon={<WalletCards size={22} />}
          variant="neutral"
        />
        <KpiCard
          label="Tổng lợi nhuận"
          value={formatCurrency(summary.totalProfit)}
          change={`${summary.profitMargin.toFixed(1)}%`}
          trend={summary.totalProfit >= 0 ? "up" : "down"}
          icon={<TrendingUp size={22} />}
          variant="success"
        />
        <KpiCard
          label="Giá trị đơn trung bình"
          value={formatCurrency(summary.averageOrderValue)}
          change={`${profitableOrdersCount}/${orders.length} đơn có lãi (trang hiện tại)`}
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
              <p>Dữ liệu theo bộ lọc đang chọn</p>
            </div>
            <button className="icon-action" type="button"><Filter size={18} /></button>
          </div>
          <div className="chart-wrapper">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e9edf5" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#7b8496", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={formatCompactCurrency} tick={{ fill: "#7b8496", fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 14, border: "1px solid #e5e9f2" }} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#2563eb" strokeWidth={3} fill="url(#revenueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 320, display: "flex", justifyContent: "center", alignItems: "center", color: "#7b8496" }}>
                Chưa có dữ liệu biểu đồ
              </div>
            )}
          </div>
        </article>

        <article className="dashboard-card insight-card">
          <div className="card-heading">
            <div>
              <h2>Hiệu quả kinh doanh</h2>
              <p>Tóm tắt theo dữ liệu hiện tại</p>
            </div>
          </div>
          <div className="profit-ring">
            <div className="profit-ring__inner">
              <span>Biên lợi nhuận</span>
              <strong>{summary.profitMargin.toFixed(1)}%</strong>
              <small>{summary.totalProfit >= 0 ? "Đang có lãi" : "Đang lỗ"}</small>
            </div>
          </div>
          <div className="insight-list">
            <InsightRow label="Giá trị đơn trung bình" value={formatCurrency(summary.averageOrderValue)} />
            <InsightRow label="Chi phí trung bình/đơn" value={formatCurrency(summary.totalOrders > 0 ? summary.totalCost / summary.totalOrders : 0)} />
            <InsightRow label="Đơn có lãi (trang hiện tại)" value={`${profitableOrdersCount}/${orders.length}`} />
          </div>
          <div className="business-insight">
            <div className="business-insight__icon"><TrendingUp size={19} /></div>
            <div>
              <strong>{summary.totalProfit >= 0 ? "Hoạt động đang tích cực" : "Cần tối ưu giá vốn"}</strong>
              <p>{summary.totalProfit >= 0 ? "Lợi nhuận đang dương trong khoảng thời gian đã chọn." : "Hãy kiểm tra lại giá vốn từng món và tổng doanh thu."}</p>
            </div>
          </div>
        </article>
      </section>

      <SmartAnalysisCard miningHighlights={miningHighlights} loading={loadingMining} error={miningError} />

      {/* ==================== PHẦN BẢNG ĐƠN HÀNG (PHÂN TRANG BACKEND) ==================== */}
      <section className="dashboard-card orders-section">
        <div className="orders-header">
          <div>
            <h2>Chi tiết theo đơn hàng</h2>
            <p>Danh sách lấy từ API đơn hàng phân trang theo thời gian thực.</p>
          </div>

          <div className="orders-tools">
            <label className="search-box">
              <Search size={18} />
              <input
                type="search"
                value={searchTerm}
                placeholder="Tìm mã đơn hoặc khách hàng..."
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setOrderPagination((prev) => ({ ...prev, current_page: 1 }));
                }}
              />
            </label>

            <button className="filter-button" type="button">
              <Filter size={18} /> Bộ lọc
            </button>
          </div>
        </div>

        {loadingOrders && <div style={{ padding: 16 }}>Đang tải danh sách đơn hàng...</div>}
        {ordersError && <div style={{ padding: 16, color: "#b91c1c" }}>{ordersError}</div>}

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
              {orders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                const orderDate = formatOrderDate(order.createdAt);

                return (
                  <tr key={order.id} onClick={() => setSelectedOrder(order)}>
                    <td>
                      <div className="order-identity">
                        <div className="order-icon"><ShoppingBag size={17} /></div>
                        <div>
                          <strong>{order.code}</strong>
                          <span>{order.customer}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="date-cell">
                        <strong>{orderDate.date}</strong>
                        <span>{orderDate.time}</span>
                      </div>
                    </td>
                    <td className="money-cell">{formatCurrency(order.netRevenue)}</td>
                    <td className="money-cell cost">{formatCurrency(order.totalCost)}</td>
                    <td className={`money-cell ${order.profit >= 0 ? "positive" : "negative"}`}>
                      {formatCurrency(order.profit)}
                    </td>
                    <td>
                      <div className="margin-cell">
                        <div className="margin-track">
                          <span style={{ width: `${Math.min(Math.max(order.profitMargin, 0), 100)}%` }} />
                        </div>
                        <strong>{order.profitMargin.toFixed(1)}%</strong>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${statusInfo.className}`}>{statusInfo.text}</span>
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
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!loadingOrders && orders.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 20 }}>
                    Không tìm thấy đơn hàng nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Thanh phân trang Backend */}
          {!loadingOrders && orderPagination.total_items > 0 && (
            <div className="pagination-wrapper">
              <div className="pagination-info">
                Hiển thị{" "}
                <strong>
                  {(orderPagination.current_page - 1) * orderPagination.page_size + 1} -{" "}
                  {Math.min(orderPagination.current_page * orderPagination.page_size, orderPagination.total_items)}
                </strong>{" "}
                trên tổng số <strong>{orderPagination.total_items}</strong> đơn hàng
              </div>

              <div className="pagination-controls">
                <div className="page-size-selector">
                  <span>Số dòng:</span>
                  <select value={orderPagination.page_size} onChange={handleOrderPageSizeChange}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="pagination-buttons">
                  <button
                    type="button"
                    className="page-btn"
                    disabled={!orderPagination.has_previous}
                    onClick={() => handleOrderPageChange(orderPagination.current_page - 1)}
                    title="Trang trước"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: orderPagination.total_pages }, (_, i) => i + 1)
                    .filter((p) => {
                      return (
                        p === 1 ||
                        p === orderPagination.total_pages ||
                        Math.abs(p - orderPagination.current_page) <= 1
                      );
                    })
                    .map((pageNum, idx, arr) => (
                      <span key={pageNum} style={{ display: "inline-flex" }}>
                        {idx > 0 && arr[idx - 1] !== pageNum - 1 && (
                          <span className="page-ellipsis">...</span>
                        )}
                        <button
                          type="button"
                          className={`page-btn ${orderPagination.current_page === pageNum ? "active" : ""}`}
                          onClick={() => handleOrderPageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </span>
                    ))}

                  <button
                    type="button"
                    className="page-btn"
                    disabled={!orderPagination.has_next}
                    onClick={() => handleOrderPageChange(orderPagination.current_page + 1)}
                    title="Trang sau"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Drawer Chi tiết đơn hàng */}
      {selectedOrder && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedOrder(null)} />
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
                onClick={() => setSelectedOrder(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="drawer-meta">
              <div>
                <span>Khách hàng</span>
                <strong>{selectedOrder.customer}</strong>
              </div>
              <div>
                <span>Loại đơn</span>
                <strong>{selectedOrder.orderType}</strong>
              </div>
            </div>

            <section className="drawer-section">
              <h3>Các món trong đơn</h3>
              <div className="drawer-items">
                {selectedOrder.items?.length > 0 ? (
                  selectedOrder.items.map((item) => {
                    const quantity = Number(item.quantity || 0);
                    const revenue = quantity * Number(item.sellingPrice || 0);
                    const cost = quantity * Number(item.costPrice || 0);

                    return (
                      <div className="drawer-item" key={item.id}>
                        <div>
                          <strong>{item.name}</strong>
                          <span>{quantity} × {formatCurrency(item.sellingPrice)}</span>
                        </div>
                        <div>
                          <strong>{formatCurrency(revenue)}</strong>
                          <span>Lãi {formatCurrency(revenue - cost)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="drawer-item">
                    <div>
                      <strong>Chưa có chi tiết sản phẩm</strong>
                      <span>API order chưa trả danh sách sản phẩm</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="drawer-section breakdown">
              <h3>Phân tích tài chính</h3>
              <BreakdownRow label="Doanh thu bán hàng" value={selectedOrder.revenue} />
              <BreakdownRow label="Doanh thu thuần" value={selectedOrder.netRevenue} emphasized />
              <BreakdownRow label="Giá vốn sản phẩm" value={selectedOrder.productCost} />
              <BreakdownRow label="Chi phí phát sinh" value={selectedOrder.otherCost} />
              <BreakdownRow label="Tổng chi phí" value={selectedOrder.totalCost} emphasized />
            </section>

            <section className="drawer-profit-card">
              <div>
                <span>Lợi nhuận đơn hàng</span>
                <strong>{formatCurrency(selectedOrder.profit)}</strong>
              </div>
              <div className="drawer-profit-badge">
                {selectedOrder.profit >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {selectedOrder.profitMargin.toFixed(1)}%
              </div>
            </section>
          </aside>
        </>
      )}
    </main>
  );
}