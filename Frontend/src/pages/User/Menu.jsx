import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import menuApi from "../../api/menuApi";
import { useNavigate } from "react-router-dom";
import "./Menu.css";

function Menu() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [openCategoryId, setOpenCategoryId] = useState(null);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
  });

  useEffect(() => {
    loadMenu();
  }, []);

const loadMenu = async () => {
  try {
    const [categoryRes, productRes] = await Promise.all([
      menuApi.getCategories(),
      menuApi.getProducts({
        page: 1,
        page_size: 1000, // lấy toàn bộ sản phẩm
      }),
    ]);

    const categoryList = categoryRes.data.data || [];

    // Hỗ trợ cả API cũ và API mới có phân trang
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
    console.error(error);
  }
};

  const toggleCategory = (categoryId) => {
    setOpenCategoryId(openCategoryId === categoryId ? null : categoryId);
  };

  const getProductName = (product) => {
    return product.product_name || product.name || "Sản phẩm";
  };

  const addToCart = (product) => {
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

  const totalAmount = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const submitOrder = async () => {
    if (cart.length === 0) {
      alert("Vui lòng chọn ít nhất một sản phẩm");
      return;
    }

    const payload = {
      table_id: tableId,
      customer_name: customer.name || "Khách QR",
      customer_phone: customer.phone,

      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
      })),
      total_amount: totalAmount,
    };

    try {
      const res = await menuApi.createOrder(payload);

      const orderId = res.data.data.id;

      setCart([]);
      setCustomer({ name: "", phone: "" });

      navigate(`/order-success/${orderId}`);
    } catch (error) {
      console.log("Lỗi đặt hàng:", error);
      alert("Đặt hàng thất bại");
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

      <section className="customer-box">
        <input
          placeholder="Tên khách hàng"
          value={customer.name}
          onChange={(e) =>
            setCustomer({ ...customer, name: e.target.value })
          }
        />

        <input
          placeholder="Số điện thoại"
          value={customer.phone}
          onChange={(e) =>
            setCustomer({ ...customer, phone: e.target.value })
          }
        />
      </section>

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

        <aside className="cart-box">
          <h2>Giỏ hàng</h2>

          {cart.length === 0 && (
            <p className="empty-cart">Chưa có sản phẩm nào</p>
          )}

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

          <div className="cart-total">
            <span>Tổng tiền</span>
            <b>{totalAmount.toLocaleString("vi-VN")}đ</b>
          </div>

          <button className="order-btn" onClick={submitOrder}>
            Gửi đơn hàng
          </button>
        </aside>
      </main>
    </div>
  );
}

export default Menu;