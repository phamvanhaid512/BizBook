import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username || !form.password) {
      setError("Vui lòng nhập đầy đủ tài khoản và mật khẩu");
      return;
    }

    try {
      setLoading(true);
      await login(form.username, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError("Tài khoản hoặc mật khẩu không chính xác");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-left">
          <div className="brand-box">
            <h1>BizBook</h1>
            <p>Hệ thống số hóa sổ ghi chép kinh doanh</p>
          </div>

          <div className="intro-box">
            <h2>Quản lý kinh doanh thông minh</h2>
            <p>
              Theo dõi doanh thu, chi phí, đơn hàng, khách hàng và hỗ trợ ra
              quyết định bằng Data Mining & AI Agent.
            </p>
          </div>
        </div>

        <div className="login-right">
          <form className="login-card" onSubmit={handleSubmit}>
            <h2>Đăng nhập</h2>
            <p className="login-subtitle">
              Đăng nhập để truy cập hệ thống quản trị
            </p>

            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>Tên đăng nhập</label>
              <input
                type="text"
                name="username"
                placeholder="Nhập tên đăng nhập"
                value={form.username}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Mật khẩu</label>
              <input
                type="password"
                name="password"
                placeholder="Nhập mật khẩu"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            <button className="login-button" type="submit" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>

            <p className="login-footer">
              © 2026 BizBook Graduation Project
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;