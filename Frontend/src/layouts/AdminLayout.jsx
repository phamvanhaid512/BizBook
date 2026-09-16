import Sidebar from "../components/Sidebar";
import "./AdminLayout.css";
import { Outlet } from "react-router-dom";
import GlobalAIChat from "../components/GlobalAIChat";
import AdminTableChat from "../components/AdminTableChat"; // <--- Thêm dòng import này

function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <Sidebar />

      <main className="admin-main">
        {children}
      </main>
      
      {/* Nút Chat AI cho Chủ quán (Màu xanh) */}
      <GlobalAIChat />

      {/* Nút Chat Hỗ trợ khách tại bàn (Màu cam) */}
      <AdminTableChat />
    </div>
  );
}

export default AdminLayout;