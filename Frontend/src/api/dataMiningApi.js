import axiosClient from "./axiosClient";

const dataMiningApi = {
  getDashboard: (params = {}) => {
    return axiosClient.get("/data-mining/dashboard/", {
      params,
    });
  },
  getHighlights:() => axiosClient.get("/data-mining/apriori/get_highlights/"),
  
  runApriori: (data) => {
    return axiosClient.post("/data-mining/apriori/run/", data);
  },

  runForecasting: (data) => {
    return axiosClient.post("/data-mining/forecasting/run/", data);
  },

  getMiningRuns: (params = {}) => {
    return axiosClient.get("/data-mining/runs/", {
      params,
    });
  },
};

export default dataMiningApi;