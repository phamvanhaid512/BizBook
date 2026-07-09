import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import "./PrintQR.css";

function PrintQR() {
    const [tables, setTables] = useState([]);

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        try {
            const response = await axiosClient.get("/tables/");
            setTables(response.data.data);
        } catch (error) {
            alert("Không thể tải danh sách QR");
        }
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return "";

        if (imagePath.startsWith("http")) {
            return imagePath;
        }

        return `${import.meta.env.VITE_BACKEND_URL}${imagePath}`;
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="print-qr-page">
            <div className="print-header">
                <div>
                    <h2>In mã QR gọi món</h2>
                    <p>Danh sách mã QR theo từng bàn</p>
                </div>

                <button onClick={handlePrint}>
                    In QR
                </button>
            </div>

            <div className="qr-grid">
                {tables.map((table) => (
                    <div className="qr-card" key={table.id}>
                        <h3>{table.table_name}</h3>

                        {table.qr_code_url ? (
                            <img
                                src={getImageUrl(table.qr_code_url)}
                                alt={table.table_name}
                            />
                        ) : (
                            <p className="no-qr">Chưa tạo QR</p>
                        )}

                        <p className="qr-note">
                            Quét mã để xem menu và gọi món
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PrintQR;