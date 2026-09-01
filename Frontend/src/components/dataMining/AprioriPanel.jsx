import { formatPercent } from "../../utils/formatters";

export default function AprioriPanel({
  data,
  form,
  onFormChange,
  onSubmit,
  loading,
}) {
  const rules = data?.rules || [];

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Apriori – sản phẩm mua cùng nhau</h2>
          <p>
            Support đo độ phổ biến; confidence đo khả năng mua
            sản phẩm B khi đã mua A; lift lớn hơn 1 thể hiện quan
            hệ tích cực.
          </p>
        </div>
      </div>

      <form
        className="filter-form filter-form--apriori"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label>
          Min support
          <input
            type="number"
            step="0.01"
            min="0.001"
            max="1"
            value={form.min_support}
            onChange={(event) =>
              onFormChange({
                ...form,
                min_support: Number(event.target.value),
              })
            }
          />
        </label>

        <label>
          Min confidence
          <input
            type="number"
            step="0.01"
            min="0.001"
            max="1"
            value={form.min_confidence}
            onChange={(event) =>
              onFormChange({
                ...form,
                min_confidence: Number(event.target.value),
              })
            }
          />
        </label>

        <label>
          Min lift
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.min_lift}
            onChange={(event) =>
              onFormChange({
                ...form,
                min_lift: Number(event.target.value),
              })
            }
          />
        </label>

        <label>
          Số kết quả
          <input
            type="number"
            min="1"
            max="100"
            value={form.limit}
            onChange={(event) =>
              onFormChange({
                ...form,
                limit: Number(event.target.value),
              })
            }
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Đang phân tích..." : "Chạy Apriori"}
        </button>
      </form>

      {data?.warning && (
        <div className="notice notice--warning">
          {data.warning}
        </div>
      )}

      <div className="analysis-summary">
        <span>
          Số giao dịch: <strong>{data?.transaction_count || 0}</strong>
        </span>
        <span>
          Số sản phẩm: <strong>{data?.product_count || 0}</strong>
        </span>
        <span>
          Số quy luật: <strong>{rules.length}</strong>
        </span>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nếu khách mua</th>
              <th>Gợi ý thêm</th>
              <th>Support</th>
              <th>Confidence</th>
              <th>Lift</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr>
                <td colSpan="5" className="empty-cell">
                  Chưa có quy luật phù hợp.
                </td>
              </tr>
            )}

            {rules.map((rule, index) => (
              <tr
                key={`${rule.antecedents.join("-")}-${index}`}
              >
                <td>{rule.antecedents.join(", ")}</td>
                <td>{rule.consequents.join(", ")}</td>
                <td>{formatPercent(rule.support * 100)}</td>
                <td>
                  {formatPercent(rule.confidence * 100)}
                </td>
                <td>{rule.lift.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
