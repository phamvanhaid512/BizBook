import axiosClient from "./axiosClient";
const tableApi = {
  // ... các hàm cũ giữ nguyên

  // Lấy lịch sử chat của bàn
  getTableChatHistory: (tableId) => {
    return axiosClient.get(`/table-chat/${tableId}/history/`);
  },
  
  // Gửi lệnh gọi phục vụ / thanh toán
  sendTableRequest: (data) => {
    return axiosClient.post(`/table-chat/request/`, data);
  }
};
export default tableApi;