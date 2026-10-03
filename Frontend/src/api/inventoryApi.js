import axiosClient from "./axiosClient";

const inventoryApi = {
  // ==========================================
  // 1. TỒN KHO & GIAO DỊCH (STOCKS & TRANSACTIONS)
  // ==========================================

  // Lấy danh sách toàn bộ tồn kho: GET /inventory/stocks/
  getStocks: (params) => {
    return axiosClient.get("/inventory/stocks/", { params });
  },

  // Tạo mới một bản ghi tồn kho: POST /inventory/stocks/create/
  createStock: (data) => {
    return axiosClient.post("/inventory/stocks/create/", data);
  },

  // Lấy danh sách các mặt hàng chạm ngưỡng thiếu/hết hàng: GET /inventory/stocks/low-stock/
  getLowStocks: (params) => {
    return axiosClient.get("/inventory/stocks/low-stock/", { params });
  },

  // Thực hiện giao dịch Nhập / Xuất / Chuyển kho: POST /inventory/stocks/transaction/
  processTransaction: (data) => {
    return axiosClient.post("/inventory/stocks/transaction/", data);
  },

  // Chi tiết 1 bản ghi tồn kho: GET /inventory/stocks/<id>/
  getStockDetail: (id) => {
    return axiosClient.get(`/inventory/stocks/${id}/`);
  },

  // Cập nhật tồn kho / định mức tối thiểu: PUT /inventory/stocks/<id>/update/
  updateStock: (id, data) => {
    return axiosClient.put(`/inventory/stocks/${id}/update/`, data);
  },

  // Xóa bản ghi tồn kho: DELETE /inventory/stocks/<id>/delete/
  deleteStock: (id) => {
    return axiosClient.delete(`/inventory/stocks/${id}/delete/`);
  },

  // Lấy lịch sử biến động kho của 1 stock cụ thể: GET /inventory/stocks/<id>/movements/
  getStockMovements: (stockId, params) => {
    return axiosClient.get(`/inventory/stocks/${stockId}/movements/`, { params });
  },

  // ==========================================
  // 2. DANH MỤC KHO HÀNG (WAREHOUSES)
  // ==========================================

  // Lấy danh sách tất cả các kho: GET /inventory/warehouses/
  getWarehouses: (params) => {
    return axiosClient.get("/inventory/warehouses/", { params });
  },

  // Lấy danh sách các kho đang hoạt động (ACTIVE): GET /inventory/warehouses/active/
  getActiveWarehouses: () => {
    return axiosClient.get("/inventory/warehouses/active/");
  },

  // Tạo mới kho hàng: POST /inventory/warehouses/create/
  createWarehouse: (data) => {
    return axiosClient.post("/inventory/warehouses/create/", data);
  },

  // Chi tiết 1 kho hàng: GET /inventory/warehouses/<id>/
  getWarehouseDetail: (id) => {
    return axiosClient.get(`/inventory/warehouses/${id}/`);
  },

  // Cập nhật thông tin kho hàng: PUT /inventory/warehouses/<id>/update/
  updateWarehouse: (id, data) => {
    return axiosClient.put(`/inventory/warehouses/${id}/update/`, data);
  },

  // Xóa kho hàng: DELETE /inventory/warehouses/<id>/delete/
  deleteWarehouse: (id) => {
    return axiosClient.delete(`/inventory/warehouses/${id}/delete/`);
  },
};

export default inventoryApi;