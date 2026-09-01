class BusinessAdvisorAgent:
    def respond(self, route: dict, analysis: dict) -> dict:
        intent = route.get("intent")
        data = analysis.get("data")

        # 1. Báo cáo Lợi nhuận
        if intent == "PROFIT_QUERY":
            if not data or "profit" not in data:
                reply = "Hiện chưa có đủ dữ liệu thu chi trong khoảng thời gian này để tính toán lợi nhuận."
                suggested = ["Xem doanh thu tháng này", "Xem chi phí gần đây"]
                presentation = {"type": "text"}
            else:
                profit = data.get("profit", 0.0)
                status_icon = "🟢" if profit >= 0 else "🔴"
                reply = (
                    f"📊 **Báo cáo Lợi nhuận Quản trị ({data.get('start')} đến {data.get('end')}):**\n"
                    f"- **Tổng doanh thu:** {data.get('revenue', 0):,.0f} VNĐ\n"
                    f"- **Tổng chi phí:** {data.get('expense', 0):,.0f} VNĐ\n"
                    f"- **Lợi nhuận ròng:** {status_icon} **{profit:,.0f} VNĐ** (Tỷ suất lợi nhuận: {data.get('profit_margin', 0)}%)\n\n"
                    f"💡 *Đề xuất:* {'Quán đang có tỷ suất sinh lời tốt, hãy tiếp tục duy trì!' if profit > 0 else 'Chi phí đang cao hơn doanh thu, cần rà soát lại các khoản chi nhập hàng ngay!'}"
                )
                suggested = ["Các khoản chi phí lớn nhất là gì?", "Top sản phẩm bán chạy nhất?"]
                presentation = {"type": "profit_card", "highlight": f"{profit:,.0f} VNĐ"}
        # 2. Báo cáo Doanh thu
        elif intent == "REVENUE_QUERY":
            rev = f"{data['revenue']:,.0f} VNĐ"
            reply = (
                f"📊 **Báo cáo Doanh thu ({data['start']} đến {data['end']}):**\n"
                f"- **Tổng doanh thu:** {rev}\n"
                f"- **Số đơn hoàn tất:** {data['orders']} đơn\n"
                f"- **Giá trị trung bình/đơn:** {data['avg_order']:,.0f} VNĐ\n\n"
                f"💡 *Nhận xét:* Dòng tiền bán hàng đang ổn định. Bạn có thể bán kèm combo để nâng cao giá trị trung bình/đơn."
            )
            suggested = ["Chi phí trong thời gian này là bao nhiêu?", "Top món bán chạy nhất?"]
            presentation = {"type": "kpi_card", "highlight": rev}

        # 3. Báo cáo Chi phí
        elif intent == "EXPENSE_QUERY":
            exp = f"{data['total_expense']:,.0f} VNĐ"
            cats = "\n".join([f"  • {c['category__name'] or 'Khác'}: {c['total_cat']:,.0f} VNĐ" for c in data['categories'][:3]]) or "  • Chưa ghi nhận chi tiết phân loại"
            reply = (
                f"💸 **Báo cáo Chi phí ({data['start']} đến {data['end']}):**\n"
                f"- **Tổng chi tiêu:** {exp}\n"
                f"- **Khoản chi lớn nhất:**\n{cats}\n\n"
                f"⚠️ *Cảnh báo:* Hãy kiểm soát chặt chẽ giá vốn và nguyên vật liệu tồn kho."
            )
            suggested = ["Lợi nhuận ước tính là bao nhiêu?", "Xem món bán chạy"]
            presentation = {"type": "expense_breakdown"}

        # 4. Top Món Bán chạy / Bán ế
        elif intent in ["TOP_PRODUCTS", "WORST_PRODUCTS"]:
            if not data or len(data) == 0:
                reply = "Hiện tại chưa có dữ liệu bán hàng trong khoảng thời gian này để thống kê."
                suggested = ["Kiểm tra doanh thu hôm nay", "Xem tình hình chi phí"]
                presentation = {"type": "text"}
            else:
                lines = [
                    f"{i+1}. **{x['product__product_name']}**: {x['total_qty']} phần ({x['total_sales']:,.0f} VNĐ)"
                    for i, x in enumerate(data)
                ]
                title = "🏆 **Top sản phẩm bán chạy nhất:**" if intent == "TOP_PRODUCTS" else "📉 **Top sản phẩm bán chậm nhất:**"
                advice = "Hãy dự trù đủ nguyên liệu cho các món này vào giờ cao điểm." if intent == "TOP_PRODUCTS" else "Xem xét giảm tồn kho nguyên liệu hoặc tạo ưu đãi combo xả hàng."
                reply = f"{title}\n\n" + "\n".join(lines) + f"\n\n💡 *Gợi ý:* {advice}"
                suggested = ["Các món này hay được mua kèm với gì?", "Dự báo doanh thu tuần tới?"]
                presentation = {"type": "ranking_list", "items": data}

        # 5. Phân tích Giỏ hàng & Gợi ý Combo (Apriori)
        elif intent == "APRIORI_RULES":
            if not data or len(data) == 0:
                reply = (
                    "🛒 **Phân tích tập sản phẩm mua kèm (Thuật toán Apriori):**\n\n"
                    "Hệ thống chưa ghi nhận đủ đơn hàng có từ 2 món trở lên để tìm ra quy luật kết hợp rõ ràng.\n\n"
                    "💡 *Mẹo kinh doanh:* Khi có thêm đơn hàng, AI sẽ tự động đề xuất các cặp món khách hay mua cùng nhau."
                )
                presentation = {"type": "text"}
            else:
                rule_lines = []
                for i, r in enumerate(data[:3]):
                    rule_lines.append(
                        f"{i+1}. Khi khách gọi **{r.get('antecedents')}** $\\rightarrow$ có **{r.get('confidence')*100:.1f}%** xác suất mua kèm **{r.get('consequents')}** (Độ gắn kết Lift: {r.get('lift'):.2f})."
                    )
                reply = (
                    "🛒 **Phân tích hành vi mua kèm (Khai phá luật Apriori):**\n\n"
                    + "\n".join(rule_lines) +
                    "\n\n💡 *Đề xuất chiến lược:* Đóng gói các cặp món trên thành gói Combo giảm giá 5% - 10% để kích cầu bán chéo (Cross-selling)."
                )
                presentation = {"type": "combo_recommendation", "rules": data}

            suggested = ["Top món bán chạy nhất?", "Dự báo doanh thu sắp tới"]

        # 6. Dự báo Doanh thu Chuỗi thời gian (Forecasting)
        elif intent == "REVENUE_FORECAST":
            if not data or not isinstance(data, dict):
                reply = (
                    "📈 **Dự báo Doanh thu (Chuỗi thời gian):**\n\n"
                    "Chưa đủ dữ liệu lịch sử bán hàng theo ngày để chạy mô hình dự báo chính xác.\n"
                    "💡 *Gợi ý:* Hãy duy trì bán hàng và hoàn tất đơn hàng đều đặn để kích hoạt dự báo."
                )
                presentation = {"type": "text"}
            else:
                forecast_lines = []
                forecast_items = data.get("forecast") or data.get("predictions") or []
                if isinstance(forecast_items, list) and len(forecast_items) > 0:
                    for item in forecast_items[:3]:
                        date_str = item.get("date") or item.get("day") or "Ngày tiếp theo"
                        val = item.get("revenue") or item.get("predicted_revenue") or 0.0
                        forecast_lines.append(f"  • {date_str}: ~**{float(val):,.0f} VNĐ**")
                    
                    reply = (
                        "📈 **Dự báo Doanh thu tương lai (Mô hình chuỗi thời gian):**\n\n"
                        + "\n".join(forecast_lines) +
                        "\n\n💡 *Hành động đề xuất:* Bạn nên chuẩn bị trước lượng nguyên vật liệu và nhân sự phù hợp cho các ngày cao điểm."
                    )
                else:
                    reply = "📈 Doanh thu những ngày tới dự kiến duy trì ổn định. Hãy chủ động chuẩn bị nguyên liệu trước cuối tuần."
                presentation = {"type": "forecast_chart", "data": data}

            suggested = ["Xem tình hình chi phí tuần này", "Top món bán chạy nhất"]

        # 7. Nhóm Khách hàng / Tổng quan
        elif intent == "CUSTOMER_CLUSTERING":
            total_rev = data.get("total_revenue", 0.0) if isinstance(data, dict) else 0.0
            total_orders = data.get("total_orders", 0) if isinstance(data, dict) else 0
            reply = (
                "👥 **Tổng quan Khách hàng & Kinh doanh:**\n\n"
                f"- Tổng doanh thu ghi nhận: **{total_rev:,.0f} VNĐ** qua **{total_orders} đơn hàng**.\n"
                "- Nhóm khách hàng thân thiết đóng góp phần lớn doanh số.\n\n"
                "💡 *Gợi ý:* Triển khai chương trình tích điểm hoặc tặng voucher cho khách hàng quay lại."
            )
            suggested = ["Doanh thu tháng này thế nào?", "Gợi ý combo món kèm"]
            presentation = {"type": "customer_segments"}

        # Mặc định
        else:
            reply = "Xin chào! Tôi là Trợ lý AI Cố vấn Kinh doanh. Bạn có thể hỏi tôi về Doanh thu, Chi phí, Lợi nhuận, Top món bán chạy, Gợi ý Combo mua kèm hoặc Dự báo tương lai."
            suggested = ["Doanh thu tháng này?", "Quán đang lời hay lỗ bao nhiêu?", "Món nào bán chạy nhất?", "Gợi ý combo món kèm"]
            presentation = {"type": "welcome"}

        return {"reply": reply, "presentation": presentation, "suggested_questions": suggested}