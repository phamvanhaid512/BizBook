import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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

// Component Phân Trang tái sử dụng
function PaginationBar({ currentPage, pageSize, totalItems, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="pagination-wrapper">
      <div className="pagination-info">
        Hiển thị <strong>{startItem} - {endItem}</strong> trên tổng số <strong>{totalItems}</strong> mục
      </div>

      <div className="pagination-controls">
        <div className="page-size-selector">
          <span>Số dòng:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
          >
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
            disabled={currentPage <= 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            title="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((pageNum, idx, arr) => (
              <span key={pageNum} style={{ display: "inline-flex" }}>
                {idx > 0 && arr[idx - 1] !== pageNum - 1 && (
                  <span className="page-ellipsis">...</span>
                )}
                <button
                  type="button"
                  className={`page-btn ${currentPage === pageNum ? "active" : ""}`}
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </button>
              </span>
            ))}

          <button
            type="button"
            className="page-btn"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            title="Trang sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DataMiningPage() {
  const [activeTab, setActiveTab] = useState("apriori");
  const [keyword, setKeyword] = useState("");
  const [analysisLevel, setAnalysisLevel] = useState("balanced");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 1. Apriori State & Pagination
  const [aprioriResult, setAprioriResult] = useState(null);
  const [aprioriLoading, setAprioriLoading] = useState(false);
  const [aprioriError, setAprioriError] = useState("");
  const [aprioriMessage, setAprioriMessage] = useState("");
  const [aprioriPage, setAprioriPage] = useState(1);
  const [aprioriPageSize, setAprioriPageSize] = useState(10);

  // 2. Forecast State & Pagination
  const [forecastResult, setForecastResult] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const [forecastMessage, setForecastMessage] = useState("");
  const [forecastMode, setForecastMode] = useState("recent");
  const [forecastPage, setForecastPage] = useState(1);
  const [forecastPageSize, setForecastPageSize] = useState(7);

  // 3. History State & Pagination
  const [miningRuns, setMiningRuns] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

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

  // Apriori Data Slicing
  const aprioriData = aprioriResult?.data?.data ?? aprioriResult?.data ?? aprioriResult ?? null;
  const aprioriRules = Array.isArray(aprioriData?.rules) ? aprioriData.rules : [];
  const frequentItemsets = Array.isArray(aprioriData?.frequent_itemsets)
    ? aprioriData.frequent_itemsets
    : [];

  const currentAprioriTotal = aprioriRules.length > 0 ? aprioriRules.length : frequentItemsets.length;
  const paginatedRules = useMemo(() => {
    const start = (aprioriPage - 1) * aprioriPageSize;
    return aprioriRules.slice(start, start + aprioriPageSize);
  }, [aprioriRules, aprioriPage, aprioriPageSize]);

  const paginatedFrequentItemsets = useMemo(() => {
    const start = (aprioriPage - 1) * aprioriPageSize;
    return frequentItemsets.slice(start, start + aprioriPageSize);
  }, [frequentItemsets, aprioriPage, aprioriPageSize]);

  // Forecast Data Slicing
  const rawForecastItems = Array.isArray(forecastResult?.forecast)
    ? forecastResult.forecast
    : Array.isArray(forecastResult?.predictions)
      ? forecastResult.predictions
      : [];

  const paginatedForecastItems = useMemo(() => {
    const start = (forecastPage - 1) * forecastPageSize;
    return rawForecastItems.slice(start, start + forecastPageSize);
  }, [rawForecastItems, forecastPage, forecastPageSize]);

  // History Runs Filter & Slicing
  const filteredRuns = useMemo(() => {
    const searchValue = keyword.trim().toLowerCase();
    if (!searchValue) return miningRuns;
    return miningRuns.filter((item) => {
      const runType = String(item.run_type || "").toLowerCase();
      const createdAt = formatDateTime(item.created_at).toLowerCase();
      return runType.includes(searchValue) || createdAt.includes(searchValue);
    });
  }, [keyword, miningRuns]);

  const paginatedRuns = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredRuns.slice(start, start + historyPageSize);
  }, [filteredRuns, historyPage, historyPageSize]);

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
      setAprioriPage(1);

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
      setForecastPage(1);

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
          <p>Phân tích sản phẩm thường mua cùng nhau, dự báo doanh thu và xem lại lịch sử phân tích.</p>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={loadMiningRuns}
          disabled={historyLoading}
        >
          <RefreshCcw size={18} className={historyLoading ? "loading-icon" : ""} />
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

      {/* ======================= TAB 1: APRIORI ======================= */}
      {activeTab === "apriori" && (
        <section className="mining-grid apriori-layout">
          <article className="mining-card apriori-form-card">
            <div className="card-title">
              <div className="card-title-icon"><BrainCircuit size={22} /></div>
              <div>
                <h2>Phân tích sản phẩm mua kèm</h2>
                <p>Tìm các sản phẩm khách hàng thường mua cùng trong một đơn hàng.</p>
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
              <p className="field-hint">Có thể để trống nếu muốn phân tích toàn bộ đơn hàng.</p>
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
                <label className={`analysis-level-option ${analysisLevel === "explore" ? "active" : ""}`}>
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
                    <p>Điều kiện tìm kiếm rộng, bao quát nhiều nhóm sản phẩm.</p>
                  </div>
                </label>

                <label className={`analysis-level-option ${analysisLevel === "balanced" ? "active" : ""}`}>
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
                      <span className="level-badge level-recommended">Khuyên dùng</span>
                    </div>
                    <p>Cân bằng giữa số lượng kết quả và độ tin cậy.</p>
                  </div>
                </label>

                <label className={`analysis-level-option ${analysisLevel === "accurate" ? "active" : ""}`}>
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
                    <p>Chỉ hiển thị nhóm sản phẩm liên kết nổi bật.</p>
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
              </label>
            </div>

            <button
              type="button"
              className="run-button apriori-run-button"
              disabled={aprioriLoading}
              onClick={handleRunApriori}
            >
              {aprioriLoading ? <RefreshCcw size={19} className="loading-icon" /> : <Play size={19} />}
              {aprioriLoading ? "Đang phân tích..." : "Bắt đầu phân tích"}
            </button>
          </article>

          <article className="mining-card apriori-result-card">
            <div className="card-title">
              <div className="card-title-icon result-icon"><BarChart3 size={22} /></div>
              <div>
                <h2>Kết quả sản phẩm mua kèm</h2>
                <p>Sản phẩm khách hàng có xu hướng mua kèm nhau.</p>
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
                <div className="empty-result-icon"><BarChart3 size={30} /></div>
                <strong>Chưa có kết quả phân tích</strong>
                <p>Hãy chọn thời gian, mức độ phân tích và nhấn <b>“Bắt đầu phân tích”</b>.</p>
              </div>
            ) : (
              <div className="apriori-result-content">
                {aprioriMessage && <div className="mining-result-success">{aprioriMessage}</div>}

                <div className="result-summary">
                  <div className="summary-item">
                    <span>Đơn hàng đã phân tích</span>
                    <strong>{Number(aprioriData.transaction_count ?? 0).toLocaleString("vi-VN")}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Sản phẩm ghi nhận</span>
                    <strong>{Number(aprioriData.product_count ?? 0).toLocaleString("vi-VN")}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Gợi ý mua kèm</span>
                    <strong>{aprioriRules.length}</strong>
                  </div>
                </div>

                {aprioriRules.length > 0 ? (
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
                        {paginatedRules.map((rule, index) => {
                          const liftLevel = getLiftLevel(rule.lift);
                          return (
                            <tr key={`rule-${index}`}>
                              <td><span className="product-chip product-source">{getProductsText(rule.antecedents)}</span></td>
                              <td><span className="product-chip product-target">{getProductsText(rule.consequents)}</span></td>
                              <td>{formatPercent(rule.support)}</td>
                              <td><strong className="confidence-value">{formatPercent(rule.confidence)}</strong></td>
                              <td>
                                <div className="lift-result">
                                  <span className={liftLevel.className}>{liftLevel.label}</span>
                                  <small>{Number(rule.lift ?? 0).toFixed(2)} lần</small>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : frequentItemsets.length > 0 ? (
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
                        {paginatedFrequentItemsets.map((item, index) => (
                          <tr key={`itemset-${index}`}>
                            <td>{(aprioriPage - 1) * aprioriPageSize + index + 1}</td>
                            <td><span className="product-chip">{getProductsText(item.items)}</span></td>
                            <td><strong>{formatPercent(item.support)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mining-result-empty compact-empty">
                    <strong>Không tìm thấy sản phẩm mua kèm phù hợp</strong>
                  </div>
                )}

                {/* Phân trang Apriori */}
                <PaginationBar
                  currentPage={aprioriPage}
                  pageSize={aprioriPageSize}
                  totalItems={currentAprioriTotal}
                  onPageChange={setAprioriPage}
                  onPageSizeChange={setAprioriPageSize}
                />
              </div>
            )}
          </article>
        </section>
      )}

      {/* ======================= TAB 2: FORECASTING ======================= */}
      {activeTab === "forecasting" && (
        <section className="mining-grid mining-grid--forecast">
          <article className="mining-card forecast-control-card">
            <div className="card-title">
              <span className="card-title__icon"><TrendingUp size={21} /></span>
              <div>
                <h2>Thiết lập dự báo doanh thu</h2>
                <p>Học từ dữ liệu quá khứ để dự đoán doanh thu ngày tới.</p>
              </div>
            </div>

            <div className="forecast-mode-section">
              <span className="forecast-section-label">Khoảng dữ liệu dùng để phân tích</span>
              <div className="forecast-mode-selector">
                <button
                  type="button"
                  className={`forecast-mode-option ${forecastMode === "recent" ? "active" : ""}`}
                  onClick={() => handleForecastModeChange("recent")}
                >
                  <span className="forecast-mode-icon"><Clock3 size={21} /></span>
                  <span className="forecast-mode-content">
                    <strong>180 ngày gần nhất</strong>
                    <small>Tự động lấy doanh thu gần nhất.</small>
                  </span>
                </button>

                <button
                  type="button"
                  className={`forecast-mode-option ${forecastMode === "custom" ? "active" : ""}`}
                  onClick={() => handleForecastModeChange("custom")}
                >
                  <span className="forecast-mode-icon"><CalendarDays size={21} /></span>
                  <span className="forecast-mode-content">
                    <strong>Tự chọn khoảng thời gian</strong>
                    <small>Chọn ngày bắt đầu và kết thúc.</small>
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
              </div>
            )}

            <button
              type="button"
              className="run-button forecast-run-button"
              disabled={forecastLoading}
              onClick={handleRunForecasting}
            >
              {forecastLoading ? <RefreshCcw size={18} className="loading-icon" /> : <Play size={18} />}
              {forecastLoading ? "Đang phân tích..." : "Bắt đầu dự báo doanh thu"}
            </button>
          </article>

          <article className="mining-card forecast-result-card">
            <div className="card-title">
              <span className="card-title__icon"><CalendarDays size={21} /></span>
              <div>
                <h2>Kết quả dự báo doanh thu</h2>
                <p>Doanh thu dự kiến được tính từ dữ liệu quá khứ.</p>
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
                <div className="forecast-result-empty__icon"><TrendingUp size={27} /></div>
                <strong>Chưa có kết quả dự báo</strong>
                <p>Chọn khoảng dữ liệu bên trái rồi nhấn “Bắt đầu dự báo doanh thu”.</p>
              </div>
            ) : (
              (() => {
                const historyItems = Array.isArray(forecastResult.history) ? forecastResult.history : [];
                const metrics = forecastResult.metrics || {};

                const formatForecastDate = (value) => {
                  if (!value) return "--";
                  const parts = String(value).split("-");
                  if (parts.length !== 3) return value;
                  const [year, month, day] = parts;
                  return `${day}/${month}/${year}`;
                };

                const getPredictedRevenue = (item) =>
                  Number(item?.predicted_revenue ?? item?.revenue ?? item?.yhat ?? 0);

                const totalPredictedRevenue = rawForecastItems.reduce(
                  (total, item) => total + getPredictedRevenue(item),
                  0,
                );

                const averagePredictedRevenue =
                  rawForecastItems.length > 0 ? totalPredictedRevenue / rawForecastItems.length : 0;

                return (
                  <div className="forecast-result-content">
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

                    <div className="forecast-list-heading" style={{ marginTop: "16px" }}>
                      <div>
                        <h3>Doanh thu dự kiến từng ngày</h3>
                        <p>Dự báo chi tiết theo từng ngày sắp tới.</p>
                      </div>
                      <span>{rawForecastItems.length} ngày</span>
                    </div>

                    {/* Danh sách dự báo đã cắt phân trang */}
                    {paginatedForecastItems.length > 0 ? (
                      <div className="forecast-list">
                        {paginatedForecastItems.map((item, index) => {
                          const itemDate = item.date || item.ds || `Ngày ${(forecastPage - 1) * forecastPageSize + index + 1}`;
                          return (
                            <div className="forecast-item" key={`${itemDate}-${index}`}>
                              <div className="forecast-item__date">
                                <span className="forecast-item__icon"><CalendarDays size={17} /></span>
                                <div>
                                  <small>Ngày dự báo</small>
                                  <strong>{formatForecastDate(itemDate)}</strong>
                                </div>
                              </div>
                              <div className="forecast-item__revenue">
                                <small>Doanh thu dự kiến</small>
                                <strong>{formatCurrency(getPredictedRevenue(item))}</strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mining-result-empty">Backend chưa trả danh sách doanh thu dự báo.</div>
                    )}

                    {/* Phân trang Dự báo doanh thu */}
                    <PaginationBar
                      currentPage={forecastPage}
                      pageSize={forecastPageSize}
                      totalItems={rawForecastItems.length}
                      onPageChange={setForecastPage}
                      onPageSizeChange={setForecastPageSize}
                    />
                  </div>
                );
              })()
            )}
          </article>
        </section>
      )}

      {/* ======================= TAB 3: HISTORY ======================= */}
      {activeTab === "history" && (
        <section className="history-section">
          <div className="history-header">
            <div>
              <h2>Lịch sử chạy</h2>
              <p>Theo dõi các lần chạy Apriori và dự báo doanh thu.</p>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div className="history-search-box" style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Tìm kiếm loại, ngày..."
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setHistoryPage(1);
                  }}
                  style={{
                    padding: "6px 10px 6px 30px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "13px",
                  }}
                />
                <Search size={15} style={{ position: "absolute", left: 9, top: 9, color: "#94a3b8" }} />
              </div>

              <button
                type="button"
                className="refresh-history-btn"
                onClick={loadMiningRuns}
                disabled={historyLoading}
              >
                <RefreshCcw size={17} className={historyLoading ? "spinning" : ""} />
                {historyLoading ? "Đang tải..." : "Làm mới"}
              </button>
            </div>
          </div>

          {historyLoading ? (
            <div className="history-message">Đang tải lịch sử chạy...</div>
          ) : historyError ? (
            <div className="history-message error">{historyError}</div>
          ) : filteredRuns.length === 0 ? (
            <div className="history-message">Chưa có lịch sử chạy Data Mining phù hợp.</div>
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
                  {paginatedRuns.map((history, index) => (
                    <tr key={history.id || `${history.run_type}-${history.created_at}-${index}`}>
                      <td>{(historyPage - 1) * historyPageSize + index + 1}</td>
                      <td>
                        <span className={`history-type ${history.run_type === "APRIORI" ? "apriori" : "forecasting"}`}>
                          {history.run_type === "APRIORI" ? "Phân tích mua kèm" : "Dự báo doanh thu"}
                        </span>
                      </td>
                      <td>
                        {history.run_type === "APRIORI" ? (
                          <div className="history-parameters">
                            <span>Mức phổ biến: {formatPercent(history.parameters?.min_support)}</span>
                            <span>Tỷ lệ mua kèm: {formatPercent(history.parameters?.min_confidence)}</span>
                            <span>Độ liên quan: {history.parameters?.min_lift ?? "---"} lần</span>
                          </div>
                        ) : (
                          <div className="history-parameters">
                            <span>Dữ liệu cũ: {history.parameters?.history_days ?? "---"} ngày</span>
                            <span>Dự báo: {history.parameters?.forecast_days ?? "---"} ngày</span>
                          </div>
                        )}
                      </td>
                      <td>
                        {history.run_type === "APRIORI" ? (
                          <div className="history-result">
                            <span>Giao dịch: {history.result?.transaction_count ?? 0}</span>
                            <span>Luật kết hợp: {history.result?.rules?.length ?? 0}</span>
                          </div>
                        ) : (
                          <div className="history-result">
                            <span>Mô hình: {history.result?.model || "Hồi quy tuyến tính"}</span>
                            <span>Số ngày dự báo: {history.result?.forecast?.length ?? 0}</span>
                          </div>
                        )}
                      </td>
                      <td>{history.created_at ? new Date(history.created_at).toLocaleString("vi-VN") : "---"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Phân trang Lịch sử chạy */}
              <PaginationBar
                currentPage={historyPage}
                pageSize={historyPageSize}
                totalItems={filteredRuns.length}
                onPageChange={setHistoryPage}
                onPageSizeChange={setHistoryPageSize}
              />
            </div>
          )}
        </section>
      )}
    </main>
  );
}