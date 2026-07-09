import axiosClient from "./axiosClient";

const customerApi = {
  getAll: () => axiosClient.get("/customers/"),
  create: (data) => axiosClient.post("/customers/create/", data),
  update: (id, data) => axiosClient.put(`/customers/${id}/update/`, data),
  delete: (id) => axiosClient.delete(`/customers/${id}/delete/`),
};

export default customerApi;  
