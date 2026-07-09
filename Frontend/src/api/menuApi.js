import axiosClient from "./axiosClient";

const menuApi = {
  getProducts: (params = {}) =>
    axiosClient.get("/products/", {
      params,
    }),

  getCategories: () => {
    return axiosClient.get("/categories/");
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