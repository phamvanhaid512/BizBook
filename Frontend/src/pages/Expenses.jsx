import React, { useEffect, useRef, useState } from "react";
import {
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Filter,
  PieChart as PieChartIcon,
  RefreshCw,
  UploadCloud,
  AlertTriangle,
  FileText,
  LoaderCircle,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import expenseApi from "../api/expenseApi";
import "./ExpensesPage.css";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({ total_amount: 0, by_category: [] });
  const [loading, setLoading] = useState(false);

  // Bộ lọc
  const [filters, setFilters] = useState({
    start_date: "2026-07-01",
    end_date: "2026-09-30",
    category_id: "",
    status: "CONFIRMED",
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    category_id: "",
    expense_date: new Date().toISOString().split("T")[0],
    amount: "",
    supplier_name: "",
    description: "",
    status: "CONFIRMED",
    receipt_image: null,
  });

  // Trạng thái quét OCR trong Modal
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ocrWarning, setOcrWarning] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpensesData();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const res = await expenseApi.getCategories();
      setCategories(res.data?.data || []);
    } catch (err) {
      toast.error("Không thể lấy danh mục chi phí.");
    }
  };

  const fetchExpensesData = async () => {
    setLoading(true);
    try {
      const expRes = await expenseApi.getExpenses(filters);
      setExpenses(expRes.data?.data || []);

      if (filters.start_date && filters.end_date) {
        const sumRes = await expenseApi.getSummary({
          start_date: filters.start_date,
          end_date: filters.end_date,
        });
        setSummary(sumRes.data?.data || { total_amount: 0, by_category: [] });
      }
    } catch (err) {
      toast.error("Không thể tải dữ liệu sổ chi phí.");
    } finally {
      setLoading(false);
    }
  };

  // Mở modal Thêm/Sửa
  const handleOpenModal = (expense = null) => {
    setSelectedFile(null);
    setPreviewUrl("");
    setOcrWarning("");
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (expense) {
      setEditingId(expense.id);
      setFormData({
        category_id: expense.category,
        expense_date: expense.expense_date,
        amount: expense.amount,
        supplier_name: expense.supplier_name || "",
        description: expense.description || "",
        status: expense.status || "CONFIRMED",
        receipt_image: expense.receipt_image || null,
      });
    } else {
      setEditingId(null);
      setFormData({
        category_id: categories[0]?.id || "",
        expense_date: new Date().toISOString().split("T")[0],
        amount: "",
        supplier_name: "",
        description: "",
        status: "CONFIRMED",
        receipt_image: null,
      });
    }
    setIsModalOpen(true);
  };

  // Xử lý tải ảnh và quét OCR tự động điền form
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    console.log("file__________",file)
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.warning("Chỉ hỗ trợ file ảnh định dạng JPG, PNG.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setOcrWarning("");
    setIsAnalyzing(true);

    try {
      const payload = new FormData();
      payload.append("file", file);

      // Gọi API OCR bóc tách văn bản
      const response = await expenseApi.analyzeDocument(payload);
      const data = response.data?.data;
      const parsed = data?.parsed_data || {};

      // Tự động điền dữ liệu trích xuất vào form
      setFormData((prev) => ({
        ...prev,
        expense_date: parsed.expense_date || prev.expense_date,
        amount: parsed.amount > 0 ? parsed.amount : prev.amount,
        supplier_name: parsed.supplier_name || prev.supplier_name,
        description: parsed.description || prev.description,
        receipt_image: data?.image_name || file.name,
      }));

      // Bật cảnh báo nếu ảnh mờ/lóa hoặc điểm tin cậy thấp (Human-in-the-loop)
      if (data?.anomaly_detected || data?.needs_human_review) {
        const reasons = data?.anomaly_reasons?.join(", ") || "Chất lượng ảnh chưa tối ưu";
        setOcrWarning(`Cảnh báo (${data?.confidence_score}%): ${reasons}. Vui lòng kiểm tra lại.`);
        toast.warn("Đã bóc tách dữ liệu! Hãy kiểm tra lại trước khi lưu.");
      } else {
        toast.success(`Quét thành công! Độ tin cậy ${data?.confidence_score}%`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể phân tích ảnh này.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Xử lý gửi lưu khoản chi
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_id || !formData.amount || !formData.expense_date) {
      toast.warning("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        receipt_image: formData.receipt_image || selectedFile?.name || null,
      };

      if (editingId) {
        await expenseApi.updateExpense(editingId, payload);
        toast.success("Cập nhật khoản chi thành công!");
      } else {
        await expenseApi.createExpense(payload);
        toast.success("Ghi nhận khoản chi mới thành công!");
      }
      setIsModalOpen(false);
      fetchExpensesData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Có lỗi xảy ra khi lưu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa khoản chi này?")) return;
    try {
      await expenseApi.deleteExpense(id);
      toast.success("Xóa khoản chi thành công!");
      fetchExpensesData();
    } catch (err) {
      toast.error("Không thể xóa khoản chi.");
    }
  };

  return (
    <div className="expenses-page">
      {/* Header */}
      <div className="expenses-header">
        <div>
          <h2>Quản Lý Sổ Chi Phí & Chứng Từ</h2>
          <p>Tự động bóc tách hóa đơn OCR và theo dõi dòng tiền ra của quán</p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Ghi nhận chi phí
        </button>
      </div>

      {/* KPI Cards Summary */}
      <div className="expenses-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon bg-red">
            <DollarSign size={22} />
          </div>
          <div>
            <span className="kpi-label">Tổng chi tiêu (Thời gian lọc)</span>
            <h3 className="kpi-val text-red">
              {Number(summary.total_amount || 0).toLocaleString("vi-VN")} VNĐ
            </h3>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon bg-blue">
            <PieChartIcon size={22} />
          </div>
          <div>
            <span className="kpi-label">Số khoản chi phát sinh</span>
            <h3 className="kpi-val">{expenses.length} khoản</h3>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon bg-orange">
            <Filter size={22} />
          </div>
          <div>
            <span className="kpi-label">Hạng mục chi lớn nhất</span>
            <h3 className="kpi-val">
              {summary.by_category?.[0]?.category__name || "Chưa có"}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="expenses-filter-bar">
        <div className="filter-group">
          <Calendar size={16} />
          <span>Từ:</span>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) =>
              setFilters({ ...filters, start_date: e.target.value })
            }
          />
          <span>Đến:</span>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) =>
              setFilters({ ...filters, end_date: e.target.value })
            }
          />
        </div>

        <div className="filter-group">
          <select
            value={filters.category_id}
            onChange={(e) =>
              setFilters({ ...filters, category_id: e.target.value })
            }
          >
            <option value="">-- Tất cả danh mục --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button className="btn-refresh" onClick={fetchExpensesData} title="Tải lại">
          <RefreshCw size={16} className={loading ? "spin" : ""} />
        </button>
      </div>

      {/* Data Table */}
      <div className="expenses-table-wrapper">
        <table className="expenses-table">
          <thead>
            <tr>
              <th>Ngày chi</th>
              <th>Danh mục</th>
              <th>Nhà cung cấp / Đơn vị</th>
              <th>Mô tả chi tiết</th>
              <th>Số tiền (VNĐ)</th>
              <th>Trạng thái</th>
              <th>Chứng từ</th>
              <th className="text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-4">
                  Đang tải dữ liệu sổ chi phí...
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-4 text-muted">
                  Không tìm thấy khoản chi nào trong khoảng thời gian này.
                </td>
              </tr>
            ) : (
              expenses.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.expense_date}</strong></td>
                  <td>
                    <span className="category-tag">
                      {item.category_name || "Chi phí chung"}
                    </span>
                  </td>
                  <td>{item.supplier_name || "—"}</td>
                  <td>{item.description || "—"}</td>
                  <td className="text-red font-weight-bold">
                    {Number(item.amount).toLocaleString("vi-VN")} đ
                  </td>
                  <td>
                    <span className={`status-badge status-${item.status.toLowerCase()}`}>
                      {item.status === "CONFIRMED"
                        ? "Đã xác nhận"
                        : item.status === "DRAFT"
                        ? "Bản nháp"
                        : "Đã hủy"}
                    </span>
                  </td>
                  <td>
                    {item.receipt_image ? (
                      <span className="receipt-link" title={item.receipt_image}>
                        <FileText size={14} /> {item.receipt_image.split("/").pop()}
                      </span>
                    ) : (
                      <span className="text-muted">Không có</span>
                    )}
                  </td>
                  <td className="text-center actions-cell">
                    <button
                      className="btn-icon edit"
                      onClick={() => handleOpenModal(item)}
                      title="Sửa"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => handleDelete(item.id)}
                      title="Xóa"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ======================================================= */}
      {/* MODAL GHI NHẬN / SỬA CHI PHÍ (TÍCH HỢP QUÉT ẢNH OCR)    */}
      {/* ======================================================= */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "520px", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>
                {editingId ? "Chỉnh Sửa Khoản Chi" : "Ghi Nhận Khoản Chi Mới"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* KHU VỰC TẢI & QUÉT ẢNH HÓA ĐƠN TỰ ĐỘNG */}
            <div style={{ marginBottom: "16px" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleFileChange}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: "10px",
                  padding: "12px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "#f8fafc",
                }}
              >
                {isAnalyzing ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#2563eb" }}>
                    <LoaderCircle className="spin" size={18} />
                    <span style={{ fontSize: "13px", fontWeight: "600" }}>AI đang phân tích hóa đơn...</span>
                  </div>
                ) : previewUrl ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                    <img src={previewUrl} alt="Receipt" style={{ height: "36px", borderRadius: "4px", objectFit: "cover" }} />
                    <span style={{ fontSize: "12px", color: "#0f172a", fontWeight: "600" }}>
                      {selectedFile?.name} (Bấm để chọn ảnh khác)
                    </span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#475569" }}>
                    <UploadCloud size={18} color="#2563eb" />
                    <span style={{ fontSize: "13px", fontWeight: "600" }}>Tải lên ảnh hóa đơn / chứng từ để quét OCR</span>
                  </div>
                )}
              </div>

              {/* Dải cảnh báo bất thường nếu có */}
              {ocrWarning && (
                <div
                  style={{
                    marginTop: "8px",
                    padding: "8px 12px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    color: "#dc2626",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{ocrWarning}</span>
                </div>
              )}
            </div>

            {/* FORM THÔNG TIN KHOẢN CHI (TỰ ĐIỀN SAU KHI QUÉT) */}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Danh mục chi phí *</label>
                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value })
                  }
                  required
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Ngày phát sinh *</label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expense_date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Số tiền (VNĐ) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Ví dụ: 250000"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Nhà cung cấp / Nơi bán</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cửa hàng tiện lợi, Tiệm tạp hóa..."
                  value={formData.supplier_name}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier_name: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Mô tả chi tiết</label>
                <textarea
                  rows="3"
                  placeholder="Ghi chú thêm về khoản chi..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting || isAnalyzing}
                >
                  {isSubmitting ? "Đang lưu..." : editingId ? "Cập nhật" : "Lưu khoản chi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}