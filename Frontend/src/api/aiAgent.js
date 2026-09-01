import axiosClient from "./axiosClient";

const aiAgentApi = {
  // 1. Gửi tin nhắn chat (Multi-Agent Pipeline)
  chat: (data) => {
    return axiosClient.post("/ai-agents/chat/", data);
  },

  // 2. Gửi ảnh tài liệu / hóa đơn phân tích OCR & kiểm định bất thường
  uploadOcrDocument: (formData) => {
    return axiosClient.post("/documents/analyze/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // 3. Lấy danh sách lịch sử tin nhắn của 1 phiên trò chuyện
  getConversationMessages: (conversationId) => {
    return axiosClient.get(`/ai-agents/conversations/${conversationId}/messages/`);
  },

  // 4. Lấy danh sách các phiên trò chuyện
  getConversations: () => {
    return axiosClient.get("/ai-agents/conversations/");
  },
};

export default aiAgentApi;