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
  Mic,
  Square,
  Volume2,
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
    "Chào bạn! Tôi là Trợ lý AI Cố vấn Kinh doanh BizBook. Bạn có thể hỏi bằng văn bản hoặc bấm Micro để nói về Doanh thu, Chi phí, Tồn kho hoặc gửi hóa đơn kiểm định OCR.",
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

  // Trạng thái đàm thoại giọng nói
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Tự động cuộn xuống đáy khi có nội dung mới
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, isTyping]);

  // Hủy tiến trình timer và âm thanh khi rời khỏi component
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      if (recognitionRef.current) recognitionRef.current.abort();
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

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startNewConversation = () => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    if (audioPlayerRef.current) audioPlayerRef.current.pause();
    if (recognitionRef.current) recognitionRef.current.abort();

    setIsPlayingAudio(false);
    setIsRecording(false);
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

  // Hiệu ứng gõ từng ký tự chân thực
  const streamTypingEffect = (fullText, messageId, metadata = {}) => {
    setIsTyping(true);
    setTypingMessageId(messageId);

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

    typingTimerRef.current = setInterval(() => {
      if (currentIndex < textLength) {
        currentIndex += 1;
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
    }, 30);
  };

  // Phát âm thanh phản hồi từ AI
  const playAgentAudio = (audioUrl) => {
    if (!audioUrl) return;
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      setIsPlayingAudio(true);

      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);

      audio.play().catch((err) => {
        console.warn("Trình duyệt chặn autoplay âm thanh:", err);
        setIsPlayingAudio(false);
      });
    } catch (e) {
      console.error("Lỗi phát audio:", e);
      setIsPlayingAudio(false);
    }
  };

  // 1. BẮT ĐẦU NHẬN DIỆN GIỌNG NÓI TỐC ĐỘ CAO (WEB SPEECH API)
  const startRecording = () => {
    if (isSending || isTyping) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Trình duyệt không hỗ trợ Web Speech API. Vui lòng dùng Chrome hoặc Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript && transcript.trim()) {
        sendVoiceText(transcript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      setIsRecording(false);
      if (event.error === "not-allowed") {
        toast.error("Vui lòng cấp quyền Microphone trên trình duyệt.");
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.error("Không thể khởi động micro:", err);
    }
  };

  // 2. DỪNG MICRO
  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  // 3. GỬI TEXT ĐÃ NHẬN DIỆN VỀ SERVER VÀ PHÁT AUDIO
  const sendVoiceText = async (recognizedText) => {
    setIsSending(true);

    const userMessage = {
      id: `user-voice-${Date.now()}`,
      role: "user",
      content: `🎙 ${recognizedText}`,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const payload = {
        text: recognizedText,
        session_id: sessionId,
      };

      const res = await aiAgentApi.voiceChat(payload);
      const apiData = res.data?.data || {};

      if (apiData.session?.id) {
        setSessionId(apiData.session.id);
      }

      const assistantMsg = apiData.assistant_message || {};
      const fullReply = assistantMsg.content || "Tôi đã nhận được lệnh của bạn.";
      const audioUrl = apiData.audio_url;

      const newSuggestions = assistantMsg.metadata?.suggested_questions || defaultPrompts;
      setCurrentSuggestions(newSuggestions);
      setIsSending(false);

      if (audioUrl) {
        playAgentAudio(audioUrl);
      }

      streamTypingEffect(
        fullReply,
        `assistant-${assistantMsg.id || Date.now()}`,
        assistantMsg.metadata
      );
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Không thể kết nối với dịch vụ trợ lý ảo.";
      toast.error(errorMsg);
      setIsSending(false);
    }
  };

  // GỬI TIN NHẮN TEXT HOẶC ẢNH OCR
  const sendMessage = async (customPrompt = null) => {
    const content = (typeof customPrompt === "string" ? customPrompt : message).trim();
    if ((!content && !selectedFile) || isSending || isTyping || isRecording) {
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
    removeFile();
    setIsSending(true);

    try {
      // 1. Phân tích ảnh hóa đơn OCR
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

        await new Promise((resolve) => setTimeout(resolve, 500));
        setIsSending(false);
        toast.success("Phân tích ảnh hóa đơn thành công!");
        streamTypingEffect(replyText, `assistant-ocr-${Date.now()}`, {
          isOcr: true,
          ocrData: apiData,
        });
        return;
      }

      // 2. Chat hội thoại thông thường
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
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsSending(false);
      streamTypingEffect(
        fullReply,
        `assistant-${assistantMsg.id || Date.now()}`,
        assistantMsg.metadata
      );
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
                  <span className="global-ai-chat__status-dot" />{" "}
                  {isPlayingAudio
                    ? "Đang phát âm thanh..."
                    : isRecording
                    ? "Đang lắng nghe..."
                    : "Trợ lý cố vấn sẵn sàng"}
                </p>
              </div>
            </div>

            <div className="global-ai-chat__header-actions">
              {isPlayingAudio && (
                <button
                  type="button"
                  className="global-ai-chat__audio-indicator"
                  title="Tắt âm thanh"
                  onClick={() => {
                    audioPlayerRef.current?.pause();
                    setIsPlayingAudio(false);
                  }}
                >
                  <Volume2 size={18} className="animate-pulse" />
                </button>
              )}

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

          {/* Danh sách tin nhắn */}
          <div className="global-ai-chat__messages">
            {messages.map((item) => {
              const isCurrentlyTypingThis = isTyping && typingMessageId === item.id;

              return (
                <div
                  key={item.id}
                  className={`global-message ${
                    item.role === "user"
                      ? "global-message--user"
                      : "global-message--assistant"
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

                    <div
                      className="global-message__text"
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {item.content}
                      {isCurrentlyTypingThis && (
                        <span className="global-ai-chat__cursor">|</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="global-message global-message--assistant">
                <span className="global-message__avatar">
                  <Bot size={16} />
                </span>
                <div className="global-message__bubble">
                  <p className="global-ai-chat__typing">
                    <LoaderCircle size={15} className="global-ai-chat__spin" />
                    AI đang tính toán và xử lý phản hồi...
                  </p>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Gợi ý câu hỏi nhanh */}
          {currentSuggestions?.length > 0 && (
            <div className="global-ai-chat__suggestions">
              {currentSuggestions.map((prompt, idx) => (
                <button
                  type="button"
                  key={idx}
                  disabled={isSending || isTyping || isRecording}
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Ảnh xem trước đính kèm */}
          {selectedFile && (
            <div className="global-ai-chat__file-preview">
              <img src={previewUrl} alt="Preview" />
              <span>{selectedFile.name}</span>
              <button type="button" onClick={removeFile} title="Xóa ảnh">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Thanh công cụ nhập liệu */}
          <footer className="global-ai-chat__input">
            <input
              ref={fileInputRef}
              hidden
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
            />

            {/* Đính kèm ảnh */}
            <button
              type="button"
              className="global-ai-chat__attach"
              onClick={handleChooseFile}
              disabled={isSending || isTyping || isRecording}
              title="Đính kèm hóa đơn"
            >
              <Paperclip size={19} />
            </button>

            {/* Ô nhập tin nhắn */}
            <textarea
              rows={1}
              value={message}
              disabled={isSending || isTyping || isRecording}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isRecording
                  ? "Đang lắng nghe giọng nói của bạn..."
                  : isTyping
                  ? "AI đang trả lời..."
                  : "Nhập câu hỏi hoặc bấm Mic để nói..."
              }
            />

            {/* Nút Micro */}
            <button
              type="button"
              className={`global-ai-chat__mic ${
                isRecording ? "global-ai-chat__mic--recording" : ""
              }`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isSending || isTyping}
              title={isRecording ? "Dừng nói" : "Nói với trợ lý"}
            >
              {isRecording ? <Square size={16} /> : <Mic size={18} />}
            </button>

            {/* Nút Gửi */}
            <button
              type="button"
              className="global-ai-chat__send"
              onClick={() => sendMessage()}
              disabled={
                isSending || isTyping || isRecording || (!message.trim() && !selectedFile)
              }
              title="Gửi tin nhắn"
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

      {/* Nút mở hộp thoại Chat */}
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