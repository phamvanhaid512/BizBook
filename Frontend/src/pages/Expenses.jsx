import { useEffect, useMemo, useState } from "react";
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

import "./Expenses.css";

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
  { value: "today", label: "Hôm nay" },
  { value: "week", label: "7 ngày" },
  { value: "month", label: "Tháng này" },
];

const sampleOrders = [
  {
    id: 1,
    code: "ORD-E3C6B6F6",
    createdAt: "2026-07-10T08:20:00",
    customer: "Khách tại quầy",
    orderType: "Tại quán",
    revenue: 285000,
    productCost: 142000,
    discount: 15000,
    otherCost: 8000,
    status: "completed",
    items: [
      {
        id: 1,
        name: "Cà phê sữa",
        quantity: 2,
        sellingPrice: 35000,
        costPrice: 15000,
      },
      {
        id: 2,
        name: "Trà đào cam sả",
        quantity: 3,
        sellingPrice: 45000,
        costPrice: 22000,
      },
      {
        id: 3,
        name: "Bánh tiramisu",
        quantity: 2,
        sellingPrice: 40000,
        costPrice: 23000,
      },
    ],
  },
  {
    id: 2,
    code: "ORD-4378F203",
    createdAt: "2026-07-10T07:55:00",
    customer: "Nguyễn Minh Anh",
    orderType: "Mang đi",
    revenue: 175000,
    productCost: 92000,
    discount: 10000,
    otherCost: 5000,
    status: "completed",
    items: [
      {
        id: 1,
        name: "Trà sữa trân châu",
        quantity: 2,
        sellingPrice: 50000,
        costPrice: 28000,
      },
      {
        id: 2,
        name: "Bánh croissant",
        quantity: 1,
        sellingPrice: 45000,
        costPrice: 21000,
      },
      {
        id: 3,
        name: "Cà phê đen",
        quantity: 1,
        sellingPrice: 30000,
        costPrice: 15000,
      },
    ],
  },
  {
    id: 3,
    code: "ORD-D667CA1E",
    createdAt: "2026-07-10T07:22:00",
    customer: "Khách QR - Bàn 05",
    orderType: "Tại quán",
    revenue: 96000,
    productCost: 62000,
    discount: 12000,
    otherCost: 3000,
    status: "completed",
    items: [
      {
        id: 1,
        name: "Matcha latte",
        quantity: 2,
        sellingPrice: 48000,
        costPrice: 31000,
      },
    ],
  },
  {
    id: 4,
    code: "ORD-82C49D11",
    createdAt: "2026-07-10T06:48:00",
    customer: "Trần Quốc Huy",
    orderType: "Giao hàng",
    revenue: 340000,
    productCost: 205000,
    discount: 30000,
    otherCost: 45000,
    status: "completed",
    items: [
      {
        id: 1,
        name: "Combo cà phê văn phòng",
        quantity: 5,
        sellingPrice: 68000,
        costPrice: 41000,
      },
    ],
  },
];

const chartData = [
  {
    label: "04/07",
    revenue: 2400000,
    cost: 1450000,
    profit: 950000,
  },
  {
    label: "05/07",
    revenue: 3100000,
    cost: 1840000,
    profit: 1260000,
  },
  {
    label: "06/07",
    revenue: 2850000,
    cost: 1720000,
    profit: 1130000,
  },
  {
    label: "07/07",
    revenue: 3680000,
    cost: 2150000,
    profit: 1530000,
  },
  {
    label: "08/07",
    revenue: 3320000,
    cost: 2020000,
    profit: 1300000,
  },
  {
    label: "09/07",
    revenue: 4210000,
    cost: 2470000,
    profit: 1740000,
  },
  {
    label: "10/07",
    revenue: 3890000,
    cost: 2290000,
    profit: 1600000,
  },
];

function calculateOrder(order) {
  const totalCost =
    Number(order.productCost || 0) +
    Number(order.otherCost || 0);

  const netRevenue =
    Number(order.revenue || 0) -
    Number(order.discount || 0);

  const profit = netRevenue - totalCost;

  const profitMargin =
    netRevenue > 0 ? (profit / netRevenue) * 100 : 0;

  return {
    ...order,
    netRevenue,
    totalCost,
    profit,
    profitMargin,
  };
}

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

