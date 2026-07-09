import { useEffect, useState } from "react";
import productApi from "../api/productApi.js";
import "./Products.css";
import { toast } from "react-toastify";

function Products() {
  const [products, setProducts] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [pagination, setPagination] = useState({
    current_page: 1,
    page_size: 5,
    total_items: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);

  const [formData, setFormData] = useState({
    product_name: "",
    category: "",
    price: "",
    stock_quantity: "",
    unit: "",
    description: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    loadProducts();
  }, [currentPage, itemsPerPage, keyword, statusFilter]);

  const loadProducts = async () => {
    try {
      const res = await productApi.getAll({
        page: currentPage,
        page_size: itemsPerPage,
        keyword,
        status: statusFilter,
      });

      setProducts(res.data.data.items || []);
      setPagination(res.data.data.pagination || {});
    } catch (error) {
      toast.error("Không thể tải danh sách sản phẩm");
      console.log("Lỗi load sản phẩm:", error);
    }
  };

  const handleSearch = (e) => {
    setKeyword(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      product_name: "",
      category: "",
      price: "",
      stock_quantity: "",
      unit: "",
      description: "",
      status: "ACTIVE",
    });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      product_name: product.product_name || "",
      category: product.category || "",
      price: product.price || "",
      stock_quantity: product.stock_quantity || "",
      unit: product.unit || "",
      description: product.description || "",
      status: product.status || "ACTIVE",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const openDeleteModal = (product) => {
    setDeletingProduct(product);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setDeletingProduct(null);
    setShowDeleteModal(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.product_name.trim()) {
      toast.warning("Tên sản phẩm không được để trống");
      return;
    }

    if (!formData.price) {
      toast.warning("Giá bán không được để trống");
      return;
    }

    const payload = {
      ...formData,
      price: Number(formData.price),
      stock_quantity: Number(formData.stock_quantity || 0),
      category: formData.category ? Number(formData.category) : null,
    };

    const toastId = toast.loading(
      editingProduct ? "Đang cập nhật sản phẩm..." : "Đang thêm sản phẩm..."
    );

    try {
      if (editingProduct) {
        await productApi.update(editingProduct.id, payload);

        toast.update(toastId, {
          render: "Cập nhật sản phẩm thành công",
          type: "success",
          isLoading: false,
          autoClose: 2200,
        });
      } else {
        await productApi.create(payload);

        toast.update(toastId, {
          render: "Thêm sản phẩm thành công",
          type: "success",
          isLoading: false,
          autoClose: 2200,
        });
      }

      closeModal();
      loadProducts();
    } catch (error) {
      toast.update(toastId, {
        render: error.response?.data?.message || "Lưu sản phẩm thất bại",
        type: "error",
        isLoading: false,
        autoClose: 2500,
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;

    const toastId = toast.loading("Đang xóa sản phẩm...");

    try {
      await productApi.delete(deletingProduct.id);

      toast.update(toastId, {
        render: "Xóa sản phẩm thành công",
        type: "success",
        isLoading: false,
        autoClose: 2200,
      });

      closeDeleteModal();
      loadProducts();
    } catch (error) {
      toast.update(toastId, {
        render: error.response?.data?.message || "Xóa sản phẩm thất bại",
        type: "error",
        isLoading: false,
        autoClose: 2500,
      });
    }
  };

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  };

  return (
    <div className="product-page">
      <div className="product-header">
        <div>
          <h1>Quản lý sản phẩm</h1>
          <p>Quản lý món ăn, đồ uống và hàng hóa trong cửa hàng</p>
        </div>

        <button className="add-product-btn" onClick={openCreateModal}>
          + Thêm sản phẩm
        </button>
      </div>

      <div className="product-stat-grid">
        <div className="stat-card blue">
          <span>Tổng sản phẩm</span>
          <strong>{pagination.total_items || 0}</strong>
        </div>

        <div className="stat-card green">
          <span>Trang hiện tại</span>
          <strong>{pagination.current_page || 1}</strong>
        </div>

        <div className="stat-card red">
          <span>Tổng trang</span>
          <strong>{pagination.total_pages || 1}</strong>
        </div>
      </div>

      <div className="product-toolbar">
        <input
          placeholder="Tìm kiếm sản phẩm..."
          value={keyword}
          onChange={handleSearch}
        />

        <select value={statusFilter} onChange={handleStatusFilter}>
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang bán</option>
          <option value="INACTIVE">Ngừng bán</option>
        </select>
      </div>

      <div className="product-table-card">
        <table>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Danh mục</th>
              <th>Giá bán</th>
              <th>Tồn kho</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="product-info-cell">
                    <div className="product-avatar">
                      {product.product_name?.charAt(0)}
                    </div>

                    <div>
                      <strong>{product.product_name}</strong>
                      <p>ID: #{product.id}</p>
                    </div>
                  </div>
                </td>

                <td>{product.category_name || product.category || "Chưa phân loại"}</td>

                <td className="price-cell">{formatMoney(product.price)}</td>

                <td>{product.stock_quantity}</td>

                <td>
                  <span
                    className={
                      product.status === "ACTIVE"
                        ? "status-badge active"
                        : "status-badge inactive"
                    }
                  >
                    {product.status === "ACTIVE" ? "Đang bán" : "Ngừng bán"}
                  </span>
                </td>

                <td>
                  <div className="action-buttons">
                    <button
                      className="edit-btn"
                      onClick={() => openEditModal(product)}
                    >
                      Sửa
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => openDeleteModal(product)}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {products.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-table">
                  Không có sản phẩm nào
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="pagination-box">
          <div className="pagination-info">
            Tổng <strong>{pagination.total_items || 0}</strong> sản phẩm
          </div>

          <div className="pagination-actions">
            <select value={itemsPerPage} onChange={handlePageSizeChange}>
              <option value={5}>5 / trang</option>
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
            </select>

            <button
              disabled={!pagination.has_previous}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Trước
            </button>

            {Array.from({ length: pagination.total_pages || 1 }, (_, index) => (
              <button
                key={index + 1}
                className={currentPage === index + 1 ? "active-page" : ""}
                onClick={() => setCurrentPage(index + 1)}
              >
                {index + 1}
              </button>
            ))}

            <button
              disabled={!pagination.has_next}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="product-modal">
            <div className="modal-header">
              <div>
                <h2>{editingProduct ? "Cập nhật sản phẩm" : "Thêm sản phẩm"}</h2>
                <p>Nhập thông tin sản phẩm bên dưới</p>
              </div>

              <button className="close-btn" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-group">
                <label>Tên sản phẩm</label>
                <input
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleChange}
                  placeholder="Ví dụ: Trà đào cam sả"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Danh mục ID</label>
                  <input
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Ví dụ: 1"
                  />
                </div>

                <div className="form-group">
                  <label>Trạng thái</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="ACTIVE">Đang bán</option>
                    <option value="INACTIVE">Ngừng bán</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Giá bán</label>
                  <input
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="35000"
                  />
                </div>

                <div className="form-group">
                  <label>Tồn kho</label>
                  <input
                    name="stock_quantity"
                    type="number"
                    value={formData.stock_quantity}
                    onChange={handleChange}
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Đơn vị</label>
                <input
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  placeholder="Ly, phần, cái..."
                />
              </div>

              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Mô tả ngắn về sản phẩm"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeModal}>
                  Hủy
                </button>

                <button type="submit" className="save-btn">
                  {editingProduct ? "Lưu thay đổi" : "Thêm sản phẩm"}
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

            <h2>Xóa sản phẩm?</h2>

            <p>
              Bạn có chắc muốn xóa sản phẩm{" "}
              <strong>{deletingProduct?.product_name}</strong> không?
            </p>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={closeDeleteModal}>
                Hủy
              </button>

              <button className="confirm-delete-btn" onClick={handleDelete}>
                Xóa sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;