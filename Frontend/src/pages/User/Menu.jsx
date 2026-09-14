import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import menuApi from "../../api/menuApi";
import "./Menu.css";

function Menu() {
  const { tableId } = useParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [openCategoryId, setOpenCategoryId] = useState(null);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State quản lý hiển thị Giỏ hàng & hiệu ứng nảy icon
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartBouncing, setIsCartBouncing] = useState(false);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const [categoryRes, productRes] = await Promise.all([
        menuApi.getCategories(),
        menuApi.getProducts({
          page: 1,
          page_size: 1000,
        }),
      ]);

      const categoryList = categoryRes.data.data || [];
      const productData = productRes.data.data;
      const productList = Array.isArray(productData)
        ? productData
        : productData?.items || [];

      const finalCategories = categoryList.map((category) => ({
        id: category.id,
        name: category.category_name,
        description: category.description,
        products: productList.filter(
          (product) => Number(product.category) === Number(category.id)
        ),
      }));

      setCategories(finalCategories);
    } catch (error) {
      console.error("Lỗi tải menu:", error);
    }
  };

  const toggleCategory = (categoryId) => {
    setOpenCategoryId(openCategoryId === categoryId ? null : categoryId);
  };

  const getProductName = (product) => {
    return product.product_name || product.name || "Sản phẩm";
  };

  const triggerCartAnimation = () => {
    setIsCartBouncing(true);
    setTimeout(() => setIsCartBouncing(false), 300);
  };

  const addToCart = (product) => {
    triggerCartAnimation();
    const existed = cart.find((item) => item.id === product.id);

    if (existed) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const changeQuantity = (id, value) => {
    triggerCartAnimation();
    setCart(
      cart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + value }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  const totalAmount = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const submitOrder = async () => {
    if (cart.length === 0) {
      alert("Vui lòng chọn ít nhất một sản phẩm");
      return;
    }

    const trimmedPhone = customer.phone.trim();
    if (trimmedPhone && !/^(0|\+84)[0-9]{9}$/.test(trimmedPhone)) {
      alert("Vui lòng nhập số điện thoại hợp lệ (10 chữ số)");
      return;
    }

    // Cấu trúc payload chuẩn theo CreateOrderSerializer của backend
    const payload = {
      table_id: tableId ? Number(tableId) : null,
      customer_name: customer.name.trim() || "Khách tại bàn",
      customer_phone: trimmedPhone || null,
      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
    };

    try {
      setIsSubmitting(true);
      const res = await menuApi.createOrder(payload);
      
      const orderData = res.data.data;
      const orderId = orderData?.id || orderData?.order_code;

      setCart([]);
      setCustomer({ name: "", phone: "" });
      setIsCartOpen(false);

      navigate(`/order-success/${orderId}`);
    } catch (error) {
      console.error("Lỗi đặt hàng:", error);
      const message = error.response?.data?.message || "Đặt hàng thất bại, vui lòng thử lại!";
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="qr-menu-page">
      <header className="qr-header">
        <div>
          <h1>BizBook Menu</h1>
          <p>Bàn số {tableId}</p>
        </div>
        <div className="qr-badge">QR Order</div>
      </header>

      <main className="menu-layout">
        <section className="product-section">
          <h2>Danh mục sản phẩm</h2>

          {categories.length === 0 && (
            <p className="empty-cart">Chưa có danh mục nào</p>
          )}

          <div className="category-list">
            {categories.map((category) => {
              const isOpen = openCategoryId === category.id;

              return (
                <div className="category-accordion" key={category.id}>
                  <button
                    className={`category-button ${isOpen ? "active" : ""}`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div>
                      <h3>{category.name}</h3>
                      <p>
                        {category.description || "Danh mục món ăn / đồ uống"}
                      </p>
                    </div>

                    <div className="category-right">
                      <small>{category.products.length} món</small>
                      <span>{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="product-dropdown">
                      {category.products.length === 0 && (
                        <p className="no-product">
                          Danh mục này chưa có sản phẩm
                        </p>
                      )}

                      {category.products.map((product) => (
                        <div className="product-row" key={product.id}>
                          <div className="product-avatar">
                            {getProductName(product).charAt(0)}
                          </div>

                          <div className="product-info">
                            <h4>{getProductName(product)}</h4>
                            <p>
                              {product.description || "Món ngon tại BizBook"}
                            </p>
                            <b>
                              {Number(product.price).toLocaleString("vi-VN")}đ
                            </b>
                          </div>

                          <button
                            className="add-btn"
                            onClick={() => addToCart(product)}
                          >
                            Thêm
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sidebar Giỏ hàng trên Desktop & Modal trượt trên Mobile */}
        <aside className={`cart-box desktop-cart ${isCartOpen ? "open" : ""}`}>
          <div className="cart-header">
            <h2>Giỏ hàng</h2>
            <button className="close-cart-btn" onClick={() => setIsCartOpen(false)}>
              ✕
            </button>
          </div>

          {cart.length === 0 ? (
            <p className="empty-cart">Chưa có món nào trong giỏ</p>
          ) : (
            <div className="cart-items-list">
              {cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div>
                    <h4>{getProductName(item)}</h4>
                    <p>{Number(item.price).toLocaleString("vi-VN")}đ</p>
                  </div>

                  <div className="quantity-box">
                    <button onClick={() => changeQuantity(item.id, -1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => changeQuantity(item.id, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Nhập Tên và SĐT trước khi nhấn gửi đơn */}
          <div className="cart-customer-inputs">
            <h4>Thông tin người nhận (Tích điểm)</h4>
            <input
              type="text"
              placeholder="Tên của bạn (VD: Anh Nam)"
              value={customer.name}
              onChange={(e) =>
                setCustomer({ ...customer, name: e.target.value })
              }
            />
            <input
              type="tel"
              placeholder="Số điện thoại (dùng để tích điểm)"
              value={customer.phone}
              onChange={(e) =>
                setCustomer({ ...customer, phone: e.target.value })
              }
            />
          </div>

          <div className="cart-footer">
            <div className="cart-total">
              <span>Tổng tiền</span>
              <b>{totalAmount.toLocaleString("vi-VN")}đ</b>
            </div>

            <button
              className="order-btn"
              onClick={submitOrder}
              disabled={isSubmitting || cart.length === 0}
            >
              {isSubmitting ? "Đang gửi đơn..." : "Gửi đơn hàng"}
            </button>
          </div>
        </aside>
      </main>

      {/* Nút giỏ hàng nổi góc dưới màn hình */}
      <div
        className={`floating-cart-btn ${isCartBouncing ? "bounce" : ""}`}
        onClick={() => setIsCartOpen(!isCartOpen)}
      >
        <div className="cart-icon-wrapper">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          {totalQuantity > 0 && (
            <span className="cart-badge">{totalQuantity}</span>
          )}
        </div>
        <span className="floating-cart-total">{totalAmount.toLocaleString("vi-VN")}đ</span>
      </div>

      {/* Lớp phủ mờ màn hình khi mở giỏ hàng di động */}
      {isCartOpen && (
        <div className="cart-overlay" onClick={() => setIsCartOpen(false)} />
      )}
    </div>
  );
}

export default Menu;