function getProfitLevel(order) {
  if (order.profit < 0) {
    return {
      label: "Đang lỗ",
      className: "danger",
    };
  }

  if (order.profitMargin < 15) {
    return {
      label: "Lãi thấp",
      className: "warning",
    };
  }

  return {
    label: "Có lãi",
    className: "success",
  };
}

export default function Expenses() {
  const [period, setPeriod] = useState("week");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const normalizedOrders = sampleOrders.map(calculateOrder);
    setOrders(normalizedOrders);
  }, []);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    if (!normalizedSearch) {
      return orders;
    }

    return orders.filter((order) => {
      return (
        order.code.toLowerCase().includes(normalizedSearch) ||
        order.customer
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [orders, searchTerm]);

  const summary = useMemo(() => {
    const totalRevenue = orders.reduce(
      (total, order) => total + order.netRevenue,
      0
    );

    const totalCost = orders.reduce(
      (total, order) => total + order.totalCost,
      0
    );

    const totalProfit = orders.reduce(
      (total, order) => total + order.profit,
      0
    );

    const profitMargin =
      totalRevenue > 0
        ? (totalProfit / totalRevenue) * 100
        : 0;

    return {
      orderCount: orders.length,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
    };
  }, [orders]);

  return (
    <main className="cost-dashboard">
      <header className="cost-dashboard__header">
        <div>
          <span className="cost-dashboard__eyebrow">
            Báo cáo hoạt động bán hàng
          </span>

          <h1>Chi phí và lợi nhuận</h1>

          <p>
            Theo dõi hiệu quả tài chính của từng đơn hàng
            theo thời gian thực.
          </p>
        </div>

        <div className="header-actions">
          <button className="secondary-action">
            <Download size={18} />
            Xuất báo cáo
          </button>

          <button className="primary-action">
            <CalendarDays size={18} />
            10/07/2026
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
              aria-selected={period === item.value}
              key={item.value}
              className={
                period === item.value ? "active" : ""
              }
              onClick={() => setPeriod(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="toolbar-meta">
          Cập nhật lần cuối lúc 15:22
        </div>
      </section>

      <section className="kpi-grid">
        <KpiCard
          label="Doanh thu thuần"
          value={formatCurrency(summary.totalRevenue)}
          change="+12,4%"
          trend="up"
          icon={<CircleDollarSign size={22} />}
          variant="primary"
        />

        <KpiCard
          label="Tổng chi phí"
          value={formatCurrency(summary.totalCost)}
          change="+6,8%"
          trend="up"
          icon={<WalletCards size={22} />}
          variant="neutral"
        />

        <KpiCard
          label="Lợi nhuận"
          value={formatCurrency(summary.totalProfit)}
          change="+18,2%"
          trend="up"
          icon={<TrendingUp size={22} />}
          variant="success"
        />

        <KpiCard
          label="Biên lợi nhuận"
          value={`${summary.profitMargin.toFixed(1)}%`}
          change="+2,1%"
          trend="up"
          icon={<PackageCheck size={22} />}
          variant="purple"
        />
      </section>

      <section className="analytics-grid">
        <article className="dashboard-card chart-card">
          <div className="card-heading">
            <div>
              <h2>Xu hướng tài chính</h2>
              <p>
                So sánh doanh thu, chi phí và lợi nhuận
              </p>
            </div>

            <button className="icon-action">
              <Filter size={18} />
            </button>
          </div>

          <div className="chart-wrapper">
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

                  <linearGradient
                    id="profitFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#10b981"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="#10b981"
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
                  tickFormatter={formatCompactCurrency}
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
                    border: "1px solid #e5e9f2",
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

                <Area
                  type="monotone"
                  dataKey="cost"
                  name="Chi phí"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="transparent"
                />

                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Lợi nhuận"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#profitFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="dashboard-card insight-card">
          <div className="card-heading">
            <div>
              <h2>Hiệu quả kinh doanh</h2>
              <p>Tóm tắt trong khoảng đã chọn</p>
            </div>
          </div>

          <div className="profit-ring">
            <div className="profit-ring__inner">
              <span>Biên lợi nhuận</span>
              <strong>
                {summary.profitMargin.toFixed(1)}%
              </strong>
              <small>Mức tốt</small>
            </div>
          </div>

          <div className="insight-list">
            <InsightRow
              label="Giá trị đơn trung bình"
              value={formatCurrency(
                summary.totalRevenue /
                  Math.max(summary.orderCount, 1)
              )}
            />

            <InsightRow
              label="Chi phí trung bình/đơn"
              value={formatCurrency(
                summary.totalCost /
                  Math.max(summary.orderCount, 1)
              )}
            />

            <InsightRow
              label="Đơn hàng có lãi"
              value={`${
                orders.filter(
                  (order) => order.profit > 0
                ).length
              }/${orders.length}`}
            />
          </div>

          <div className="business-insight">
            <div className="business-insight__icon">
              <TrendingUp size={19} />
            </div>

            <div>
              <strong>Hoạt động đang tích cực</strong>
              <p>
                Lợi nhuận tăng nhanh hơn chi phí trong kỳ
                hiện tại.
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
              Kiểm tra doanh thu, chi phí và lợi nhuận
              của từng đơn.
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
                  setSearchTerm(event.target.value)
                }
              />
            </label>

            <button className="filter-button">
              <Filter size={18} />
              Bộ lọc
            </button>
          </div>
        </div>

        <div className="orders-table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Đơn hàng</th>
                <th>Thời gian</th>
                <th>Doanh thu thuần</th>
                <th>Chi phí</th>
                <th>Lợi nhuận</th>
                <th>Biên lợi nhuận</th>
                <th>Trạng thái</th>
                <th aria-label="Chi tiết" />
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => {
                const profitLevel =
                  getProfitLevel(order);

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
                          <ShoppingBag size={17} />
                        </div>

                        <div>
                          <strong>{order.code}</strong>
                          <span>{order.customer}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="date-cell">
                        <strong>
                          {dateTimeFormatter
                            .format(
                              new Date(order.createdAt)
                            )
                            .split(",")[0]}
                        </strong>

                        <span>
                          {dateTimeFormatter
                            .format(
                              new Date(order.createdAt)
                            )
                            .split(",")[1]
                            ?.trim()}
                        </span>
                      </div>
                    </td>

                    <td className="money-cell">
                      {formatCurrency(order.netRevenue)}
                    </td>

                    <td className="money-cell cost">
                      {formatCurrency(order.totalCost)}
                    </td>

                    <td
                      className={`money-cell ${
                        order.profit >= 0
                          ? "positive"
                          : "negative"
                      }`}
                    >
                      {formatCurrency(order.profit)}
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
                          {order.profitMargin.toFixed(1)}%
                        </strong>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`status-pill ${profitLevel.className}`}
                      >
                        {profitLevel.label}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="row-action"
                        aria-label={`Xem ${order.code}`}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder && (
        <>
          <div
            className="drawer-overlay"
            onClick={() => setSelectedOrder(null)}
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
                {selectedOrder.items.map((item) => {
                  const revenue =
                    item.quantity * item.sellingPrice;

                  const cost =
                    item.quantity * item.costPrice;

                  return (
                    <div
                      className="drawer-item"
                      key={item.id}
                    >
                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          {item.quantity} ×{" "}
                          {formatCurrency(
                            item.sellingPrice
                          )}
                        </span>
                      </div>

                      <div>
                        <strong>
                          {formatCurrency(revenue)}
                        </strong>
                        <span>
                          Lãi {formatCurrency(revenue - cost)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="drawer-section breakdown">
              <h3>Phân tích tài chính</h3>

              <BreakdownRow
                label="Doanh thu bán hàng"
                value={selectedOrder.revenue}
              />

              <BreakdownRow
                label="Giảm giá"
                value={-selectedOrder.discount}
              />

              <BreakdownRow
                label="Doanh thu thuần"
                value={selectedOrder.netRevenue}
                emphasized
              />

              <BreakdownRow
                label="Giá vốn sản phẩm"
                value={selectedOrder.productCost}
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
                <span>Lợi nhuận đơn hàng</span>
                <strong>
                  {formatCurrency(selectedOrder.profit)}
                </strong>
              </div>

              <div className="drawer-profit-badge">
                <ArrowUpRight size={16} />
                {selectedOrder.profitMargin.toFixed(1)}%
              </div>
            </section>
          </aside>
        </>
      )}
    </main>
  );
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
          className={`kpi-change ${
            positive ? "positive" : "negative"
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

      <small>So với kỳ trước</small>
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
      className={`breakdown-row ${
        emphasized ? "emphasized" : ""
      }`}
    >
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
    </div>
  );
}