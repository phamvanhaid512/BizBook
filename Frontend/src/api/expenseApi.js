import axiosClient from "./axiosClient";

const expenseApi = {
  analyzeDocument: (formData) => {
    return axiosClient.post("/documents/analyze/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  // Lấy danh sách chi phí (có lọc theo ngày, danh mục)
  getExpenses: (params) => {
    return axiosClient.get("/expenses/", { params });
  },

  // Lấy tổng hợp chi phí và thống kê theo nhóm
  getSummary: (params) => {
    return axiosClient.get("/expenses/summary/", { params });
  },

  // Lấy danh mục chi phí
  getCategories: () => {
    return axiosClient.get("/expenses/categories/");
  },

  // Thêm mới khoản chi thủ công
  createExpense: (data) => {
    return axiosClient.post("/expenses/", data);
  },

  // Cập nhật khoản chi
  updateExpense: (id, data) => {
    return axiosClient.put(`/expenses/${id}/`, data);
  },

  // Xóa khoản chi
  deleteExpense: (id) => {
    return axiosClient.delete(`/expenses/${id}/`);
  },
};

export default expenseApi;