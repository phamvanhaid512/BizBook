import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import customerApi from "../api/customerApi";
import "./Customers.css";

const initialFormData = {
  customer_name: "",
  phone: "",
  email: "",
  address: "",
  status: "ACTIVE",
};

const initialPagination = {
  current_page: 1,
  page_size: 5,
  total_items: 0,
  total_pages: 1,
  has_next: false,
  has_previous: false,
};

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [keyword, setKeyword] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [pagination, setPagination] = useState(initialPagination);

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(null);

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    loadCustomers();
  }, [currentPage, itemsPerPage, keyword]);

  const loadCustomers = async () => {
    try {
      const res = await customerApi.getAll({
        page: currentPage,
        page_size: itemsPerPage,
        keyword,
      });

      const result = res.data.data;

      setCustomers(result.items || []);
      setPagination(result.pagination || initialPagination);
    } catch (error) {
      toast.error("Không thể tải danh sách khách hàng");
      console.log("Lỗi load khách hàng:", error);
    }
  };

  const handleSearch = (e) => {
    setKeyword(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);

    setFormData({
      customer_name: customer.customer_name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      status: customer.status || "ACTIVE",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData(initialFormData);
  };

  const openDeleteModal = (customer) => {
    setDeletingCustomer(customer);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setDeletingCustomer(null);
    setShowDeleteModal(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_name.trim()) {
      toast.warning("Tên khách hàng không được để trống");
      return;
    }

    const toastId = toast.loading(
      editingCustomer
        ? "Đang cập nhật khách hàng..."
        : "Đang thêm khách hàng..."
    );

    try {
      if (editingCustomer) {
        await customerApi.update(editingCustomer.id, formData);

        toast.update(toastId, {
          render: "Cập nhật khách hàng thành công",
          type: "success",
          isLoading: false,
          autoClose: 2200,
        });
      } else {
        await customerApi.create(formData);

        toast.update(toastId, {
          render: "Thêm khách hàng thành công",
          type: "success",
          isLoading: false,
          autoClose: 2200,
        });
      }

      closeModal();
      loadCustomers();
    } catch (error) {
      toast.update(toastId, {
        render: error.response?.data?.message || "Lưu khách hàng thất bại",
        type: "error",
        isLoading: false,
        autoClose: 2500,
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;

    const toastId = toast.loading("Đang xóa khách hàng...");

    try {
      await customerApi.delete(deletingCustomer.id);

      toast.update(toastId, {
        render: "Xóa khách hàng thành công",
        type: "success",
        isLoading: false,
        autoClose: 2200,
      });

      closeDeleteModal();
      loadCustomers();
    } catch (error) {
      toast.update(toastId, {
        render: error.response?.data?.message || "Xóa khách hàng thất bại",
        type: "error",
        isLoading: false,
        autoClose: 2500,
      });
    }
  };

  const getStartItem = () => {
    if (pagination.total_items === 0) return 0;
    return (currentPage - 1) * itemsPerPage + 1;
  };

  const getEndItem = () => {
    return Math.min(currentPage * itemsPerPage, pagination.total_items || 0);
  };

  return (
    <div className="customer-page">
      <div className="customer-header">
        <div>
          <h1>Quản lý khách hàng</h1>
          <p>Theo dõi thông tin khách hàng và lịch sử mua hàng</p>
        </div>

        <button className="add-customer-btn" onClick={openCreateModal}>
          + Thêm khách hàng
        </button>
      </div>

      <div className="customer-stat-grid">
        <div className="customer-stat-card blue">
          <span>Tổng khách hàng</span>
          <strong>{pagination.total_items || 0}</strong>
        </div>

        <div className="customer-stat-card green">
          <span>Trang hiện tại</span>
          <strong>{pagination.current_page || 1}</strong>
        </div>

        <div className="customer-stat-card purple">
          <span>Tổng trang</span>
          <strong>{pagination.total_pages || 1}</strong>
        </div>
      </div>

      <div className="customer-toolbar">
        <input
          placeholder="Tìm theo tên, số điện thoại hoặc email..."
          value={keyword}
          onChange={handleSearch}
        />
      </div>

      <div className="customer-table-card">
        <table>
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Số điện thoại</th>
              <th>Email</th>
              <th>Địa chỉ</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {customers.length > 0 ? (
              customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className="customer-info-cell">
                      <div className="customer-avatar">
                        {customer.customer_name?.charAt(0)}
                      </div>

                      <div>
                        <strong>{customer.customer_name}</strong>
                        <p>ID: #{customer.id}</p>
                      </div>
                    </div>
                  </td>

                  <td>{customer.phone || "Chưa có"}</td>
                  <td>{customer.email || "Chưa có"}</td>
                  <td>{customer.address || "Chưa có"}</td>

                  <td>
                    <span
                      className={
                        customer.status === "ACTIVE"
                          ? "customer-status active"
                          : "customer-status inactive"
                      }
                    >
                      {customer.status === "ACTIVE" ? "Hoạt động" : "Ngừng"}
                    </span>
                  </td>

                  <td>
                    <div className="customer-actions">
                      <button
                        className="edit-btn"
                        onClick={() => openEditModal(customer)}
                      >
                        Sửa
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => openDeleteModal(customer)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-table">
                  Không có khách hàng nào
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="pagination-box">
          <div className="pagination-left">
            <div className="pagination-info">
              Hiển thị <strong>{getStartItem()}</strong> -{" "}
              <strong>{getEndItem()}</strong> /{" "}
              <strong>{pagination.total_items || 0}</strong> khách hàng
            </div>

            <div className="pagination-page">
              Trang <strong>{currentPage}</strong> /{" "}
              <strong>{pagination.total_pages || 1}</strong>
            </div>
          </div>

          <div className="pagination-right">
            <select value={itemsPerPage} onChange={handlePageSizeChange}>
              <option value={5}>5 / trang</option>
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>

            <button
              disabled={!pagination.has_previous}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              Trước
            </button>

            {Array.from(
              { length: pagination.total_pages || 1 },
              (_, index) => {
                const pageNumber = index + 1;

                return (
                  <button
                    key={pageNumber}
                    className={currentPage === pageNumber ? "active-page" : ""}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                );
              }
            )}

            <button
              disabled={!pagination.has_next}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="customer-modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingCustomer
                    ? "Cập nhật khách hàng"
                    : "Thêm khách hàng"}
                </h2>
                <p>Nhập thông tin khách hàng bên dưới</p>
              </div>

              <button className="close-btn" onClick={closeModal}>
                ×
              </button>
            </div>

            <form className="customer-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên khách hàng</label>
                <input
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  placeholder="Ví dụ: Nguyễn Văn An"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0909000001"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="customer@gmail.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Địa chỉ</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Địa chỉ khách hàng"
                />
              </div>

              <div className="form-group">
                <label>Trạng thái</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeModal}>
                  Hủy
                </button>

                <button type="submit" className="save-btn">
                  {editingCustomer ? "Lưu thay đổi" : "Thêm khách hàng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <div className="delete-icon">!</div>

            <h2>Xóa khách hàng?</h2>

            <p>
              Bạn có chắc muốn xóa khách hàng{" "}
              <strong>{deletingCustomer?.customer_name}</strong> không?
            </p>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={closeDeleteModal}>
                Hủy
              </button>

              <button className="confirm-delete-btn" onClick={handleDelete}>
                Xóa khách hàng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;