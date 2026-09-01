import Sidebar from "../components/Sidebar";
import "./AdminLayout.css";
import { Outlet } from "react-router-dom";
import GlobalAIChat from "../components/GlobalAIChat";
function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <Sidebar />

      <main className="admin-main">
        {children}
      </main>
      <GlobalAIChat />
    </div>
  );
}

export default AdminLayout;