import React, { useState } from 'react';
import './Expenses.css'
function Expenses() {
  // 1. Data mẫu ban đầu
  const [expenses, setExpenses] = useState([
    { id: 1, title: 'Tiền thuê mặt bằng tháng 7', amount: 15000000, category: 'Cố định', date: '2026-07-01' },
    { id: 2, title: 'Nhập hàng hóa mỹ phẩm', amount: 8500000, category: 'Nhập hàng', date: '2026-07-05' },
    { id: 3, title: 'Tiền điện nước cửa hàng', amount: 2300000, category: 'Vận hành', date: '2026-07-08' },
  ]);

  // State cho Form
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Nhập hàng');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // 2. Hàm xử lý thêm chi phí mới
  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!title || !amount) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    const newExpense = {
      id: Date.now(),
      title,
      amount: parseFloat(amount),
      category,
      date
    };

    setExpenses([newExpense, ...expenses]);
    
    // Reset form
    setTitle('');
    setAmount('');
  };

  // 3. Hàm xóa chi phí
  const handleDelete = (id) => {
    if(window.confirm('Bạn có chắc chắn muốn xóa khoản chi này?')) {
      setExpenses(expenses.filter(item => item.id !== id));
    }
  };

  // 4. Tính toán tổng chi phí
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-gray-800">
      {/* Tiêu đề trang */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý chi phí</h1>
        <p className="text-gray-500 text-sm">Số hóa và theo dõi các khoản chi tiêu của doanh nghiệp</p>
      </div>

      {/* Khu vực Thống kê Nhanh */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 uppercase">Tổng chi tiêu</p>
          <p className="text-2xl font-bold text-red-600 mt-2">
            {totalExpenses.toLocaleString('vi-VN')} đ
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 uppercase">Số khoản chi</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">{expenses.length} giao dịch</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 uppercase">Danh mục chi nhiều nhất</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">Cố định</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CỘT TẠO CHI PHÍ MỚI */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 border-b pb-2">Ghi chép chi phí mới</h2>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên chi phí / Lý do</label>
              <input
                type="text"
                placeholder="Ví dụ: Tiền internet, Mua văn phòng phẩm..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VNĐ)</label>
              <input
                type="number"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Nhập hàng">Nhập hàng</option>
                <option value="Cố định">Cố định (Mặt bằng, lương...)</option>
                <option value="Vận hành">Vận hành (Điện, nước, internet...)</option>
                <option value="Marketing">Marketing / Quảng cáo</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày chi</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200"
            >
              + Thêm vào sổ cái
            </button>
          </form>
        </div>

        {/* CỘT DANH SÁCH CHI PHÍ */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 border-b pb-2">Lịch sử chi tiêu</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-sm">
                  <th className="pb-3 font-semibold">Ngày chi</th>
                  <th className="pb-3 font-semibold">Nội dung</th>
                  <th className="pb-3 font-semibold">Danh mục</th>
                  <th className="pb-3 font-semibold text-right">Số tiền</th>
                  <th className="pb-3 font-semibold text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-400">Chưa có khoản chi nào được ghi nhận.</td>
                  </tr>
                ) : (
                  expenses.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="py-3.5 text-gray-600">{item.date}</td>
                      <td className="py-3.5 font-medium text-gray-950">{item.title}</td>
                      <td className="py-3.5">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                          ${item.category === 'Cố định' ? 'bg-orange-100 text-orange-700' : 
                            item.category === 'Nhập hàng' ? 'bg-green-100 text-green-700' : 
                            item.category === 'Vận hành' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-semibold text-red-600">
                        -{item.amount.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 text-center">
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="text-gray-400 hover:text-red-600 transition p-1"
                          title="Xóa khoản chi"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Expenses;