import axiosClient from "./axiosClient";

const menuApi = {
  getProducts: (params = {}) =>
    axiosClient.get("/products/", {
      params,
    }),

  getCategories: () => {
    return axiosClient.get("/categories/");
  },
  getTableDetail: (tableId) => {
    return axiosClient.get(`/tables/${tableId}/`); 
    // hoặc `/tables/${tableId}/` tùy theo backend urls.py đã cấu hình
  },
  createOrder: (data) => {
    return axiosClient.post("/orders/create/", data);
  },
  getAll: (params) => {
    return axiosClient.get("/orders/", { params });
  },
  getOrderStatus: (orderId) => {
    return axiosClient.get(`/orders/${orderId}/status/`)
  }

};

export default menuApi;