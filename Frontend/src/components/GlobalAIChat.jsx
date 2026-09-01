import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Image as ImageIcon,
  LoaderCircle,
  MessageCircleMore,
  Paperclip,
  Plus,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import aiAgentApi from "../api/aiAgent";
import "./GlobalAIChat.css";

const defaultPrompts = [
  "Cho tôi xem tổng doanh thu và số đơn hàng trong tháng 7",
  "Tháng này chi tiêu hết bao nhiêu tiền?",
  "Top 5 sản phẩm bán chạy nhất hiện tại?",
  "Tháng này quán lời hay lỗ bao nhiêu?",
];

const welcomeMessage = {
  id: "welcome-message",
  role: "assistant",
  content:
    "Chào bạn! Tôi là Trợ lý AI Cố vấn Kinh doanh BizBook. Bạn có thể hỏi về Doanh thu, Chi phí, Lợi nhuận, Phân tích món bán chạy hoặc đính kèm ảnh hóa đơn để kiểm định OCR.",
};

export default function GlobalAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([welcomeMessage]);
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState(null);
  const [currentSuggestions, setCurrentSuggestions] = useState(defaultPrompts);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Tự động cuộn xuống cuối khi có tin nhắn mới hoặc đang gõ chữ
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, isTyping]);

  // Dọn dẹp bộ đếm thời gian khi unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, []);

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.warning("Chỉ hỗ trợ ảnh JPG, JPEG hoặc PNG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.warning("Ảnh hóa đơn không được lớn hơn 5MB.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startNewConversation = () => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
    }
    setIsTyping(false);
    setTypingMessageId(null);
    setSessionId(null);
    setMessage("");
    removeFile();
    setCurrentSuggestions(defaultPrompts);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: "Bạn đang bắt đầu cuộc trò chuyện mới. Tôi có thể hỗ trợ gì cho bạn hôm nay?",
      },
    ]);
  };

  // Hàm tạo hiệu ứng gõ từng ký tự chân thực (Typing Effect)
 // Hàm tạo hiệu ứng gõ từng ký tự chậm và chân thực
  const streamTypingEffect = (fullText, messageId, metadata = {}) => {
    setIsTyping(true);
    setTypingMessageId(messageId);

    // 1. Tạo tin nhắn rỗng của Assistant trước
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        role: "assistant",
        content: "",
        metadata: metadata,
      },
    ]);

    let currentIndex = 0;
    const textLength = fullText.length;

    // Tốc độ: 35ms cho mỗi 1 ký tự (chậm và mượt mà hơn)
    typingTimerRef.current = setInterval(() => {
      if (currentIndex < textLength) {
        currentIndex += 1; // Chỉ nhảy đúng 1 ký tự
        const currentSlice = fullText.slice(0, currentIndex);

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, content: currentSlice } : msg
          )
        );
      } else {
        clearInterval(typingTimerRef.current);
        setIsTyping(false);
        setTypingMessageId(null);
      }
    }, 35); // <-- Chỉnh từ 16ms lên 35ms để gõ chậm hơn
  };
  const sendMessage = async (customPrompt = null) => {
    const content = (typeof customPrompt === "string" ? customPrompt : message).trim();
    console.log("content",content)
    if ((!content && !selectedFile) || isSending || isTyping) {
      return;
    }

    const uploadedFile = selectedFile;
    const uploadedPreviewUrl = previewUrl;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content || "Hãy kiểm tra và bóc tách ảnh hóa đơn tôi vừa đính kèm.",
      fileName: uploadedFile?.name || null,
      previewUrl: uploadedPreviewUrl || null,
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setSelectedFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setIsSending(true);

    try {
      // 1. LUỒNG TẢI VÀ PHÂN TÍCH OCR HÓA ĐƠN
      if (uploadedFile) {
        const formData = new FormData();
        formData.append("file", uploadedFile);

        const res = await aiAgentApi.uploadOcrDocument(formData);
        const apiData = res.data?.data || {};

        const isAnomaly = apiData.anomaly_detected;
        const confidence = apiData.confidence_score || 0;
        const anomalyReasons = apiData.anomaly_reasons?.join(", ");

        let replyText = `📄 **Kết quả phân tích ảnh "${apiData.image_name || "hóa đơn"}":**\n`;
        replyText += `- **Độ tin cậy OCR:** ${confidence}%\n`;
        replyText += `- **Nội dung trích xuất:**\n> ${apiData.extracted_text || "(Không nhận diện được chữ rõ ràng)"}\n\n`;

        if (isAnomaly || apiData.needs_human_review) {
          replyText += `⚠️ **Cảnh báo chất lượng:** ${anomalyReasons || "Điểm tin cậy dưới 85%, cần kiểm tra lại trước khi lưu vào sổ cái."}`;
        } else {
          replyText += `✅ **Đánh giá:** Ảnh rõ nét, thông tin hợp lệ để ghi nhận chi phí.`;
        }

        // Tạo độ trễ tự nhiên (600ms)
        await new Promise((resolve) => setTimeout(resolve, 600));
        setIsSending(false);

        toast.success("Phân tích ảnh hóa đơn thành công!");
        streamTypingEffect(replyText, `assistant-ocr-${Date.now()}`, { isOcr: true, ocrData: apiData });
        return;
      }

      // 2. LUỒNG GỬI CHAT HỘI THOẠI VỚI SUB-AGENTS
      const payload = {
        session_id: sessionId,
        message: content,
      };

      const res = await aiAgentApi.chat(payload);
      const apiData = res.data?.data || {};

      if (apiData.session?.id) {
        setSessionId(apiData.session.id);
      }

      const assistantMsg = apiData.assistant_message || {};
      const fullReply = assistantMsg.content || "Tôi đã nhận được thông tin.";
      const newSuggestions = assistantMsg.metadata?.suggested_questions || defaultPrompts;
      
      setCurrentSuggestions(newSuggestions);

      // Thêm độ trễ suy nghĩ (650ms) tạo cảm giác AI đang phân tích dữ liệu
      await new Promise((resolve) => setTimeout(resolve, 900));
      setIsSending(false);

      // Chạy hiệu ứng gõ chữ cho câu trả lời
      streamTypingEffect(fullReply, `assistant-${assistantMsg.id || Date.now()}`, assistantMsg.metadata);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Không thể kết nối đến máy chủ AI Agent.";
      toast.error(errorMessage);
      setIsSending(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: `Xin lỗi, đã xảy ra lỗi: ${errorMessage}`,
        },
      ]);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="global-ai-chat">
      {isOpen && (
        <section className="global-ai-chat__panel">
          {/* Header */}
          <header className="global-ai-chat__header">
            <div className="global-ai-chat__profile">
              <span className="global-ai-chat__bot-icon">
                <Bot size={21} />
              </span>
              <div>
                <h3>BizBook AI Assistant</h3>
                <p>
                  <span className="global-ai-chat__status-dot" /> Trợ lý cố vấn sẵn sàng
                </p>
              </div>
            </div>

            <div className="global-ai-chat__header-actions">
              <button
                type="button"
                className="global-ai-chat__new-chat"
                onClick={startNewConversation}
                title="Cuộc trò chuyện mới"
              >
                <Plus size={19} />
              </button>

              <button
                type="button"
                className="global-ai-chat__close"
                onClick={() => setIsOpen(false)}
                title="Đóng"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          {/* Messages Body */}
          <div className="global-ai-chat__messages">
            {messages.map((item) => {
              const isCurrentlyTypingThis = isTyping && typingMessageId === item.id;

              return (
                <div
                  key={item.id}
                  className={`global-message ${
                    item.role === "user" ? "global-message--user" : "global-message--assistant"
                  }`}
                >
                  {item.role === "assistant" && (
                    <span className="global-message__avatar">
                      <Bot size={16} />
                    </span>
                  )}

                  <div
                    className={`global-message__bubble ${
                      item.role === "user" ? "global-message__bubble--user" : ""
                    }`}
                  >
                    {item.previewUrl && (
                      <img
                        src={item.previewUrl}
                        alt="Hóa đơn đính kèm"
                        className="global-message__image"
                      />
                    )}

                    {item.fileName && (
                      <span className="global-message__file">
                        <ImageIcon size={14} />
                        {item.fileName}
                      </span>
                    )}

                    <div className="global-message__text" style={{ whiteSpace: "pre-line" }}>
                      {item.content}
                      {/* Con trỏ nhấp nháy mô phỏng gõ chữ */}
                      {isCurrentlyTypingThis && (
                        <span className="global-ai-chat__cursor">|</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Trạng thái AI đang tính toán / phân tích dữ liệu */}
            {isSending && (
              <div className="global-message global-message--assistant">
                <span className="global-message__avatar">
                  <Bot size={16} />
                </span>
                <div className="global-message__bubble">
                  <p className="global-ai-chat__typing">
                    <LoaderCircle size={15} className="global-ai-chat__spin" />
                    AI đang tính toán dữ liệu...
                  </p>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Gợi ý câu hỏi thông minh */}
          {currentSuggestions?.length > 0 && (
            <div className="global-ai-chat__suggestions">
              {currentSuggestions.map((prompt, idx) => (
                <button
                  type="button"
                  key={idx}
                  disabled={isSending || isTyping}
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Preview ảnh đính kèm */}
          {selectedFile && (
            <div className="global-ai-chat__file-preview">
              <img src={previewUrl} alt="Preview" />
              <span>{selectedFile.name}</span>
              <button type="button" onClick={removeFile} title="Xóa ảnh">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Footer Input */}
          <footer className="global-ai-chat__input">
            <input
              ref={fileInputRef}
              hidden
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
            />

            <button
              type="button"
              className="global-ai-chat__attach"
              onClick={handleChooseFile}
              disabled={isSending || isTyping}
              title="Đính kèm hóa đơn"
            >
              <Paperclip size={19} />
            </button>

            <textarea
              rows={1}
              value={message}
              disabled={isSending || isTyping}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isTyping ? "AI đang trả lời..." : "Hỏi về doanh thu, chi phí, món bán chạy..."}
            />

            <button
              type="button"
              className="global-ai-chat__send"
              onClick={() => sendMessage()}
              disabled={isSending || isTyping || (!message.trim() && !selectedFile)}
              title="Gửi"
            >
              {isSending ? (
                <LoaderCircle size={18} className="global-ai-chat__spin" />
              ) : (
                <SendHorizontal size={18} />
              )}
            </button>
          </footer>
        </section>
      )}

      {/* Nút Toggle mở Chatbot */}
      <button
        type="button"
        className="global-ai-chat__toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Mở trợ lý AI"
      >
        {isOpen ? <X size={25} /> : <MessageCircleMore size={25} />}
        {!isOpen && (
          <span className="global-ai-chat__badge">
            <Sparkles size={12} />
          </span>
        )}
      </button>
    </div>
  );
}