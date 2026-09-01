

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  Clock3,
  Info,
  Play,
  RefreshCcw,
  Search,
  Settings2,
  TrendingUp,
} from "lucide-react";
import dataMiningApi from "../api/dataMiningApi";
import "./DataMiningPage.css";

const APRIORI_LEVELS = {
  explore: {
    min_support: "0.02",
    min_confidence: "0.3",
    min_lift: "1",
    max_len: "3",
  },
  balanced: {
    min_support: "0.05",
    min_confidence: "0.5",
    min_lift: "1.2",
    max_len: "3",
  },
  accurate: {
    min_support: "0.1",
    min_confidence: "0.7",
    min_lift: "1.5",
    max_len: "3",
  },
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "--";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getProductsText(products) {
  if (Array.isArray(products)) return products.join(", ");
  return String(products || "--");
}

function getCreatedByText(createdBy) {
  if (!createdBy) return "--";
  if (typeof createdBy === "string" || typeof createdBy === "number") {
    return String(createdBy);
  }

  return createdBy.full_name || createdBy.username || createdBy.email || "--";
}

function getApiErrorMessage(error, fallbackMessage) {
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

function unwrapApiResponse(response) {
  const responseBody = response?.data ?? response;

  if (responseBody?.success === false) {
    throw new Error(responseBody?.message || "API trả về lỗi.");
  }

  return responseBody;
}

function getLiftLevel(value) {
  const lift = Number(value || 0);

  if (lift >= 3) return { label: "Rất cao", className: "lift-very-high" };
  if (lift >= 2) return { label: "Cao", className: "lift-high" };
  if (lift > 1) return { label: "Có liên kết", className: "lift-related" };
  return { label: "Thấp", className: "lift-low" };
}

export default function DataMiningPage() {
  const [activeTab, setActiveTab] = useState("apriori");
  const [keyword, setKeyword] = useState("");
  const [analysisLevel, setAnalysisLevel] = useState("balanced");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [aprioriResult, setAprioriResult] = useState(null);
  const [aprioriLoading, setAprioriLoading] = useState(false);
  const [aprioriError, setAprioriError] = useState("");
  const [aprioriMessage, setAprioriMessage] = useState("");

  const [forecastResult, setForecastResult] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const [forecastMessage, setForecastMessage] = useState("");
  const [forecastMode, setForecastMode] = useState("recent");

  const [miningRuns, setMiningRuns] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [aprioriForm, setAprioriForm] = useState({
    start_date: "",
    end_date: "",
    ...APRIORI_LEVELS.balanced,
    limit: "20",
  });

  const [forecastForm, setForecastForm] = useState({
    history_days: "180",
    start_date: "",
    end_date: "",
    forecast_days: "7",
  });

  const tabs = useMemo(
    () => [
      { value: "apriori", label: "Sản phẩm mua kèm", icon: <BrainCircuit size={18} /> },
      { value: "forecasting", label: "Dự báo doanh thu", icon: <TrendingUp size={18} /> },
      { value: "history", label: "Lịch sử chạy", icon: <Clock3 size={18} /> },
    ],
    [],
  );

  const aprioriData =
    aprioriResult?.data?.data ?? aprioriResult?.data ?? aprioriResult ?? null;
  const aprioriRules = Array.isArray(aprioriData?.rules) ? aprioriData.rules : [];
  const frequentItemsets = Array.isArray(aprioriData?.frequent_itemsets)
    ? aprioriData.frequent_itemsets
    : [];
  const forecastHistory = Array.isArray(forecastResult?.history)
    ? forecastResult.history
    : [];
  const forecastItems = Array.isArray(forecastResult?.forecast)
    ? forecastResult.forecast
    : Array.isArray(forecastResult?.predictions)
      ? forecastResult.predictions
      : [];

  const filteredRuns = useMemo(() => {
    const searchValue = keyword.trim().toLowerCase();
    if (!searchValue) return miningRuns;

    return miningRuns.filter((item) => {
      const runType = String(item.run_type || "").toLowerCase();
      const createdAt = formatDateTime(item.created_at).toLowerCase();
      return runType.includes(searchValue) || createdAt.includes(searchValue);
    });
  }, [keyword, miningRuns]);

  useEffect(() => {
    loadMiningRuns();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      loadMiningRuns();
    }
  }, [activeTab]);

  function handleAprioriChange(event) {
    const { name, value } = event.target;
    setAprioriForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleAnalysisLevelChange(event) {
    const level = event.target.value;
    setAnalysisLevel(level);
    setAprioriForm((previous) => ({ ...previous, ...APRIORI_LEVELS[level] }));
  }

  function handleForecastChange(event) {
    const { name, value } = event.target;
    setForecastForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleForecastModeChange(mode) {
    setForecastMode(mode);
    setForecastError("");
    setForecastMessage("");
  }

  async function loadMiningRuns() {
    try {
      setHistoryLoading(true);
      setHistoryError("");

      const response = await dataMiningApi.getMiningRuns();
      const responseBody = unwrapApiResponse(response);
      const responseData = responseBody?.data ?? responseBody;
      const runs = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.results)
          ? responseData.results
          : Array.isArray(responseData?.runs)
            ? responseData.runs
            : [];

      setMiningRuns(runs);
    } catch (error) {
      console.error("Lỗi tải lịch sử Data Mining:", error);
      setHistoryError(getApiErrorMessage(error, "Không thể tải lịch sử Data Mining."));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleRunApriori() {
    try {
      setAprioriLoading(true);
      setAprioriError("");
      setAprioriMessage("");

      if (
        aprioriForm.start_date &&
        aprioriForm.end_date &&
        aprioriForm.start_date > aprioriForm.end_date
      ) {
        throw new Error("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
      }

      const payload = {
        min_support: Number(aprioriForm.min_support),
        min_confidence: Number(aprioriForm.min_confidence),
        min_lift: Number(aprioriForm.min_lift),
        max_len: Number(aprioriForm.max_len),
        limit: Number(aprioriForm.limit),
      };

      if (
        !Number.isFinite(payload.min_support) ||
        payload.min_support < 0.001 ||
        payload.min_support > 1 ||
        !Number.isFinite(payload.min_confidence) ||
        payload.min_confidence < 0.001 ||
        payload.min_confidence > 1 ||
        !Number.isFinite(payload.min_lift) ||
        payload.min_lift < 0 ||
        !Number.isInteger(payload.max_len) ||
        payload.max_len < 2 ||
        payload.max_len > 5 ||
        !Number.isInteger(payload.limit) ||
        payload.limit < 1 ||
        payload.limit > 100
      ) {
        throw new Error("Thông số phân tích không hợp lệ. Vui lòng kiểm tra lại.");
      }

      if (aprioriForm.start_date) payload.start_date = aprioriForm.start_date;
      if (aprioriForm.end_date) payload.end_date = aprioriForm.end_date;

      const response = await dataMiningApi.runApriori(payload);
      const responseBody = unwrapApiResponse(response);
      const responseData = responseBody?.data ?? responseBody;
      const resultData = responseData?.result ?? responseData;

      if (!resultData || typeof resultData !== "object") {
        throw new Error("Backend không trả về kết quả Apriori.");
      }

      setAprioriResult(resultData);
      setAprioriMessage(responseBody?.message || "Phân tích sản phẩm mua kèm thành công.");
      loadMiningRuns();
    } catch (error) {
      console.error("Lỗi chạy Apriori:", error);
      setAprioriResult(null);
      setAprioriError(getApiErrorMessage(error, "Không thể chạy Apriori."));
    } finally {
      setAprioriLoading(false);
    }
  }

  async function handleRunForecasting() {
    try {
      setForecastLoading(true);
      setForecastError("");
      setForecastMessage("");

      const forecastDays = Number(forecastForm.forecast_days);
      if (!Number.isInteger(forecastDays) || forecastDays < 1 || forecastDays > 90) {
        throw new Error("Số ngày dự báo phải từ 1 đến 90.");
      }

      const payload = { forecast_days: forecastDays };

      if (forecastMode === "recent") {
        const historyDays = Number(forecastForm.history_days);
        if (!Number.isInteger(historyDays) || historyDays < 14 || historyDays > 1095) {
          throw new Error("Số ngày dữ liệu cũ phải từ 14 đến 1095.");
        }
        payload.history_days = historyDays;
      } else {
        const { start_date, end_date } = forecastForm;
        if (!start_date || !end_date) {
          throw new Error("Vui lòng chọn ngày bắt đầu và ngày kết thúc.");
        }
        if (start_date > end_date) {
          throw new Error("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
        }

        const startDate = new Date(`${start_date}T00:00:00`);
        const endDate = new Date(`${end_date}T00:00:00`);
        const historyDays =
          Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

        if (historyDays < 14) {
          throw new Error("Khoảng dữ liệu tùy chỉnh phải có ít nhất 14 ngày.");
        }

        payload.start_date = start_date;
        payload.end_date = end_date;
      }

      const response = await dataMiningApi.runForecasting(payload);
      const responseBody = unwrapApiResponse(response);
      const responseData = responseBody?.data ?? responseBody;
      const resultData = responseData?.result ?? responseData;

      if (!resultData || typeof resultData !== "object") {
        throw new Error("Backend không trả về kết quả dự báo.");
      }

      setForecastResult(resultData);
      setForecastMessage(responseBody?.message || "Dự báo doanh thu thành công.");
      loadMiningRuns();
    } catch (error) {
      console.error("Lỗi chạy Forecasting:", error);
      setForecastResult(null);
      setForecastError(getApiErrorMessage(error, "Không thể chạy Forecasting."));
    } finally {
      setForecastLoading(false);
    }
  }

  return (
    <main className="data-mining-page">
      <header className="data-mining-header">
        <div>
          <span className="data-mining-eyebrow">Data Mining</span>

          <h1>Phân tích dữ liệu bán hàng</h1>

          <p>
            Phân tích sản phẩm thường mua cùng nhau, dự báo doanh thu và xem lại lịch sử phân tích.          </p>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={loadMiningRuns}
          disabled={historyLoading}
        >
          <RefreshCcw
            size={18}
            className={historyLoading ? "loading-icon" : ""}
          />
          Làm mới
        </button>
      </header>

      <section className="data-mining-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={activeTab === tab.value ? "active" : ""}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </section>

      {activeTab === "apriori" && (
        <section className="mining-grid apriori-layout">
          {/* KHU VỰC THIẾT LẬP */}
          <article className="mining-card apriori-form-card">
            <div className="card-title">
              <div className="card-title-icon">
                <BrainCircuit size={22} />
              </div>

              <div>
                <h2>Phân tích sản phẩm mua kèm</h2>
                <p>
                  Tìm các sản phẩm khách hàng thường mua cùng trong một đơn hàng.
                </p>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-heading">
                <span className="section-number">1</span>

                <div>
                  <h3>Chọn khoảng thời gian</h3>
                  <p>Hệ thống sẽ phân tích những đơn hàng trong thời gian này.</p>
                </div>
              </div>

              <div className="form-grid form-grid-two-columns">
                <label className="form-field">
                  <span>Từ ngày</span>

                  <input
                    type="date"
                    name="start_date"
                    value={aprioriForm.start_date}
                    onChange={handleAprioriChange}
                  />
                </label>

                <label className="form-field">
                  <span>Đến ngày</span>

                  <input
                    type="date"
                    name="end_date"
                    value={aprioriForm.end_date}
                    onChange={handleAprioriChange}
                  />
                </label>
              </div>

              <p className="field-hint">
                Có thể để trống nếu muốn phân tích toàn bộ đơn hàng đã hoàn thành.
              </p>
            </div>

            <div className="form-section">
              <div className="form-section-heading">
                <span className="section-number">2</span>

                <div>
                  <h3>Chọn mức độ phân tích</h3>
                  <p>Chọn nhanh theo nhu cầu, không cần nhập thông số kỹ thuật.</p>
                </div>
              </div>

              <div className="analysis-level-list">
                <label
                  className={`analysis-level-option ${analysisLevel === "explore" ? "active" : ""
                    }`}
                >
                  <input
                    type="radio"
                    name="analysis_level"
                    value="explore"
                    checked={analysisLevel === "explore"}
                    onChange={handleAnalysisLevelChange}
                  />

                  <div className="analysis-level-content">
                    <div className="analysis-level-title">
                      <strong>Nhiều kết quả</strong>
                      <span className="level-badge level-explore">Khám phá</span>
                    </div>

                    <p>
                      Điều kiện tìm kiếm rộng, phù hợp khi muốn khám phá nhiều nhóm
                      sản phẩm mua cùng nhau.
                    </p>
                  </div>
                </label>

                <label
                  className={`analysis-level-option ${analysisLevel === "balanced" ? "active" : ""
                    }`}
                >
                  <input
                    type="radio"
                    name="analysis_level"
                    value="balanced"
                    checked={analysisLevel === "balanced"}
                    onChange={handleAnalysisLevelChange}
                  />

                  <div className="analysis-level-content">
                    <div className="analysis-level-title">
                      <strong>Cân bằng</strong>
                      <span className="level-badge level-recommended">
                        Khuyên dùng
                      </span>
                    </div>

                    <p>
                      Cân bằng giữa số lượng kết quả và độ tin cậy của sản phẩm mua
                      kèm.
                    </p>
                  </div>
                </label>

                <label
                  className={`analysis-level-option ${analysisLevel === "accurate" ? "active" : ""
                    }`}
                >
                  <input
                    type="radio"
                    name="analysis_level"
                    value="accurate"
                    checked={analysisLevel === "accurate"}
                    onChange={handleAnalysisLevelChange}
                  />

                  <div className="analysis-level-content">
                    <div className="analysis-level-title">
                      <strong>Độ tin cậy cao</strong>
                      <span className="level-badge level-accurate">Chặt chẽ</span>
                    </div>

                    <p>
                      Chỉ hiển thị những mối liên hệ nổi bật và có độ tin cậy cao.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-heading">
                <span className="section-number">3</span>

                <div>
                  <h3>Số kết quả muốn hiển thị</h3>
                  <p>Giới hạn số lượng kết quả trả về sau khi phân tích.</p>
                </div>
              </div>

              <label className="form-field result-limit-field">
                <span>Số kết quả</span>

                <input
                  type="number"
                  min="1"
                  max="100"
                  name="limit"
                  value={aprioriForm.limit}
                  onChange={handleAprioriChange}
                />

                <small>Từ 1 đến 100 kết quả.</small>
              </label>
            </div>

            <div className="advanced-settings">
              <button
                type="button"
                className="advanced-toggle"
                onClick={() => setShowAdvanced((previous) => !previous)}
              >
                <span>
                  <Settings2 size={18} />
                  Cài đặt nâng cao
                </span>

                <ChevronDown
                  size={18}
                  className={showAdvanced ? "rotate-icon" : ""}
                />
              </button>

              {showAdvanced && (
                <div className="advanced-content">
                  <div className="advanced-notice">
                    <Info size={18} />

                    <p>
                      Chỉ thay đổi các thông số dưới đây khi bạn đã hiểu cách hoạt
                      động của thuật toán Apriori.
                    </p>
                  </div>

                  <div className="form-grid form-grid-two-columns">
                    <label className="form-field">
                      <span>Tần suất xuất hiện tối thiểu</span>

                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        max="1"
                        name="min_support"
                        value={aprioriForm.min_support}
                        onChange={handleAprioriChange}
                      />

                      <small>
                        {formatPercent(aprioriForm.min_support)} số đơn hàng phải
                        chứa nhóm sản phẩm này.
                      </small>
                    </label>

                    <label className="form-field">
                      <span>Khả năng mua kèm tối thiểu</span>

                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        max="1"
                        name="min_confidence"
                        value={aprioriForm.min_confidence}
                        onChange={handleAprioriChange}
                      />

                      <small>
                        Ít nhất {formatPercent(aprioriForm.min_confidence)} khách mua
                        sản phẩm trước cũng mua sản phẩm sau.
                      </small>
                    </label>

                    <label className="form-field">
                      <span>Mức độ liên kết tối thiểu</span>

                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        name="min_lift"
                        value={aprioriForm.min_lift}
                        onChange={handleAprioriChange}
                      />

                      <small>
                        Lớn hơn 1 nghĩa là các sản phẩm có xu hướng được mua cùng.
                      </small>
                    </label>

                    <label className="form-field">
                      <span>Số sản phẩm tối đa trong một nhóm</span>

                      <input
                        type="number"
                        min="2"
                        max="5"
                        name="max_len"
                        value={aprioriForm.max_len}
                        onChange={handleAprioriChange}
                      />

                      <small>Mỗi nhóm có tối đa từ 2 đến 5 sản phẩm.</small>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="run-button apriori-run-button"
              disabled={aprioriLoading}
              onClick={handleRunApriori}
            >
              {aprioriLoading ? (
                <RefreshCcw size={19} className="loading-icon" />
              ) : (
                <Play size={19} />
              )}

              {aprioriLoading
                ? "Đang phân tích đơn hàng..."
                : "Bắt đầu phân tích"}
            </button>
          </article>

          {/* KHU VỰC KẾT QUẢ */}
          <article className="mining-card apriori-result-card">
            <div className="card-title">
              <div className="card-title-icon result-icon">
                <BarChart3 size={22} />
              </div>

              <div>
                <h2>Kết quả sản phẩm mua kèm</h2>
                <p>
                  Cho biết khách mua sản phẩm nào thì thường mua thêm sản phẩm nào.
                </p>
              </div>
            </div>

            {aprioriLoading ? (
              <div className="mining-result-state">
                <RefreshCcw size={28} className="loading-icon" />

                <div>
                  <strong>Đang phân tích dữ liệu</strong>
                  <span>Vui lòng chờ trong giây lát...</span>
                </div>
              </div>
            ) : aprioriError ? (
              <div className="mining-result-error">
                <strong>Không thể phân tích dữ liệu</strong>
                <span>{aprioriError}</span>
              </div>
            ) : !aprioriData ? (
              <div className="mining-result-empty">
                <div className="empty-result-icon">
                  <BarChart3 size={30} />
                </div>

                <strong>Chưa có kết quả phân tích</strong>

                <p>
                  Hãy chọn thời gian, mức độ phân tích và nhấn
                  <b> “Bắt đầu phân tích”</b>.
                </p>
              </div>
            ) : (
              <div className="apriori-result-content">
                {aprioriMessage && (
                  <div className="mining-result-success">{aprioriMessage}</div>
                )}

                <div className="result-summary">
                  <div className="summary-item">
                    <span>Đơn hàng đã phân tích</span>
                    <strong>
                      {Number(aprioriData.transaction_count ?? 0).toLocaleString(
                        "vi-VN"
                      )}
                    </strong>
                  </div>

                  <div className="summary-item">
                    <span>Sản phẩm được ghi nhận</span>
                    <strong>
                      {Number(aprioriData.product_count ?? 0).toLocaleString("vi-VN")}
                    </strong>
                  </div>

                  <div className="summary-item">
                    <span>Gợi ý mua kèm</span>
                    <strong>{aprioriRules.length}</strong>
                  </div>
                </div>

                {aprioriRules.length > 0 ? (
                  <>
                    <div className="result-explanation">
                      <Info size={18} />

                      <p>
                        Ví dụ: nếu cột đầu là “Cà phê” và cột sau là “Sữa”, điều đó
                        có nghĩa khách mua cà phê thường có xu hướng mua thêm sữa.
                      </p>
                    </div>

                    <div className="rule-table-wrapper">
                      <table className="rule-table">
                        <thead>
                          <tr>
                            <th>Khách đã mua</th>
                            <th>Thường mua thêm</th>
                            <th>Tỷ lệ xuất hiện chung</th>
                            <th>Khả năng mua thêm</th>
                            <th>Độ liên quan</th>
                          </tr>
                        </thead>

                        <tbody>
                          {aprioriRules.map((rule, index) => {
                            const liftLevel = getLiftLevel(rule.lift);

                            return (
                              <tr key={`rule-${index}`}>
                                <td>
                                  <span className="product-chip product-source">
                                    {getProductsText(rule.antecedents)}
                                  </span>
                                </td>

                                <td>
                                  <span className="product-chip product-target">
                                    {getProductsText(rule.consequents)}
                                  </span>
                                </td>

                                <td>{formatPercent(rule.support)}</td>

                                <td>
                                  <strong className="confidence-value">
                                    {formatPercent(rule.confidence)}
                                  </strong>
                                </td>

                                <td>
                                  <div className="lift-result">
                                    <span className={liftLevel.className}>
                                      {liftLevel.label}
                                    </span>

                                    <small>
                                      {Number(rule.lift ?? 0).toFixed(2)} lần
                                    </small>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : frequentItemsets.length > 0 ? (
                  <>
                    <div className="mining-result-warning">
                      Chưa tìm thấy sản phẩm mua kèm đủ tin cậy. Dưới đây là những
                      nhóm sản phẩm xuất hiện phổ biến trong đơn hàng.
                    </div>

                    <div className="rule-table-wrapper">
                      <table className="rule-table">
                        <thead>
                          <tr>
                            <th>STT</th>
                            <th>Nhóm sản phẩm phổ biến</th>
                            <th>Tỷ lệ đơn hàng xuất hiện</th>
                          </tr>
                        </thead>

                        <tbody>
                          {frequentItemsets.map((item, index) => (
                            <tr key={`itemset-${index}`}>
                              <td>{index + 1}</td>

                              <td>
                                <span className="product-chip">
                                  {getProductsText(item.items)}
                                </span>
                              </td>

                              <td>
                                <strong>{formatPercent(item.support)}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="mining-result-empty compact-empty">
                    <strong>Không tìm thấy sản phẩm mua kèm phù hợp</strong>

                    <p>
                      Hãy thử chọn mức “Nhiều kết quả” hoặc mở rộng khoảng thời gian
                      phân tích.
                    </p>
                  </div>
                )}

                {aprioriData.warning && (
                  <div className="mining-result-warning">
                    {aprioriData.warning}
                  </div>
                )}
              </div>
            )}
          </article>
        </section>
      )}
      {
        activeTab === "forecasting" && (
          <section className="mining-grid mining-grid--forecast">
            {/* THIẾT LẬP DỰ BÁO */}
            <article className="mining-card forecast-control-card">
              <div className="card-title">
                <span className="card-title__icon">
                  <TrendingUp size={21} />
                </span>

                <div>
                  <h2>Thiết lập dự báo doanh thu</h2>
                  <p>
                    Chọn dữ liệu bán hàng đã có để hệ thống dự đoán doanh thu trong
                    những ngày tiếp theo.
                  </p>
                </div>
              </div>

              <div className="forecast-mode-section">
                <span className="forecast-section-label">
                  Khoảng dữ liệu dùng để phân tích
                </span>

                <div className="forecast-mode-selector">
                  <button
                    type="button"
                    className={`forecast-mode-option ${forecastMode === "recent" ? "active" : ""
                      }`}
                    aria-pressed={forecastMode === "recent"}
                    onClick={() => handleForecastModeChange("recent")}
                  >
                    <span className="forecast-mode-icon">
                      <Clock3 size={21} />
                    </span>

                    <span className="forecast-mode-content">
                      <strong>180 ngày gần nhất</strong>
                      <small>Tự động lấy doanh thu gần nhất tính đến hôm nay.</small>
                    </span>

                    <span className="forecast-radio" aria-hidden="true">
                      <span />
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`forecast-mode-option ${forecastMode === "custom" ? "active" : ""
                      }`}
                    aria-pressed={forecastMode === "custom"}
                    onClick={() => handleForecastModeChange("custom")}
                  >
                    <span className="forecast-mode-icon">
                      <CalendarDays size={21} />
                    </span>

                    <span className="forecast-mode-content">
                      <strong>Tự chọn khoảng thời gian</strong>
                      <small>Chọn ngày bắt đầu và ngày kết thúc dữ liệu.</small>
                    </span>

                    <span className="forecast-radio" aria-hidden="true">
                      <span />
                    </span>
                  </button>
                </div>
              </div>

              {forecastMode === "recent" ? (
                <div className="forecast-form-section">
                  <div className="forecast-fields-grid">
                    <label className="forecast-field">
                      <span>Số ngày dữ liệu quá khứ</span>

                      <select
                        name="history_days"
                        value={forecastForm.history_days}
                        onChange={handleForecastChange}
                      >
                        <option value="30">30 ngày gần nhất</option>
                        <option value="90">90 ngày gần nhất</option>
                        <option value="180">180 ngày gần nhất</option>
                        <option value="365">365 ngày gần nhất</option>
                      </select>
                    </label>

                    <label className="forecast-field">
                      <span>Số ngày cần dự báo</span>

                      <input
                        type="number"
                        min="1"
                        max="90"
                        name="forecast_days"
                        value={forecastForm.forecast_days}
                        onChange={handleForecastChange}
                      />
                    </label>
                  </div>

                  <div className="forecast-mode-note">
                    <Clock3 size={18} />

                    <span>
                      Hệ thống sẽ phân tích{" "}
                      <strong>{forecastForm.history_days} ngày</strong> doanh thu gần
                      nhất và dự báo{" "}
                      <strong>{forecastForm.forecast_days} ngày</strong> tiếp theo.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="forecast-form-section">
                  <div className="forecast-fields-grid forecast-fields-grid--custom">
                    <label className="forecast-field">
                      <span>Ngày bắt đầu</span>

                      <input
                        type="date"
                        name="start_date"
                        value={forecastForm.start_date}
                        onChange={handleForecastChange}
                      />
                    </label>

                    <label className="forecast-field">
                      <span>Ngày kết thúc</span>

                      <input
                        type="date"
                        name="end_date"
                        value={forecastForm.end_date}
                        onChange={handleForecastChange}
                      />
                    </label>

                    <label className="forecast-field forecast-field--full">
                      <span>Số ngày cần dự báo</span>

                      <input
                        type="number"
                        min="1"
                        max="90"
                        name="forecast_days"
                        value={forecastForm.forecast_days}
                        onChange={handleForecastChange}
                      />
                    </label>
                  </div>

                  <div className="forecast-mode-note forecast-mode-note--custom">
                    <CalendarDays size={18} />

                    <span>
                      Hệ thống sẽ học dữ liệu từ{" "}
                      <strong>{forecastForm.start_date || "ngày bắt đầu"}</strong> đến{" "}
                      <strong>{forecastForm.end_date || "ngày kết thúc"}</strong>, sau
                      đó dự báo <strong>{forecastForm.forecast_days} ngày</strong>{" "}
                      tiếp theo.
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="run-button forecast-run-button"
                disabled={forecastLoading}
                onClick={handleRunForecasting}
              >
                {forecastLoading ? (
                  <RefreshCcw size={18} className="loading-icon" />
                ) : (
                  <Play size={18} />
                )}

                {forecastLoading
                  ? "Đang phân tích dữ liệu..."
                  : "Bắt đầu dự báo doanh thu"}
              </button>
            </article>

            {/* KẾT QUẢ DỰ BÁO */}
            <article className="mining-card forecast-result-card">
              <div className="card-title">
                <span className="card-title__icon">
                  <CalendarDays size={21} />
                </span>

                <div>
                  <h2>Kết quả dự báo doanh thu</h2>
                  <p>Doanh thu dự kiến được tính từ dữ liệu bán hàng trước đây.</p>
                </div>
              </div>

              {forecastLoading ? (
                <div className="mining-result-state forecast-loading-state">
                  <RefreshCcw size={24} className="loading-icon" />
                  <strong>Đang tạo dự báo</strong>
                  <span>Hệ thống đang phân tích dữ liệu doanh thu...</span>
                </div>
              ) : forecastError ? (
                <div className="mining-result-error">
                  <strong>Không thể tạo dự báo</strong>
                  <span>{forecastError}</span>
                </div>
              ) : !forecastResult ? (
                <div className="forecast-result-empty">
                  <div className="forecast-result-empty__icon">
                    <TrendingUp size={27} />
                  </div>

                  <strong>Chưa có kết quả dự báo</strong>
                  <p>
                    Chọn khoảng dữ liệu bên trái rồi nhấn “Bắt đầu dự báo doanh thu”.
                  </p>
                </div>
              ) : (
                (() => {
                  const historyItems = Array.isArray(forecastResult.history)
                    ? forecastResult.history
                    : [];

                  const resultForecastItems = Array.isArray(forecastResult.forecast)
                    ? forecastResult.forecast
                    : forecastItems;

                  const safeForecastItems = Array.isArray(resultForecastItems)
                    ? resultForecastItems
                    : [];

                  const period = forecastResult.period || {};
                  const metrics = forecastResult.metrics || {};

                  const formatForecastDate = (value) => {
                    if (!value) {
                      return "--";
                    }

                    const parts = String(value).split("-");

                    if (parts.length !== 3) {
                      return value;
                    }

                    const [year, month, day] = parts;
                    return `${day}/${month}/${year}`;
                  };

                  const getPredictedRevenue = (item) =>
                    Number(
                      item?.predicted_revenue ?? item?.revenue ?? item?.yhat ?? 0,
                    );

                  const firstHistoryDate = historyItems[0]?.date;
                  const lastHistoryDate = historyItems[historyItems.length - 1]?.date;

                  const firstForecastDate =
                    safeForecastItems[0]?.date || safeForecastItems[0]?.ds;

                  const lastForecastItem =
                    safeForecastItems[safeForecastItems.length - 1];

                  const lastForecastDate =
                    lastForecastItem?.date || lastForecastItem?.ds;

                  const totalPredictedRevenue = safeForecastItems.reduce(
                    (total, item) => total + getPredictedRevenue(item),
                    0,
                  );

                  const averagePredictedRevenue =
                    safeForecastItems.length > 0
                      ? totalPredictedRevenue / safeForecastItems.length
                      : 0;

                  const totalHistoryOrders = historyItems.reduce(
                    (total, item) => total + Number(item.order_count ?? 0),
                    0,
                  );

                  const trendMap = {
                    increasing: {
                      label: "Có xu hướng tăng",
                      className: "is-increasing",
                    },
                    decreasing: {
                      label: "Có xu hướng giảm",
                      className: "is-decreasing",
                    },
                    stable: {
                      label: "Tương đối ổn định",
                      className: "is-stable",
                    },
                  };

                  const trend = trendMap[forecastResult.trend] || {
                    label: "Chưa xác định",
                    className: "is-unknown",
                  };

                  const modelMap = {
                    linear_regression: "Hồi quy tuyến tính",
                  };

                  const modelName =
                    modelMap[forecastResult.model] ||
                    forecastResult.model ||
                    "Chưa xác định";

                  const periodHasMissingDates =
                    Boolean(period.end_date) &&
                    Boolean(lastHistoryDate) &&
                    lastHistoryDate < period.end_date;

                  return (
                    <div className="forecast-result-content">
                      <div className="forecast-result-hero">
                        <div>
                          <span className="forecast-result-hero__eyebrow">
                            Dự báo đã hoàn tất
                          </span>

                          <h3>{safeForecastItems.length} ngày doanh thu tiếp theo</h3>

                          <p>
                            Từ{" "}
                            <strong>{formatForecastDate(firstForecastDate)}</strong>{" "}
                            đến{" "}
                            <strong>{formatForecastDate(lastForecastDate)}</strong>
                          </p>
                        </div>

                        <span className={`forecast-trend ${trend.className}`}>
                          {trend.label}
                        </span>
                      </div>

                      {forecastResult.warning && (
                        <div className="forecast-warning">
                          <strong>Lưu ý về dữ liệu</strong>
                          <span>{forecastResult.warning}</span>
                        </div>
                      )}

                      {periodHasMissingDates && (
                        <div className="forecast-warning">
                          <strong>Dữ liệu chưa đủ đến ngày đã chọn</strong>
                          <span>
                            Bạn chọn đến {formatForecastDate(period.end_date)}, nhưng
                            dữ liệu thực tế hiện chỉ có đến{" "}
                            {formatForecastDate(lastHistoryDate)}.
                          </span>
                        </div>
                      )}

                      <div className="forecast-period-grid">
                        <div className="forecast-period-box">
                          <span>Khoảng thời gian đã chọn</span>
                          <strong>
                            {formatForecastDate(period.start_date)}
                            {" – "}
                            {formatForecastDate(period.end_date)}
                          </strong>
                          <small>{period.history_days || "--"} ngày lịch</small>
                        </div>

                        <div className="forecast-period-box">
                          <span>Dữ liệu thực tế được sử dụng</span>
                          <strong>
                            {formatForecastDate(firstHistoryDate)}
                            {" – "}
                            {formatForecastDate(lastHistoryDate)}
                          </strong>
                          <small>
                            {historyItems.length} ngày có doanh thu ·{" "}
                            {totalHistoryOrders} đơn hoàn thành
                          </small>
                        </div>
                      </div>

                      <div className="forecast-stat-grid">
                        <div className="forecast-stat">
                          <span>Doanh thu trung bình/ngày</span>
                          <strong>{formatCurrency(averagePredictedRevenue)}</strong>
                        </div>

                        <div className="forecast-stat">
                          <span>Tổng doanh thu dự kiến</span>
                          <strong>{formatCurrency(totalPredictedRevenue)}</strong>
                        </div>

                        <div className="forecast-stat">
                          <span>Sai số trung bình (MAE)</span>
                          <strong>± {formatCurrency(metrics.mae ?? 0)}</strong>
                        </div>
                      </div>

                      {forecastResult.summary && (
                        <div className="forecast-result-summary">
                          <TrendingUp size={19} />
                          <span>{forecastResult.summary}</span>
                        </div>
                      )}

                      <div className="forecast-list-heading">
                        <div>
                          <h3>Doanh thu dự kiến từng ngày</h3>
                          <p>
                            Số liệu mang tính dự đoán và có thể khác doanh thu thực
                            tế.
                          </p>
                        </div>

                        <span>{safeForecastItems.length} ngày</span>
                      </div>

                      {safeForecastItems.length > 0 ? (
                        <div className="forecast-list">
                          {safeForecastItems.map((item, index) => {
                            const itemDate =
                              item.date || item.ds || `Ngày ${index + 1}`;

                            return (
                              <div
                                className="forecast-item"
                                key={`${itemDate}-${index}`}
                              >
                                <div className="forecast-item__date">
                                  <span className="forecast-item__icon">
                                    <CalendarDays size={17} />
                                  </span>

                                  <div>
                                    <small>Ngày dự báo</small>
                                    <strong>{formatForecastDate(itemDate)}</strong>
                                  </div>
                                </div>

                                <div className="forecast-item__revenue">
                                  <small>Doanh thu dự kiến</small>
                                  <strong>
                                    {formatCurrency(getPredictedRevenue(item))}
                                  </strong>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mining-result-empty">
                          Backend chưa trả danh sách doanh thu dự báo.
                        </div>
                      )}

                      <details className="forecast-technical-details">
                        <summary>Xem thông tin mô hình và độ sai số</summary>

                        <div className="forecast-technical-grid">
                          <div>
                            <span>Phương pháp dự báo</span>
                            <strong>{modelName}</strong>
                          </div>

                          <div>
                            <span>MAE</span>
                            <strong>{formatCurrency(metrics.mae ?? 0)}</strong>
                            <small>Sai lệch trung bình mỗi ngày</small>
                          </div>

                          <div>
                            <span>RMSE</span>
                            <strong>{formatCurrency(metrics.rmse ?? 0)}</strong>
                            <small>Nhạy hơn với các ngày sai lệch lớn</small>
                          </div>
                        </div>
                      </details>
                    </div>
                  );
                })()
              )}
            </article>
          </section>
        )
      }
      {activeTab === "history" && (
        <section className="history-section">
          <div className="history-header">
            <div>
              <h2>Lịch sử chạy</h2>
              <p>
                Theo dõi các lần chạy Apriori và dự báo doanh thu.
              </p>
            </div>

            <button
              type="button"
              className="refresh-history-btn"
              onClick={loadMiningRuns}
              disabled={historyLoading}
            >
              <RefreshCcw
                size={17}
                className={historyLoading ? "spinning" : ""}
              />

              {historyLoading ? "Đang tải..." : "Làm mới"}
            </button>
          </div>

          {historyLoading ? (
            <div className="history-message">
              Đang tải lịch sử chạy...
            </div>
          ) : historyError ? (
            <div className="history-message error">
              {historyError}
            </div>
          ) : miningRuns.length === 0 ? (
            <div className="history-message">
              Chưa có lịch sử chạy Data Mining.
            </div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Loại phân tích</th>
                    <th>Tham số</th>
                    <th>Kết quả</th>
                    <th>Thời gian chạy</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRuns.map((history, index) => (
                    <tr key={history.id || `${history.run_type}-${history.created_at}-${index}`}>
                      <td>{index + 1}</td>

                      <td>
                        <span
                          className={`history-type ${history.run_type === "APRIORI"
                            ? "apriori"
                            : "forecasting"
                            }`}
                        >
                          {history.run_type === "APRIORI"
                            ? "Phân tích sản phẩm mua kèm"
                            : "Ước tính doanh thu sắp tới"}
                        </span>
                      </td>

                      <td>
                        {history.run_type === "APRIORI" ? (
                          <div className="history-parameters">
  <span>
    Mức độ phổ biến:{" "}
    {formatPercent(history.parameters?.min_support)}
  </span>

  <span>
    Tỷ lệ mua kèm:{" "}
    {formatPercent(history.parameters?.min_confidence)}
  </span>

  <span>
    Mức độ liên quan:{" "}
    {history.parameters?.min_lift ?? "---"} lần
  </span>
</div>
                        ) : (
                          <div className="history-parameters">
                            <span>
                              Dữ liệu cũ:{" "}
                              {history.parameters?.history_days ?? "---"} ngày
                            </span>

                            <span>
                              Dự báo:{" "}
                              {history.parameters?.forecast_days ?? "---"} ngày
                            </span>
                          </div>
                        )}
                      </td>

                      <td>
                        {history.run_type === "APRIORI" ? (
                          <div className="history-result">
                            <span>
                              Giao dịch:{" "}
                              {history.result?.transaction_count ?? 0}
                            </span>

                            <span>
                              Luật kết hợp:{" "}
                              {history.result?.rules?.length ?? 0}
                            </span>
                          </div>
                        ) : (
                          <div className="history-result">
                            <span>
                              Mô hình:{" "}
                              {history.result?.model || "Chưa xác định"}
                            </span>

                            <span>
                              Số ngày dự báo:{" "}
                              {history.result?.forecast?.length ?? 0}
                            </span>
                          </div>
                        )}
                      </td>

                      <td>
                        {history.created_at
                          ? new Date(history.created_at).toLocaleString(
                            "vi-VN"
                          )
                          : "---"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}