import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bell } from "lucide-react";
import tableApi from "../../src/api/tableChat.js"; // <-- IMPORT API CHAT BÀN MỚI TẠO
import "./AdminTableChat.css";

export default function AdminTableChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTables, setActiveTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");

  const socketRef = useRef(null);
  const selectedTableRef = useRef(null);

  // Sync ref để onmessage bắt được bàn đang chọn
  useEffect(() => {
    selectedTableRef.current = selectedTable;
  }, [selectedTable]);

  // ========================================================
  // 1. WEBSOCKET NHẬN TIN NHẮN TỪ TẤT CẢ CÁC BÀN
  // ========================================================
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    const wsUrl = `${backendUrl.replace(/^http/, "ws")}/ws/chat/staff/`;
    
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const currentTable = selectedTableRef.current;

      // A. Cập nhật Sidebar Bàn
      setActiveTables((prev) => {
        const isViewing = currentTable?.id === data.table_id;
        const exists = prev.find((t) => t.id === data.table_id);

        if (exists) {
          return prev.map((t) =>
            t.id === data.table_id
              ? { ...t, lastMessage: data.text, time: data.time, unread: isViewing ? 0 : t.unread + 1 }
              : t
          );
        }
        return [{
          id: data.table_id,
          name: `Bàn ${data.table_id}`,
          lastMessage: data.text,
          time: data.time,
          unread: isViewing ? 0 : 1,
        }, ...prev];
      });

      // B. In tin nhắn ra nếu đang mở đúng bàn đó
      if (currentTable?.id === data.table_id) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    };

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  // ========================================================
  // 2. CHỌN BÀN VÀ TẢI LỊCH SỬ CHAT TỪ API
  // ========================================================
  const handleSelectTable = async (table) => {
    setSelectedTable(table);
    
    // Đánh dấu đã đọc
    setActiveTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, unread: 0 } : t)));

    // Gọi API RESTful
    try {
      const res = await tableApi.getTableChatHistory(table.id);
      if (res.data?.success) {
        setMessages(res.data.data);
      }
    } catch (error) {
      console.error("Lỗi lấy lịch sử chat:", error);
    }
  };

  // ========================================================
  // 3. ADMIN GỬI TIN TRẢ LỜI KHÁCH HÀNG (Qua WebSocket)
  // ========================================================
  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTable || !socketRef.current) return;

    socketRef.current.send(JSON.stringify({
      table_id: selectedTable.id,
      message: replyText.trim(),
      sender_type: "STAFF",
    }));
    
    setReplyText("");
  };

  return (
    <div className="admin-chat-widget">
      <button className="admin-chat-toggle" onClick={() => setIsOpen(!isOpen)}>
        <MessageSquare size={24} />
        {activeTables.reduce((sum, t) => sum + t.unread, 0) > 0 && (
          <span className="admin-badge">
            {activeTables.reduce((sum, t) => sum + t.unread, 0)}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="admin-chat-panel">
          <div className="admin-chat-header">
            <h3>Hỗ trợ Khách hàng tại bàn</h3>
            <button onClick={() => setIsOpen(false)}><X size={20} /></button>
          </div>

          <div className="admin-chat-layout">
            <div className="admin-tables-sidebar">
              {activeTables.length === 0 && <div style={{ padding: 16, color: '#94a3b8' }}>Chưa có tin nhắn</div>}
              {activeTables.map((table) => (
                <div key={table.id} className={`table-chat-item ${selectedTable?.id === table.id ? "active" : ""}`} onClick={() => handleSelectTable(table)}>
                  <div className="table-name-row">
                    <strong>{table.name}</strong>
                    <span className="table-time">{table.time}</span>
                  </div>
                  <p className="table-last-msg">{table.lastMessage}</p>
                  {table.unread > 0 && <span className="unread-dot">{table.unread}</span>}
                </div>
              ))}
            </div>

            <div className="admin-chat-box">
              {selectedTable ? (
                <>
                  <div className="box-header">
                    <h4>Đang hỗ trợ: {selectedTable.name}</h4>
                  </div>
                  <div className="box-messages">
                    {messages.map((m) => (
                      <div key={m.id} className={`msg-row ${m.sender}`}>
                        <div className="msg-bubble">
                          <p>{m.text || m.message}</p>
                          <span>{m.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendReply} className="box-input">
                    <input type="text" placeholder={`Nhắn với ${selectedTable.name}...`} value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                    <button type="submit"><Send size={16} /></button>
                  </form>
                </>
              ) : (
                <div className="box-empty">
                  <Bell size={40} color="#cbd5e1" />
                  <p>Chọn một bàn để bắt đầu hỗ trợ</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}