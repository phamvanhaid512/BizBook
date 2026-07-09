import "./Dashboard.css";

function Dashboard() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-label">Tổng quan hệ thống</p>
          <h1>Dashboard BizBook</h1>
          <p className="dashboard-desc">
            Theo dõi doanh thu, chi phí, đơn hàng và hiệu quả kinh doanh.
          </p>
        </div>

        <button className="dashboard-btn">Xuất báo cáo</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card blue">
          <p>Doanh thu</p>
          <h2>24.500.000đ</h2>
          <span>+12.5% so với tháng trước</span>
        </div>

        <div className="stat-card green">
          <p>Lợi nhuận</p>
          <h2>8.700.000đ</h2>
          <span>+8.2% tăng trưởng</span>
        </div>

        <div className="stat-card orange">
          <p>Đơn hàng</p>
          <h2>186</h2>
          <span>32 đơn trong tuần này</span>
        </div>

        <div className="stat-card purple">
          <p>Khách hàng</p>
          <h2>74</h2>
          <span>15 khách mới</span>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="chart-card">
          <div className="card-title">
            <h3>Doanh thu 7 ngày gần nhất</h3>
            <p>Biểu đồ mô phỏng dữ liệu kinh doanh</p>
          </div>

          <div className="bar-chart">
            <div className="bar" style={{ height: "45%" }}><span>T2</span></div>
            <div className="bar" style={{ height: "70%" }}><span>T3</span></div>
            <div className="bar" style={{ height: "55%" }}><span>T4</span></div>
            <div className="bar" style={{ height: "85%" }}><span>T5</span></div>
            <div className="bar" style={{ height: "65%" }}><span>T6</span></div>
            <div className="bar" style={{ height: "95%" }}><span>T7</span></div>
            <div className="bar" style={{ height: "78%" }}><span>CN</span></div>
          </div>
        </div>

        <div className="ai-card">
          <h3>AI Agent gợi ý</h3>
          <p>
            Sản phẩm bán chạy nhất tuần là <b>Cà phê sữa</b>. Nên nhập thêm nguyên
            liệu và tạo combo khuyến mãi vào cuối tuần.
          </p>

          <div className="ai-badge">Business Advisor</div>
        </div>
      </div>

      <div className="bottom-grid">
        <div className="table-card">
          <h3>Đơn hàng gần đây</h3>

          <table>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>#ORD001</td>
                <td>Nguyễn Văn An</td>
                <td>150.000đ</td>
                <td><span className="status paid">Đã thanh toán</span></td>
              </tr>

              <tr>
                <td>#ORD002</td>
                <td>Trần Thị Bình</td>
                <td>320.000đ</td>
                <td><span className="status pending">Chờ xử lý</span></td>
              </tr>

              <tr>
                <td>#ORD003</td>
                <td>Khách QR bàn 05</td>
                <td>89.000đ</td>
                <td><span className="status paid">Đã thanh toán</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mining-card">
          <h3>Data Mining</h3>

          <div className="mining-item">
            <span>Phân nhóm khách hàng</span>
            <b>K-Means</b>
          </div>

          <div className="mining-item">
            <span>Gợi ý mua kèm</span>
            <b>Apriori</b>
          </div>

          <div className="mining-item">
            <span>Dự báo doanh thu</span>
            <b>Forecasting</b>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;