import axiosClient from "./axiosClient";

const dashboardApi = {
  getDashboardSummary: (params = {}) =>
    axiosClient.get("/dashboard/revenue_summary/", {
      params,
    }),
};

export default dashboardApi;