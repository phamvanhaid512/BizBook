import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatCurrency,
  formatDate,
  formatPercent,
} from "../../utils/formatters";

export default function ForecastPanel({
  data,
  form,
  onFormChange,
  onSubmit,
  loading,
}) {
  const history = data?.history || [];
  const forecast = data?.forecast || [];

  const chartData = [
    ...history.map((item) => ({
      date: item.date,
      actual: item.revenue,
      predicted: null,
    })),
    ...forecast.map((item) => ({
      date: item.date,
      actual: null,
      predicted: item.predicted_revenue,
    })),
  ];

  const metrics = data?.metrics || {};

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Dự báo doanh thu</h2>
          <p>
            Dùng dữ liệu theo ngày, lag 1 ngày, lag 7 ngày
            và trung bình trượt.
          </p>
        </div>
      </div>

      <form
        className="filter-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label>
          Số ngày lịch sử
          <input
            type="number"
            min="14"
            max="1095"
            value={form.history_days}
            onChange={(event) =>
              onFormChange({
                ...form,
                history_days: Number(event.target.value),
              })
            }
          />
        </label>

        <label>
          Số ngày cần dự báo
          <input
            type="number"
            min="1"
            max="90"
            value={form.forecast_days}
            onChange={(event) =>
              onFormChange({
                ...form,
                forecast_days: Number(event.target.value),
              })
            }
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Đang dự báo..." : "Chạy dự báo"}
        </button>
      </form>

      {data?.warning && (
        <div className="notice notice--warning">
          {data.warning}
        </div>
      )}

      <div className="forecast-metrics">
        <div>
          <span>Mô hình</span>
          <strong>{data?.model || "Chưa có"}</strong>
        </div>
        <div>
          <span>Xu hướng</span>
          <strong>{data?.trend || "Chưa có"}</strong>
        </div>
        <div>
          <span>MAE</span>
          <strong>
            {metrics.mae == null
              ? "N/A"
              : formatCurrency(metrics.mae)}
          </strong>
        </div>
        <div>
          <span>MAPE</span>
          <strong>
            {formatPercent(metrics.mape_percent)}
          </strong>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              minTickGap={28}
            />
            <YAxis
              tickFormatter={(value) =>
                `${Math.round(value / 1000000)}tr`
              }
            />
            <Tooltip
              labelFormatter={formatDate}
              formatter={(value) =>
                value == null
                  ? ""
                  : formatCurrency(value)
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="actual"
              name="Doanh thu thực tế"
              connectNulls={false}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              name="Doanh thu dự báo"
              connectNulls={false}
              strokeWidth={2}
              dot
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Dự báo</th>
              <th>Cận dưới</th>
              <th>Cận trên</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((item) => (
              <tr key={item.date}>
                <td>{formatDate(item.date)}</td>
                <td>
                  {formatCurrency(item.predicted_revenue)}
                </td>
                <td>{formatCurrency(item.lower_bound)}</td>
                <td>{formatCurrency(item.upper_bound)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
