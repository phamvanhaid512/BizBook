import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import "./Sidebar.css";

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: "📊" },
    { path: "/products", label: "Sản phẩm", icon: "📦" },
    { path: "/customers", label: "Khách hàng", icon: "👥" },
    { path: "/orders", label: "Đơn hàng", icon: "🧾" },
    { path: "/expenses", label: "Chi phí", icon: "💸" },
    { path: "/business-tables", label: "Bàn / QR", icon: "📱" },
    { path: "/mining", label: "Data Mining", icon: "⛏️" },
    { path: "/ai-agent", label: "AI Agent", icon: "🤖" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand">
          <div className="brand-icon">B</div>

          <div className="brand-text">
            <h2>BizBook</h2>
            <p>Business Manager</p>
          </div>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={
                location.pathname === item.path
                  ? "sidebar-link active"
                  : "sidebar-link"
              }
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <div className="user-box">
          <div className="user-avatar">A</div>

          <div>
            <h4>Admin</h4>
            <p>Quản trị hệ thống</p>
          </div>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;

