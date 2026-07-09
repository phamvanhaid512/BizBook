import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Products from "../pages/Products";
import Customers from "../pages/Customers";
import Orders from "../pages/Orders";
import Expenses from "../pages/Expenses";
import BusinessTables from "../pages/BusinessTables";
import Menu from "../pages/User/Menu";
import Mining from "../pages/Mining";
import AIAgent from "../pages/AIAgent";
import PrintQR from "../pages/admin/PrintQR";
import OrderSuccess from "../pages/User/OrderSuccess";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminLayout from "../layouts/AdminLayout";
import ProtectedRoute from "../components/ProtectedRoute";

function PrivatePage({ children }) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />

        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<PrivatePage><Dashboard /></PrivatePage>} />
        <Route path="/products" element={<PrivatePage><Products /></PrivatePage>} />
        <Route path="/customers" element={<PrivatePage><Customers /></PrivatePage>} />
        <Route path="/orders" element={<PrivatePage><Orders /></PrivatePage>} />
        <Route path="/expenses" element={<PrivatePage><Expenses /></PrivatePage>} />
        <Route path="/business-tables" element={<PrivatePage><BusinessTables /></PrivatePage>} />
        <Route path="/mining" element={<PrivatePage><Mining /></PrivatePage>} />
        <Route path="/ai-agent" element={<PrivatePage><AIAgent /></PrivatePage>} />

        <Route path="/menu/table/:tableId" element={<Menu />} />
        <Route path="/admin/print-qr" element={<PrintQR />} />
        <Route path="/order-success/:orderId" element={<OrderSuccess />} />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />
    </>
  );
}

export default AppRoutes;