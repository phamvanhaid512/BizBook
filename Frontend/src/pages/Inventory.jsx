import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import inventoryApi from "../api/inventoryApi";
import "./Inventory.css";

export default function InventoryPage() {
  // Dữ liệu từ API
  const [stocks, setStocks] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);

  // States Lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("ALL");

  // States Phân trang (Pagination)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // States Modal Phiếu Kho
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("IMPORT"); // 'IMPORT' | 'EXPORT' | 'TRANSFER'
  const [selectedStock, setSelectedStock] = useState(null);
  const [inputQuantity, setInputQuantity] = useState(10);
  const [targetWarehouseCode, setTargetWarehouseCode] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch dữ liệu Tồn kho & Danh mục Kho
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stocksRes, warehousesRes] = await Promise.all([
        inventoryApi.getStocks(),
        inventoryApi.getWarehouses(),
      ]);

      const rawStocks = stocksRes?.data !== undefined ? stocksRes.data : stocksRes;
      const rawWarehouses = warehousesRes?.data !== undefined ? warehousesRes.data : warehousesRes;

      const stocksData = Array.isArray(rawStocks)
        ? rawStocks
        : Array.isArray(rawStocks?.data)
        ? rawStocks.data
        : rawStocks?.results || [];

      const warehousesData = Array.isArray(rawWarehouses)
        ? rawWarehouses
        : Array.isArray(rawWarehouses?.data)
        ? rawWarehouses.data
        : rawWarehouses?.results || [];

      setStocks(stocksData);
      setWarehouses(warehousesData);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu kho:", err);
      toast.error("Không thể kết nối đến máy chủ API kho hàng!");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset về trang 1 mỗi khi đổi từ khóa tìm kiếm hoặc đổi kho lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedWarehouse, itemsPerPage]);

  // 2. Tính toán chỉ số KPI
  const totalSku = stocks.length;
  const lowStockCount = stocks.filter(
    (i) => i.is_low_stock || i.quantity <= (i.min_threshold ?? 10)
  ).length;

  // 3. Lọc danh sách hiển thị
  const filteredStocks = useMemo(() => {
    return stocks.filter((item) => {
      const prodName =
        item.product_name ||
        item.product?.product_name ||
        item.product?.name ||
        "";
      const sku =
        item.sku ||
        item.product?.sku ||
        `SP-${item.product_id || item.product?.id || item.id}`;

      const whId =
        item.warehouse_id ||
        (typeof item.warehouse === "object" ? item.warehouse?.id : item.warehouse);
      const whCode =
        item.warehouse_code ||
        item.warehouse?.code ||
        "";

      const matchSearch =
        prodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sku.toLowerCase().includes(searchTerm.toLowerCase());

      const matchWarehouse =
        selectedWarehouse === "ALL" ||
        String(whId) === String(selectedWarehouse) ||
        whCode === selectedWarehouse;

      return matchSearch && matchWarehouse;
    });
  }, [stocks, searchTerm, selectedWarehouse]);

  // 4. Tính toán dữ liệu phân trang
  const totalItems = filteredStocks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStocks = filteredStocks.slice(startIndex, startIndex + itemsPerPage);

  // 5. Mở Popup Modal thao tác
  const handleOpenModal = (type, stockItem = null) => {
    setModalType(type);
    const targetItem = stockItem || paginatedStocks[0] || stocks[0] || null;
    setSelectedStock(targetItem);
    setInputQuantity(10);
    setNote("");

    if (targetItem) {
      const currentWhCode =
        targetItem.warehouse_code ||
        (typeof targetItem.warehouse === "object"
          ? targetItem.warehouse?.code
          : targetItem.warehouse);

      const otherWh = warehouses.find((w) => w.code !== currentWhCode);
      if (otherWh) {
        setTargetWarehouseCode(otherWh.code);
      }
    }

    setIsModalOpen(true);
  };

  // 6. Xác nhận & Thực hiện giao dịch kho
  const handleConfirmTransaction = async (e) => {
    e.preventDefault();
    if (!selectedStock) return;

    const qty = parseInt(inputQuantity, 10);
    if (!qty || qty <= 0) {
      toast.warning("Vui lòng nhập số lượng lớn hơn 0!");
      return;
    }

    if (modalType === "EXPORT" && qty > selectedStock.quantity) {
      toast.warning(`Kho không đủ hàng để xuất! Hiện tồn: ${selectedStock.quantity}`);
      return;
    }

    if (modalType === "TRANSFER" && qty > selectedStock.quantity) {
      toast.warning(`Tồn kho không đủ để chuyển! Hiện tại: ${selectedStock.quantity}`);
      return;
    }

    const toastId = toast.loading("Đang xử lý phiếu kho...");
    setSubmitting(true);

    try {
      const payload = {
        stock_id: Number(selectedStock.id),
        action_type: modalType,
        quantity: qty,
        reference_code: `REF-${Date.now().toString().slice(-6)}`,
        note:
          note ||
          (modalType === "IMPORT"
            ? "Nhập kho"
            : modalType === "EXPORT"
            ? "Xuất kho"
            : "Chuyển kho"),
        target_warehouse_code: modalType === "TRANSFER" ? targetWarehouseCode : null,
      };

      const res = await inventoryApi.processTransaction(payload);
      const resData = res?.data !== undefined ? res.data : res;

      if (resData && resData.success === false) {
        toast.update(toastId, {
          render: resData.message || "Giao dịch kho không thành công!",
          type: "error",
          isLoading: false,
          autoClose: 2500,
        });
        return;
      }

      const actionText =
        modalType === "IMPORT"
          ? "Nhập kho"
          : modalType === "EXPORT"
          ? "Xuất kho"
          : "Chuyển kho";

      toast.update(toastId, {
        render: resData?.message || `${actionText} thành công!`,
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });

      await fetchData();
      setIsModalOpen(false);
    } catch (err) {
      console.error("Lỗi cập nhật kho:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Xử lý phiếu kho thất bại!";

      toast.update(toastId, {
        render: errorMsg,
        type: "error",
        isLoading: false,
        autoClose: 2500,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="biz-inv-container">
      {/* Top Banner Card */}
      <section className="biz-inv-banner">
        <div className="biz-inv-badge">INVENTORY MANAGEMENT</div>
        <div className="biz-inv-banner-content">
          <div className="biz-inv-banner-text">
            <h1>Quản trị kho hàng & Lưu chuyển</h1>
            <p>
              Theo dõi định mức tồn kho thời gian thực, quản lý phiếu xuất nhập kho BizBook.
            </p>
          </div>
          <div className="biz-inv-banner-actions">
            <button
              className="biz-inv-btn biz-inv-btn-outline"
              onClick={() => handleOpenModal("TRANSFER")}
              disabled={stocks.length === 0}
            >
              + Chuyển kho
            </button>
            <button
              className="biz-inv-btn biz-inv-btn-primary"
              onClick={() => handleOpenModal("IMPORT")}
              disabled={stocks.length === 0}
            >
              + Tạo phiếu nhập / xuất
            </button>
          </div>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="biz-inv-kpi-grid">
        <div className="biz-inv-kpi-card">
          <div className="biz-inv-kpi-icon blue">📦</div>
          <div className="biz-inv-kpi-info">
            <span className="label">Tổng mặt hàng tồn</span>
            <h3>
              {totalSku} <small>SKU</small>
            </h3>
          </div>
        </div>

        <div className="biz-inv-kpi-card">
          <div className="biz-inv-kpi-icon red">⚠️</div>
          <div className="biz-inv-kpi-info">
            <span className="label">Sắp hết hàng (Dưới định mức)</span>
            <h3 className="danger-text">
              {lowStockCount} <small>sản phẩm</small>
            </h3>
          </div>
        </div>

        <div className="biz-inv-kpi-card">
          <div className="biz-inv-kpi-icon purple">📑</div>
          <div className="biz-inv-kpi-info">
            <span className="label">Tổng điểm kho vận</span>
            <h3>
              {warehouses.length} <small>kho</small>
            </h3>
          </div>
        </div>
      </section>

      {/* Main Table Card */}
      <section className="biz-inv-card">
        <div className="biz-inv-card-header">
          <div>
            <h2>Danh mục sản phẩm trong kho</h2>
            <p className="subtitle">
              Dữ liệu đồng bộ tự động với hệ thống POS & Bán hàng
            </p>
          </div>

          <div className="biz-inv-filters">
            <input
              type="text"
              placeholder="Tìm theo mã SKU hoặc tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="biz-inv-input"
            />
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="biz-inv-select"
            >
              <option value="ALL">Tất cả các kho</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="biz-inv-table-wrapper">
          <table className="biz-inv-table">
            <thead>
              <tr>
                <th>MÃ SKU</th>
                <th>TÊN MẶT HÀNG</th>
                <th>KHO CHỨA</th>
                <th>TỒN HIỆN TẠI</th>
                <th>ĐỊNH MỨC TỐI THIỂU</th>
                <th>TRẠNG THÁI</th>
                <th className="text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "35px" }}>
                    Đang nạp dữ liệu kho...
                  </td>
                </tr>
              ) : paginatedStocks.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "35px" }}>
                    Không có sản phẩm nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedStocks.map((item) => {
                  const minThreshold = item.min_threshold ?? 10;
                  const isLow = item.is_low_stock || item.quantity <= minThreshold;
                  const sku =
                    item.sku ||
                    item.product?.sku ||
                    `SP-${item.product_id || item.product?.id || item.id}`;
                  const prodName =
                    item.product_name ||
                    item.product?.product_name ||
                    item.product?.name ||
                    "Sản phẩm";
                  const whName =
                    item.warehouse_name ||
                    item.warehouse?.name ||
                    "Kho hàng";
                  const unit = item.unit || item.product?.unit || "món";

                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="sku-badge">{sku}</span>
                      </td>
                      <td>
                        <strong className="product-title">{prodName}</strong>
                      </td>
                      <td>{whName}</td>
                      <td>
                        <span className={`qty-val ${isLow ? "danger-text" : ""}`}>
                          {item.quantity}
                        </span>{" "}
                        {unit}
                      </td>
                      <td>{minThreshold} {unit}</td>
                      <td>
                        <span className={`status-pill ${isLow ? "danger" : "success"}`}>
                          {isLow ? "Cảnh báo thiếu" : "Còn hàng"}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          className={`biz-inv-action-btn ${isLow ? "highlight" : ""}`}
                          onClick={() => handleOpenModal("IMPORT", item)}
                        >
                          {isLow ? "Nhập ngay" : "Nhập kho"}
                        </button>
                        <button
                          className="biz-inv-action-btn"
                          onClick={() => handleOpenModal("EXPORT", item)}
                        >
                          Xuất kho
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh Phân Trang (Pagination Controls) */}
        {!loading && totalItems > 0 && (
          <div className="biz-inv-pagination">
            <div className="biz-inv-pagination-info">
              Hiển thị <strong>{startIndex + 1}</strong> -{" "}
              <strong>{Math.min(startIndex + itemsPerPage, totalItems)}</strong> trên tổng số{" "}
              <strong>{totalItems}</strong> mặt hàng
            </div>

            <div className="biz-inv-pagination-actions">
              <div className="biz-inv-per-page">
                <span>Số dòng:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="biz-inv-select-small"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="biz-inv-page-btns">
                <button
                  className="biz-inv-page-btn"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  ‹ Trước
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={page}>
                        {prev && page - prev > 1 && <span className="biz-inv-page-dots">...</span>}
                        <button
                          className={`biz-inv-page-btn ${currentPage === page ? "active" : ""}`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  className="biz-inv-page-btn"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Sau ›
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Modal Popup Thao Tác Kho */}
      {isModalOpen && (
        <div
          className="biz-inv-modal-overlay"
          onClick={() => !submitting && setIsModalOpen(false)}
        >
          <div
            className="biz-inv-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="biz-inv-modal-header">
              <h3>
                {modalType === "IMPORT" && "📦 Phiếu Nhập Kho"}
                {modalType === "EXPORT" && "📤 Phiếu Xuất Kho"}
                {modalType === "TRANSFER" && "🔄 Phiếu Chuyển Kho"}
              </h3>
              <button
                className="biz-inv-close-btn"
                onClick={() => !submitting && setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmTransaction} className="biz-inv-modal-body">
              <div className="biz-inv-form-group">
                <label>Sản phẩm thao tác:</label>
                <select
                  value={selectedStock?.id || ""}
                  onChange={(e) => {
                    const picked = stocks.find(
                      (s) => s.id === parseInt(e.target.value, 10)
                    );
                    setSelectedStock(picked);
                    if (picked) {
                      const curWhCode =
                        picked.warehouse_code ||
                        (typeof picked.warehouse === "object"
                          ? picked.warehouse?.code
                          : picked.warehouse);

                      const otherWh = warehouses.find((w) => w.code !== curWhCode);
                      if (otherWh) setTargetWarehouseCode(otherWh.code);
                    }
                  }}
                  className="biz-inv-form-control"
                  disabled={submitting}
                >
                  {stocks.map((item) => {
                    const sku =
                      item.sku ||
                      item.product?.sku ||
                      `SP-${item.product_id || item.product?.id || item.id}`;
                    const prodName =
                      item.product_name ||
                      item.product?.product_name ||
                      item.product?.name ||
                      "Sản phẩm";
                    const whName =
                      item.warehouse_name ||
                      item.warehouse?.name ||
                      "";
                    return (
                      <option key={item.id} value={item.id}>
                        [{sku}] {prodName} ({whName}) | Tồn: {item.quantity}
                      </option>
                    );
                  })}
                </select>
              </div>

              {modalType === "TRANSFER" ? (
                <div className="biz-inv-form-row">
                  <div className="biz-inv-form-group">
                    <label>Xuất từ kho:</label>
                    <input
                      type="text"
                      className="biz-inv-form-control"
                      value={
                        selectedStock?.warehouse_name ||
                        selectedStock?.warehouse?.name ||
                        selectedStock?.warehouse_code ||
                        "Kho hiện tại"
                      }
                      disabled
                    />
                  </div>
                  <div className="biz-inv-form-group">
                    <label>Chuyển tới kho đích:</label>
                    <select
                      className="biz-inv-form-control"
                      value={targetWarehouseCode}
                      onChange={(e) => setTargetWarehouseCode(e.target.value)}
                      disabled={submitting}
                      required
                    >
                      {warehouses
                        .filter((w) => {
                          const currentWhCode =
                            selectedStock?.warehouse_code ||
                            (typeof selectedStock?.warehouse === "object"
                              ? selectedStock?.warehouse?.code
                              : selectedStock?.warehouse);
                          return w.code !== currentWhCode;
                        })
                        .map((w) => (
                          <option key={w.id} value={w.code}>
                            {w.name} ({w.code})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="biz-inv-form-group">
                  <label>Kho áp dụng:</label>
                  <input
                    type="text"
                    className="biz-inv-form-control"
                    value={
                      selectedStock?.warehouse_name ||
                      selectedStock?.warehouse?.name ||
                      "Kho mặc định"
                    }
                    disabled
                  />
                </div>
              )}

              <div className="biz-inv-form-group">
                <label>
                  Số lượng (
                  {modalType === "EXPORT"
                    ? "Xuất"
                    : modalType === "TRANSFER"
                    ? "Chuyển"
                    : "Nhập"}
                  ):
                </label>
                <input
                  type="number"
                  min="1"
                  max={
                    modalType === "EXPORT" || modalType === "TRANSFER"
                      ? selectedStock?.quantity
                      : undefined
                  }
                  value={inputQuantity}
                  onChange={(e) => setInputQuantity(e.target.value)}
                  className="biz-inv-form-control"
                  disabled={submitting}
                  required
                />
              </div>

              <div className="biz-inv-form-group">
                <label>Ghi chú / Mã chứng từ:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Xuất bán lẻ, nhập bổ sung quầy..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="biz-inv-form-control"
                  disabled={submitting}
                />
              </div>

              <div className="biz-inv-modal-footer">
                <button
                  type="button"
                  className="biz-inv-btn biz-inv-btn-outline dark-text"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="biz-inv-btn biz-inv-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Đang xử lý..." : "Lưu & Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}