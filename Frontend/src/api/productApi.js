import axiosClient from "./axiosClient";

const productApi = {
  getAll: (params) => axiosClient.get("/products/", { params }),  getDetail: (id) => axiosClient.get(`/products/${id}/`),
  create: (data) => axiosClient.post("/products/create/", data),
  update: (id, data) => axiosClient.put(`/products/update/${id}/`, data),
  delete: (id) => axiosClient.delete(`/products/delete/${id}/`),
};

export default productApi;