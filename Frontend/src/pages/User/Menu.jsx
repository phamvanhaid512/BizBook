import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Sparkles, ShoppingBag, Plus, Minus, ChevronDown, ChevronUp,
  X, Check, Flame, MessageSquare, Bell, Wallet, Send, CheckCircle2,
  ExternalLink, ArrowLeft, Banknote, CreditCard
} from "lucide-react";
import menuApi from "../../api/menuApi";
import tableApi from "../../api/tableChat.js"; // <-- IMPORT API CHAT BÀN MỚI TẠO
import WelcomePortal from "./WelcomePortal";
import "./Menu.css";

export default function Menu() {
  const { tableId } = useParams();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [openCategoryId, setOpenCategoryId] = useState(null);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: "", phone: "", note: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartBouncing, setIsCartBouncing] = useState(false);

  // STATE QUẢN LÝ CHAT VÀ PAYMENT
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, method: "CASH" });

  const socketRef = useRef(null);

  // ========================================================
  // 1. TẢI MENU (GIỮ NGUYÊN)
  // ========================================================
  useEffect(() => { loadMenu(); }, []);

  const loadMenu = async () => {
    try {
      const [categoryRes, productRes] = await Promise.all([
        menuApi.getCategories(),
        menuApi.getProducts({ page: 1, page_size: 1000 }),
      ]);
      const categoryList = categoryRes.data?.data || [];
      const productData = productRes.data?.data;
      const productList = Array.isArray(productData) ? productData : productData?.items || [];
      setAllProducts(productList);

      const finalCategories = categoryList.map((category) => ({
        id: category.id,
        name: category.category_name,
        description: category.description,
        products: productList.filter((p) => Number(p.category) === Number(category.id)),
      }));

      setCategories(finalCategories);
      if (finalCategories.length > 0) setOpenCategoryId(finalCategories[0].id);
    } catch (error) {
      console.error("Lỗi tải menu:", error);
    }
  };

  // ========================================================
  // 2. TẢI LỊCH SỬ CHAT VÀ KẾT NỐI WEBSOCKET
  // ========================================================
  useEffect(() => {
    if (!tableId) return;

    // A. Lấy lịch sử tin nhắn cũ từ API
    const fetchChatHistory = async () => {
      try {
        const res = await tableApi.getTableChatHistory(tableId);
        if (res.data?.success && res.data.data) {
          setMessages(res.data.data);
        }
      } catch (error) {
        console.error("Lỗi tải lịch sử chat:", error);
      }
    };
    fetchChatHistory();

    // B. Mở kết nối WebSocket
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    const wsUrl = `${backendUrl.replace(/^http/, "ws")}/ws/chat/table/${tableId}/`;
    console.log("wsUrl", wsUrl)
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev;
        return [...prev, { id: data.id, sender: data.sender, text: data.text, time: data.time }];
      });
      setIsChatOpen(true);
      setUnreadCount((prev) => prev + 1);
    };

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [tableId]);

  // ========================================================
  // 3. CÁC HÀM XỬ LÝ SỰ KIỆN CHAT VÀ YÊU CẦU
  // ========================================================
  const handleQuickService = async (actionType, paymentMethod = null) => {
    // Nếu bấm gọi thanh toán mà chưa chọn phương thức -> Bật Modal
    if (actionType === "CALL_PAYMENT" && !paymentMethod) {
      setPaymentModal({ isOpen: true, method: "CASH" });
      return;
    }
    setPaymentModal({ ...paymentModal, isOpen: false });

    try {
      // Gọi API gửi yêu cầu (sẽ lưu DB và broadcast qua WebSocket từ server)
      await tableApi.sendTableRequest({
        table_id: tableId,
        request_type: actionType,
        payment_method: paymentMethod,
        customer_name: customer.name.trim() || "Khách tại bàn"
      });
    } catch (error) {
      alert("Lỗi kết nối, không thể gửi yêu cầu hỗ trợ.");
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;

    socketRef.current.send(JSON.stringify({
      message: chatInput.trim(),
      sender_type: "CUSTOMER",
      customer_name: customer.name.trim() || "Khách tại bàn" // <-- Thêm chữ và ngoặc kép ở đây
    }));
    setChatInput("");
  };

  // ========================================================
  // 4. GIỎ HÀNG VÀ ĐẶT MÓN (GIỮ NGUYÊN)
  // ========================================================
  const getProductName = (p) => p.product_name || p.name || "Sản phẩm";

  const triggerCartAnimation = () => {
    setIsCartBouncing(true);
    setTimeout(() => setIsCartBouncing(false), 300);
  };

  const addToCart = (product) => {
    triggerCartAnimation();
    setCart((prev) => {
      const existed = prev.find((item) => item.id === product.id);
      if (existed) return prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const changeQuantity = (id, value) => {
    triggerCartAnimation();
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: item.quantity + value } : item)).filter((item) => item.quantity > 0));
  };

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0);

  const suggestedCombos = useMemo(() => {
    if (!allProducts.length) return [];
    const cartIds = new Set(cart.map((item) => item.id));
    return allProducts.filter((prod) => !cartIds.has(prod.id) && prod.status !== "INACTIVE").slice(0, 4);
  }, [allProducts, cart]);

  const submitOrder = async () => {
    if (cart.length === 0) return alert("Vui lòng chọn ít nhất một sản phẩm");

    const payload = {
      table_id: tableId ? Number(tableId) : null,
      customer_name: customer.name.trim() || "Khách tại bàn",
      customer_phone: customer.phone.trim() || null,
      note: customer.note || "",
      items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
    };

    try {
      setIsSubmitting(true);
      const res = await menuApi.createOrder(payload);
      const orderData = res.data?.data;
      const orderCode = orderData?.order_code || orderData?.id;

      // Đẩy thẻ hóa đơn vào khung chat bằng tay (hoặc lưu qua API)
      const orderReceiptMsg = {
        id: Date.now(),
        sender: "order_ticket",
        orderId: orderData?.id || orderCode,
        orderCode: orderCode,
        items: [...cart],
        total: totalAmount,
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, orderReceiptMsg]);
      setUnreadCount((prev) => prev + 1);
      setCart([]);
      setIsCartOpen(false);
      setIsChatOpen(true);

      navigate(`/order-success/${orderData?.id}`);
    } catch (error) {
      alert("Đặt hàng thất bại, vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================================
  // RENDER UI
  // ========================================================
  const renderPaymentModal = () => {
    // Chỉ hiển thị Modal khi isOpen = true
    if (!paymentModal.isOpen) return null;

    return (
      <div className="payment-modal-overlay">
        <div className="payment-modal-box">
          {/* Nút X đóng popup góc phải */}
          <button
            className="btn-close-modal"
            onClick={() => setPaymentModal({ ...paymentModal, isOpen: false })}
          >
            <X size={20} />
          </button>

          <h3 className="payment-modal-title">Gọi thanh toán</h3>
          <p className="payment-modal-subtitle">Chọn phương thức thanh toán</p>

          <div className="payment-methods-grid">
            {/* Lựa chọn 1: Tiền mặt */}
            <button 
              className={`payment-method-btn ${paymentModal.method === "CASH" ? "active" : ""}`}
              onClick={() => setPaymentModal({ ...paymentModal, method: "CASH" })}
            >
              <Banknote size={20} className="text-green" /> Tiền mặt
            </button>
            
            {/* Lựa chọn 2: Chuyển khoản */}
            <button 
              className={`payment-method-btn ${paymentModal.method === "TRANSFER" ? "active" : ""}`}
              onClick={() => setPaymentModal({ ...paymentModal, method: "TRANSFER" })}
            >
              <CreditCard size={20} className="text-blue" /> Chuyển khoản
            </button>
          </div>

          {/* Gắn sự kiện gọi hàm handleQuickService truyền đúng method đang chọn */}
          <button 
            className="btn-submit-payment"
            onClick={() => handleQuickService("CALL_PAYMENT", paymentModal.method)}
          >
            Gửi yêu cầu
          </button>
        </div>
      </div>
    );
  };

  const renderChatDrawer = () => {
    return (
      <div className="chat-drawer-overlay">
        <div className="chat-drawer-container">
          <div className="chat-header">
            <div>
              <h4>Tin nhắn hỗ trợ bàn {tableId || ""}</h4>
              <p>{customer.name || "Khách tại bàn"}</p>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="close-chat-btn"><X size={20} /></button>
          </div>
          <div className="chat-messages-body">
            {messages.map((m) => {
              if (m.sender === "order_ticket") {
                return (
                  <div key={m.id} className="chat-order-card">
                    <div className="ticket-badge">
                      <CheckCircle2 size={18} color="#16a34a" />
                      <strong>ĐÃ GỬI ĐƠN HÀNG THÀNH CÔNG</strong>
                    </div>
                    <p className="ticket-code">Mã đơn: #{m.orderCode}</p>
                    <div className="ticket-items">
                      {m.items.map((it) => (
                        <div key={it.id} className="ticket-item-row">
                          <span>{getProductName(it)} × {it.quantity}</span>
                          <span>{(Number(it.price || 0) * it.quantity).toLocaleString("vi-VN")}đ</span>
                        </div>
                      ))}
                    </div>
                    <div className="ticket-total">
                      <span>Tổng tiền:</span>
                      <strong>{m.total.toLocaleString("vi-VN")}đ</strong>
                    </div>
                    <button className="btn-track-order" onClick={() => navigate(`/order-success/${m.orderId}`)}>
                      Theo dõi tiến độ <ExternalLink size={14} />
                    </button>
                  </div>
                );
              }
              // m.sender === "system" là thông báo gọi phục vụ, căn giữa
              return (
                <div key={m.id} className={`chat-msg-row ${m.sender === "user" ? "user-row" : m.sender === "system" ? "sys-row center" : "staff-row"}`}>
                  <div className="chat-bubble">
                    <p>{m.text}</p>
                    <span className="msg-time">{m.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <form onSubmit={handleSendChat} className="chat-input-bar">
            <input type="text" placeholder="Nhắn yêu cầu phục vụ..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
            <button type="submit"><Send size={16} /></button>
          </form>
        </div>
      </div>
    );
  };

  // MÀN HÌNH WELCOME
  if (!isMenuOpen) {
    return (
      <>
        <WelcomePortal
          customer={customer}
          setCustomer={setCustomer}
          tableId={tableId}
          onEnterMenu={() => setIsMenuOpen(true)}
          onCallService={(type) => {
            if (type === "Gọi nhân viên") handleQuickService("CALL_STAFF");
            if (type === "Gọi thanh toán") handleQuickService("CALL_PAYMENT");
          }}
        />
        <button className="floating-chat-bubble" onClick={() => { setIsChatOpen(!isChatOpen); setUnreadCount(0); }}>
          <MessageSquare size={24} />
          {unreadCount > 0 && <span className="chat-badge">{unreadCount}</span>}
        </button>
        {isChatOpen && renderChatDrawer()}
        {renderPaymentModal()}
      </>
    );
  }

  // MÀN HÌNH CHÍNH (THỰC ĐƠN)
  return (
    <div className="qr-menu-page">
      <header className="menu-top-header">
        <button className="btn-back-hub" onClick={() => setIsMenuOpen(false)}>
          <ArrowLeft size={24} />
        </button>
        <h1>Thực đơn</h1>
      </header>

      {/* CROSS SELLING */}
      {suggestedCombos.length > 0 && (
        <section className="cross-sell-banner">
          <div className="cross-sell-title">
            <div className="icon-wrap"><Sparkles size={16} /></div>
            <div>
              <h3>Gợi ý món ngon mua kèm</h3>
            </div>
          </div>
          <div className="cross-sell-scroll">
            {suggestedCombos.map((item) => (
              <div className="cross-sell-card" key={item.id}>
                <span className="popular-badge"><Flame size={11} /> Bán chạy</span>
                <div className="combo-avatar">{getProductName(item).charAt(0)}</div>
                <div className="combo-info">
                  <h4>{getProductName(item)}</h4>
                  <span className="combo-price">{Number(item.price || 0).toLocaleString("vi-VN")}đ</span>
                </div>
                <button className="btn-add-combo" onClick={() => addToCart(item)}><Plus size={15} /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* DANH SÁCH MÓN VÀ GIỎ HÀNG */}
      <main className="menu-layout">
        <section className="product-section">
          <div className="category-list">
            {categories.map((category) => {
              const isOpen = openCategoryId === category.id;
              return (
                <div className="category-accordion" key={category.id}>
                  <button className={`category-button ${isOpen ? "active" : ""}`} onClick={() => setOpenCategoryId(isOpen ? null : category.id)}>
                    <h3>{category.name} ({category.products.length})</h3>
                  </button>
                  {isOpen && (
                    <div className="product-dropdown">
                      {category.products.map((product) => {
                        const inCartItem = cart.find((c) => c.id === product.id);
                        return (
                          <div className="product-row" key={product.id}>
                            <div className="product-avatar">{getProductName(product).charAt(0)}</div>
                            <div className="product-info">
                              <h4>{getProductName(product).toUpperCase()}</h4>
                              <b className="product-price">{Number(product.price || 0).toLocaleString("vi-VN")}đ</b>
                            </div>
                            <div className="product-action">
                              {inCartItem ? (
                                <div className="item-quantity-pill">
                                  <button onClick={() => changeQuantity(product.id, -1)}><Minus size={14} /></button>
                                  <span>{inCartItem.quantity}</span>
                                  <button onClick={() => changeQuantity(product.id, 1)}><Plus size={14} /></button>
                                </div>
                              ) : (
                                <button className="add-btn-circle" onClick={() => addToCart(product)}><Plus size={18} /></button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <aside className={`cart-drawer-mobile ${isCartOpen ? "open" : ""}`}>
          <div className="cart-header">
            <div className="cart-header-title">
              <ShoppingBag size={20} color="#0284c7" />
              <h2>Đã chọn ({totalQuantity})</h2>
            </div>
            <button className="btn-clear-cart" onClick={() => setCart([])}>Xóa giỏ hàng</button>
          </div>
          <div className="cart-body-scroll">
            {cart.length === 0 ? (
              <p className="empty-cart-text">Chưa có món nào</p>
            ) : (
              cart.map((item) => (
                <div className="cart-item-modern" key={item.id}>
                  <div className="cart-item-info">
                    <h4>{getProductName(item).toUpperCase()}</h4>
                    <p className="cart-edit-btn">Chỉnh sửa</p>
                  </div>
                  <div className="cart-item-action">
                    <div className="quantity-box">
                      <button onClick={() => changeQuantity(item.id, -1)}><Minus size={14} /></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => changeQuantity(item.id, 1)}><Plus size={14} /></button>
                    </div>
                    <b>{(item.price * item.quantity).toLocaleString("vi-VN")}đ</b>
                  </div>
                </div>
              ))
            )}
            {cart.length > 0 && (
              <div className="cart-note-box">
                <input type="text" placeholder="Nhập ghi chú cho đơn" value={customer.note || ""} onChange={(e) => setCustomer({ ...customer, note: e.target.value })} />
              </div>
            )}
          </div>
          <div className="cart-footer">
            <div className="cart-total">
              <span>Tiền hàng</span>
              <b>{totalAmount.toLocaleString("vi-VN")}đ</b>
            </div>
            <button className="order-btn-green" onClick={submitOrder} disabled={isSubmitting || cart.length === 0}>
              <ShoppingBag size={18} /> Gọi món
            </button>
          </div>
        </aside>
      </main>

      {/* FOOTER MOBILE COMPONENT */}
      {isCartOpen && <div className="cart-overlay open" onClick={() => setIsCartOpen(false)} />}

      {totalQuantity > 0 && (
        <div className={`bottom-bar-modern ${isCartBouncing ? "bounce" : ""}`} onClick={() => setIsCartOpen(true)}>
          <div className="bottom-cart-icon">
            <ShoppingBag size={24} />
            <span className="badge">{totalQuantity}</span>
          </div>
          <div className="bottom-cart-price">
            <b>{totalAmount.toLocaleString("vi-VN")}đ</b>
          </div>
          <button className="btn-go-cart">Gọi món</button>
        </div>
      )}

      {/* NÚT CHAT BONG BÓNG */}
      <button className="floating-chat-bubble" onClick={() => { setIsChatOpen(!isChatOpen); setUnreadCount(0); }}>
        <MessageSquare size={24} />
        {unreadCount > 0 && <span className="chat-badge">{unreadCount}</span>}
      </button>

      {isChatOpen && renderChatDrawer()}
      {renderPaymentModal()}
    </div>
  );
}