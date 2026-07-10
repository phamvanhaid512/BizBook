import axiosClient from "./axiosClient";

const orderApi = {
  createOrder: (data) => {
    return axiosClient.post("/orders/create/", data);
  },
  getAll: (params) => {
    return axiosClient.get("/orders/", { params });
  },
  getOrderStatus: (orderId) => {
    return axiosClient.get(`/public/orders/${orderId}/status/`)
  },
  updatOrderStatus:(orderId,data) => {
    return axiosClient.patch(`/orders/${orderId}/update-status/`,data)
  },
  updatePaymentStatus:(orderId,data) => {
    return axiosClient.patch(`/orders/${orderId}/payment-status/`,data)
  }

};

export default orderApi;