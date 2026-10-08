import React, { useState } from "react";
import { Clock, UtensilsCrossed, User, Edit3, Bell, Wallet, FileText } from "lucide-react";
import "./WelcomePortal.css";

export default function WelcomePortal({ customer, setCustomer, tableId, onEnterMenu, onCallService }) {
  const [isIdentified, setIsIdentified] = useState(false);
  const [errors, setErrors] = useState({});

  // Regex kiểm tra số điện thoại Việt Nam hợp lệ (10 chữ số: 03x, 05x, 07x, 08x, 09x)
  const VIETNAM_PHONE_REGEX = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;

  const validate = () => {
    const newErrors = {};

    // Validate Tên khách hàng
    const trimmedName = (customer.name || "").trim();
    if (!trimmedName) {
      newErrors.name = "Vui lòng nhập tên của bạn.";
    } else if (trimmedName.length < 2) {
      newErrors.name = "Tên phải có ít nhất 2 ký tự.";
    }

    // Validate Số điện thoại (Tùy chọn: chỉ kiểm tra nếu có nhập)
    const trimmedPhone = (customer.phone || "").trim();
    if (trimmedPhone && !VIETNAM_PHONE_REGEX.test(trimmedPhone)) {
      newErrors.phone = "Số điện thoại không hợp lệ (gồm 10 số, bắt đầu bằng 03, 05, 07, 08, 09).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStart = (e) => {
    e.preventDefault();
    if (validate()) {
      setIsIdentified(true);
    }
  };

  const handleNameChange = (e) => {
    setCustomer({ ...customer, name: e.target.value });
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: "" }));
    }
  };

  const handlePhoneChange = (e) => {
    setCustomer({ ...customer, phone: e.target.value });
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: "" }));
    }
  };

  // ==========================================
  // BƯỚC 1: MÀN HÌNH NHẬP TÊN
  // ==========================================
  if (!isIdentified) {
    return (
      <div className="welcome-portal">
        <div className="welcome-card">
          <div className="welcome-banner-circle">
            <img
              src="https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop"
              alt="BizBook Cover"
            />
          </div>

          <h1 className="welcome-title">BizBook xin chào quý khách!</h1>
          <p className="welcome-desc">
            Bạn vui lòng cho nhà hàng biết tên để phục vụ nhanh chóng và chính xác hơn nhé!
          </p>

          <form onSubmit={handleStart} className="welcome-form" noValidate>
            <div className="input-group">
              <label>Tên của bạn *</label>
              <input
                type="text"
                placeholder="VD: Phạm Văn Hải"
                value={customer.name || ""}
                onChange={handleNameChange}
                className={errors.name ? "input-error" : ""}
                autoFocus
              />
              {errors.name && <span className="error-message" style={{ color: "#e11d48", fontSize: "0.85rem", marginTop: "4px" }}>{errors.name}</span>}
            </div>

            <div className="input-group">
              <label>Số điện thoại (tích điểm - nếu có)</label>
              <input
                type="tel"
                placeholder="Nhập số điện thoại..."
                value={customer.phone || ""}
                onChange={handlePhoneChange}
                className={errors.phone ? "input-error" : ""}
              />
              {errors.phone && <span className="error-message" style={{ color: "#e11d48", fontSize: "0.85rem", marginTop: "4px" }}>{errors.phone}</span>}
            </div>

            <button type="submit" className="btn-start-portal">
              Bắt đầu
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // BƯỚC 2: MÀN HÌNH HUB (TRUNG TÂM HỖ TRỢ)
  // ==========================================
  return (
    <div className="hub-portal-page">
      <div className="hub-banner">
        <img src="https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop" alt="Cover" />
      </div>

      <div className="hub-content-wrapper">
        <div className="hub-info-card">
          <h2>BizBook</h2>
          <div className="hub-info-row">
            <Clock size={18} className="hub-icon" /> <span>Giờ mở cửa: Cả tuần</span>
          </div>
          <div className="hub-info-row">
            <UtensilsCrossed size={18} className="hub-icon" /> <span>{tableId ? `Bàn ${tableId}` : "Khách mang đi"} - Khu vực 1</span>
          </div>
          <div className="hub-info-row customer-edit">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <User size={18} className="hub-icon" />
              <span style={{ fontWeight: '600' }}>{customer.name}</span>
            </div>
            <button className="btn-edit-name" onClick={() => setIsIdentified(false)}>
              <Edit3 size={16} />
            </button>
          </div>
        </div>

        <h3 className="hub-support-title">Bạn đang cần hỗ trợ gì?</h3>
        <div className="hub-action-grid">
          <button className="hub-action-btn staff" onClick={() => onCallService("Gọi nhân viên")}>
            <div className="icon-circle bg-green"><Bell size={22} /></div>
            <span>Gọi nhân viên</span>
          </button>

          <button className="hub-action-btn bill" onClick={() => onCallService("Gọi thanh toán")}>
            <div className="icon-circle bg-yellow"><Wallet size={22} /></div>
            <span>Gọi thanh toán</span>
          </button>
        </div>

        <button className="btn-go-menu-main" onClick={onEnterMenu}>
          <FileText size={24} /> Thực đơn & gọi món
        </button>
      </div>
    </div>
  );
}