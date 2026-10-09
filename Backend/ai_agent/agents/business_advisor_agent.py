class BusinessAdvisorAgent:
    def respond(self, route: dict, analysis: dict) -> dict:
        intent = route.get("intent")
        data = analysis.get("data")

        # 1. Báo cáo Lợi nhuận
        if intent == "PROFIT_QUERY":
            if not data or "profit" not in data:
                reply = "Hiện chưa có đủ dữ liệu thu chi trong khoảng thời gian này để tính toán lợi nhuận."
                suggested = [
                    "Xem doanh thu hôm nay",
                    "Xem chi phí gần đây",
                    "Hôm nay bán được bao nhiêu đơn rồi?",
                    "Chi phí nhập hàng gần đây",
                ]
                presentation = {"type": "text"}
            else:
                profit = float(data.get("profit") or 0.0)
                margin = float(data.get("profit_margin") or 0.0)
                revenue = float(data.get("revenue") or 0.0)
                cogs = float(data.get("cogs") or 0.0)
                orders = int(data.get("orders") or 0)
                avg_order = float(data.get("avg_order") or 0.0)

                status_icon = "🟢" if profit >= 0 else "🔴"
                status_text = "có lãi" if profit >= 0 else "đang lỗ"
                start_date = data.get("start") or "Gần đây"
                end_date = data.get("end") or "Hiện tại"

                advice = (
                    f"Tỷ suất lợi nhuận đạt {margin}%, biên độ sinh lời rất tốt!"
                    if margin > 30
                    else "Tỷ suất lợi nhuận đang ở mức thấp, nên rà soát và tối ưu lại giá vốn nguyên liệu!"
                )

                reply = (
                    f"📊 **Báo cáo Lợi nhuận ({start_date} đến {end_date}):**\n"
                    f"- **Tổng doanh thu:** {revenue:,.0f} VNĐ ({orders} đơn)\n"
                    f"- **Tổng giá vốn (COGS):** {cogs:,.0f} VNĐ\n"
                    f"- **Giá trị đơn TB:** {avg_order:,.0f} VNĐ/đơn\n"
                    f"- **Tổng lợi nhuận:** {status_icon} **{profit:,.0f} VNĐ** (Tỷ suất sinh lời: **{margin}%** - {status_text})\n\n"
                    f"💡 *Đánh giá:* {advice}"
                )
                suggested = [
                    "Top món bán chạy nhất đợt này?",
                    "Doanh thu tuần này so với tuần trước tăng hay giảm?",
                    "Chi phí phát sinh khoản nào lớn nhất?",
                    "Dự báo doanh thu những ngày tới",
                    "Gợi ý combo món kèm để tăng giá trị đơn",
                ]
                presentation = {
                    "type": "profit_card",
                    "highlight": f"{profit:,.0f} VNĐ",
                    "margin": f"{margin}%",
                    "orders": orders,
                    "avg_order": avg_order,
                }

        # 2. Báo cáo Doanh thu
        elif intent == "REVENUE_QUERY":
            if not data:
                reply = "Hiện chưa có dữ liệu doanh thu trong khoảng thời gian này."
                suggested = [
                    "Hôm nay bán được bao nhiêu đơn rồi?",
                    "Xem tình hình chi phí",
                    "Doanh thu tháng trước thế nào?",
                    "Dự báo doanh thu tuần tới",
                ]
                presentation = {"type": "text"}
            else:
                rev_val = float(data.get("revenue") or 0.0)
                orders = int(data.get("orders") or 0)
                avg_val = float(data.get("avg_order") or 0.0)
                start_date = data.get("start") or "Gần đây"
                end_date = data.get("end") or "Hiện tại"
                rev_str = f"{rev_val:,.0f} VNĐ"

                reply = (
                    f"📊 **Báo cáo Doanh thu ({start_date} đến {end_date}):**\n"
                    f"- **Tổng doanh thu:** {rev_str}\n"
                    f"- **Số đơn hoàn tất:** {orders} đơn\n"
                    f"- **Giá trị trung bình/đơn:** {avg_val:,.0f} VNĐ\n\n"
                    f"💡 *Nhận xét:* Dòng tiền bán hàng đang ổn định. Bạn có thể bán kèm combo để nâng cao giá trị trung bình/đơn."
                )
                suggested = [
                    "Hôm nay bán được bao nhiêu đơn rồi?",
                    "Quán đông khách nhất vào khung giờ nào?",
                    "Chi phí trong thời gian này là bao nhiêu?",
                    "Top món bán chạy nhất?",
                    "Doanh thu tuần này tăng hay giảm?",
                ]
                presentation = {"type": "kpi_card", "highlight": rev_str}

        # 3. Báo cáo Chi phí
        elif intent == "EXPENSE_QUERY":
            if not data:
                reply = "Hiện chưa có dữ liệu chi phí được ghi nhận trong thời gian này."
                suggested = [
                    "Xem doanh thu gần đây",
                    "Quán đang lời hay lỗ bao nhiêu?",
                    "Hôm nay bán được bao nhiêu đơn?",
                ]
                presentation = {"type": "text"}
            else:
                total_exp = float(data.get("total_expense") or 0.0)
                categories = data.get("categories") or []
                start_date = data.get("start") or "Gần đây"
                end_date = data.get("end") or "Hiện tại"

                cats_str = "\n".join([
                    f"  • {c.get('category__name') or 'Khác'}: {float(c.get('total_cat') or 0.0):,.0f} VNĐ"
                    for c in categories[:3]
                ]) or "  • Chưa ghi nhận chi tiết phân loại"

                reply = (
                    f"💸 **Báo cáo Chi phí ({start_date} đến {end_date}):**\n"
                    f"- **Tổng chi tiêu:** {total_exp:,.0f} VNĐ\n"
                    f"- **Khoản chi lớn nhất:**\n{cats_str}\n\n"
                    f"⚠️ *Cảnh báo:* Hãy kiểm soát chặt chẽ giá vốn và nguyên vật liệu tồn kho."
                )
                suggested = [
                    "Quán đang lời hay lỗ bao nhiêu?",
                    "Có món nào sắp hết hàng trong kho không?",
                    "Tỷ suất lợi nhuận đạt bao nhiêu phần trăm?",
                    "Top món bán chạy nhất đợt này?",
                ]
                presentation = {"type": "expense_breakdown"}

        # 4. Top Món Bán chạy / Bán ế
        elif intent in ["TOP_PRODUCTS", "WORST_PRODUCTS"]:
            if not data or len(data) == 0:
                reply = "Hiện tại chưa có dữ liệu bán hàng trong khoảng thời gian này để thống kê."
                suggested = [
                    "Kiểm tra doanh thu hôm nay",
                    "Hôm nay bán được bao nhiêu đơn?",
                    "Xem tình hình chi phí",
                ]
                presentation = {"type": "text"}
            else:
                lines = [
                    f"{i+1}. **{x.get('product__product_name') or 'Sản phẩm'}**: {int(x.get('total_qty') or 0)} phần ({float(x.get('total_sales') or 0.0):,.0f} VNĐ)"
                    for i, x in enumerate(data)
                ]
                title = "🏆 **Top sản phẩm bán chạy nhất:**" if intent == "TOP_PRODUCTS" else "📉 **Top sản phẩm bán chậm nhất:**"
                advice = (
                    "Hãy dự trù đủ nguyên liệu cho các món này vào giờ cao điểm."
                    if intent == "TOP_PRODUCTS"
                    else "Xem xét giảm tồn kho nguyên liệu hoặc tạo ưu đãi combo xả hàng."
                )
                reply = f"{title}\n\n" + "\n".join(lines) + f"\n\n💡 *Gợi ý:* {advice}"
                suggested = [
                    "Gợi ý combo món kèm từ dữ liệu mua hàng",
                    "Có món nào sắp hết hàng trong kho không?",
                    "Món nào đang bán chậm, ế khách?",
                    "Quán đông khách nhất lúc mấy giờ?",
                    "Dự báo doanh thu tuần tới",
                ]
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
                rule_lines = [
                    f"{i+1}. Khi khách gọi **{r.get('antecedents')}** ➔ có **{float(r.get('confidence') or 0.0)*100:.1f}%** xác suất mua kèm **{r.get('consequents')}** (Độ gắn kết Lift: {float(r.get('lift') or 0.0):.2f})."
                    for i, r in enumerate(data[:3])
                ]
                reply = (
                    "🛒 **Phân tích hành vi mua kèm (Khai phá luật Apriori):**\n\n"
                    + "\n".join(rule_lines)
                    + "\n\n💡 *Đề xuất chiến lược:* Đóng gói các cặp món trên thành gói Combo giảm giá 5% - 10% để kích cầu bán chéo (Cross-selling)."
                )
                presentation = {"type": "combo_recommendation", "rules": data}
            suggested = [
                "Top món bán chạy nhất?",
                "Giá trị trung bình mỗi đơn là bao nhiêu?",
                "Gợi ý chương trình khuyến mãi tăng doanh số?",
                "Quán đông khách nhất vào khung giờ nào?",
                "Dự báo doanh thu sắp tới",
            ]

        # 6. Đếm số đơn hàng
        elif intent == "ORDER_COUNT_QUERY":
            orders = int(data.get("orders", 0)) if data else 0
            reply = f"📦 Trong khoảng thời gian này, quán đã hoàn tất thành công **{orders}** đơn hàng."
            suggested = [
                "Giá trị trung bình mỗi đơn là bao nhiêu?",
                "Quán đông khách nhất vào khung giờ nào?",
                "Khách chuộng trả tiền mặt hay quét mã QR?",
                "Doanh thu hôm nay đạt bao nhiêu?",
                "Tỷ lệ đơn bị hủy gần đây có cao không?",
            ]
            presentation = {"type": "kpi_card", "highlight": f"{orders} đơn"}

        # 7. Giá trị đơn trung bình (AOV)
        elif intent == "AOV_QUERY":
            aov = float(data.get("aov", 0.0)) if data else 0.0
            reply = (
                f"🏷️ **Giá trị trung bình mỗi đơn hàng:** **{aov:,.0f} VNĐ/đơn**.\n\n"
                f"💡 *Gợi ý:* Để nâng chỉ số này, bạn có thể áp dụng chiến lược gợi ý up-size hoặc bán kèm combo đồ ăn/thức uống."
            )
            suggested = [
                "Gợi ý combo món kèm để tăng doanh số",
                "Top món bán chạy nhất đợt này?",
                "Doanh thu tuần này so với tuần trước tăng hay giảm?",
                "Hôm nay bán được bao nhiêu đơn rồi?",
                "Tỷ suất lợi nhuận đạt bao nhiêu phần trăm?",
            ]
            presentation = {"type": "kpi_card", "highlight": f"{aov:,.0f} VNĐ"}

        # 8. Giờ cao điểm
        elif intent == "PEAK_HOURS_QUERY":
            peak_list = data.get("peak_hours", []) if data else []
            if peak_list:
                hours_str = ", ".join([
                    f"**{p.get('hour')}h - {p.get('hour')+1}h** ({p.get('order_count')} đơn)"
                    for p in peak_list
                ])
                reply = (
                    f"⏰ **Khung giờ đông khách nhất:**\n- {hours_str}\n\n"
                    f"💡 *Đề xuất:* Chuẩn bị trước nguyên liệu sẵn sàng trước các khung giờ này để phục vụ khách nhanh chóng."
                )
            else:
                reply = "Hiện chưa đủ dữ liệu phân bố giờ để xác định khung giờ cao điểm."
            suggested = [
                "Hôm nay bán được bao nhiêu đơn rồi?",
                "Có món nào sắp hết hàng trong kho không?",
                "Top món bán chạy nhất vào giờ cao điểm?",
                "Giá trị trung bình mỗi đơn là bao nhiêu?",
                "Dự báo doanh thu những ngày tới",
            ]
            presentation = {"type": "text"}

        # 9. Kiểm tra tồn kho
        elif intent == "INVENTORY_QUERY":
            low_stock = data.get("low_stock", []) if data else []
            if low_stock:
                name_key = "product_name" if "product_name" in low_stock[0] else "name"
                qty_key = data.get("qty_field", "stock")
                items_str = "\n".join([f"- **{p.get(name_key)}**: còn **{p.get(qty_key)}** phần" for p in low_stock])
                reply = f"⚠️ **Cảnh báo các mặt hàng sắp hết:**\n{items_str}\n\n💡 Nên liên hệ nhà cung cấp để nhập thêm hàng kịp thời."
            else:
                reply = "✅ Tồn kho các mặt hàng hiện tại vẫn ở mức an toàn (trên 10 phần)."
            suggested = [
                "Món nào đang bán chậm, ế khách?",
                "Chi phí nhập hàng gần đây",
                "Top món bán chạy nhất?",
                "Gợi ý combo món kèm",
                "Quán đông khách nhất lúc mấy giờ?",
            ]
            presentation = {"type": "text"}

        # 10. Phương thức thanh toán
        elif intent == "PAYMENT_METHOD_QUERY":
            methods = data.get("methods", []) if data else []
            if methods:
                lines = [
                    f"- {m.get('payment_method') or 'Chưa rõ'}: {m.get('order_count')} đơn ({float(m.get('total_revenue') or 0):,.0f} VNĐ)"
                    for m in methods
                ]
                reply = "💳 **Cơ cấu phương thức thanh toán:**\n" + "\n".join(lines)
            else:
                reply = "Chưa có thông tin ghi nhận về phương thức thanh toán."
            suggested = [
                "Hôm nay bán được bao nhiêu đơn rồi?",
                "Doanh thu tuần này tăng hay giảm?",
                "Giá trị trung bình mỗi đơn là bao nhiêu?",
                "Tỷ lệ đơn bị hủy gần đây có cao không?",
            ]
            presentation = {"type": "text"}

        # 11. Đơn hủy
        elif intent == "CANCELLED_ORDERS_QUERY":
            cancelled = data.get("cancelled", 0) if data else 0
            rate = data.get("rate", 0.0) if data else 0.0
            reply = f"🚫 Số đơn bị hủy là **{cancelled}** đơn (Tỷ lệ hủy: **{rate}%**)."
            suggested = [
                "Hôm nay bán được bao nhiêu đơn rồi?",
                "Doanh thu hôm nay đạt bao nhiêu?",
                "Quán đông khách nhất lúc mấy giờ?",
                "Tóm tắt nhanh tình hình kinh doanh hôm nay",
            ]
            presentation = {"type": "text"}

        # 12. Tăng trưởng so với tuần trước
        elif intent == "GROWTH_COMPARISON":
            rate = data.get("growth_rate", 0.0) if data else 0.0
            cur = data.get("current", 0.0) if data else 0.0
            prev = data.get("previous", 0.0) if data else 0.0
            icon = "📈 Tăng" if rate >= 0 else "📉 Giảm"
            reply = (
                f"📊 **So sánh doanh thu tuần này với tuần trước:**\n"
                f"- Tuần này: {cur:,.0f} VNĐ\n"
                f"- Tuần trước: {prev:,.0f} VNĐ\n"
                f"➔ Biến động: **{icon} {abs(rate)}%**"
            )
            suggested = [
                "Dự báo doanh thu tuần tới thế nào?",
                "Quán đang lời hay lỗ bao nhiêu?",
                "Top món bán chạy nhất đợt này?",
                "Giá trị trung bình mỗi đơn có tăng không?",
                "Gợi ý chương trình khuyến mãi tăng doanh số",
            ]
            presentation = {"type": "kpi_card", "highlight": f"{rate}%"}

        # 13. Tỷ suất lợi nhuận
        elif intent == "PROFIT_MARGIN_QUERY":
            margin = float(data.get("profit_margin", 0.0)) if data else 0.0
            profit = float(data.get("profit", 0.0)) if data else 0.0
            reply = (
                f"📈 **Tỷ suất lợi nhuận đạt:** **{margin}%** (Lợi nhuận ròng: **{profit:,.0f} VNĐ**).\n\n"
                f"💡 Mức biên lợi nhuận trên 25% là tín hiệu rất tích cực cho mô hình kinh doanh hiện tại."
            )
            suggested = [
                "Chi phí trong thời gian này là bao nhiêu?",
                "Top món mang lại lợi nhuận cao nhất?",
                "Doanh thu tuần này tăng hay giảm?",
                "Dự báo doanh thu những ngày tới",
            ]
            presentation = {"type": "kpi_card", "highlight": f"{margin}%"}

        # 14. Gợi ý chương trình khuyến mãi
        elif intent == "PROMOTION_SUGGESTION":
            combos = data.get("combos", []) if data else []
            if combos:
                c_str = "\n".join([f"- Combo: **{c.get('antecedents')}** kèm **{c.get('consequents')}**" for c in combos])
                reply = f"🎁 **Chiến lược khuyến mãi từ dữ liệu Apriori:**\n{c_str}\n\n💡 Nên giảm 5-10% khi mua cả cặp món này để kích cầu bán chéo."
            else:
                reply = "🎁 Đề xuất tặng voucher giảm giá 10% cho các khung giờ vắng khách để kích cầu."
            suggested = [
                "Món nào đang bán chậm, ế khách cần xả hàng?",
                "Top món bán chạy nhất đợt này?",
                "Khung giờ nào vắng khách nhất?",
                "Dự báo doanh thu sau khuyến mãi",
            ]
            presentation = {"type": "text"}

        # 15. Báo cáo tổng quan Dashboard
        elif intent == "SUMMARY_REPORT":
            rev = float(data.get("revenue", 0.0)) if data else 0.0
            prof = float(data.get("profit", 0.0)) if data else 0.0
            orders = int(data.get("orders", 0)) if data else 0
            reply = (
                f"📋 **Báo cáo kinh doanh nhanh:**\n"
                f"- Doanh thu: **{rev:,.0f} VNĐ**\n"
                f"- Số đơn hàng: **{orders}** đơn\n"
                f"- Lợi nhuận ước tính: **{prof:,.0f} VNĐ**\n\n"
                f"Tình hình hoạt động đang diễn ra bình thường."
            )
            suggested = [
                "Quán đông khách nhất lúc mấy giờ?",
                "Top món bán chạy nhất hôm nay?",
                "Dự báo doanh thu tuần tới thế nào?",
                "Doanh thu tuần này so với tuần trước tăng hay giảm?",
                "Có món nào sắp hết hàng trong kho không?",
            ]
            presentation = {"type": "profit_card", "highlight": f"{rev:,.0f} VNĐ"}

        # 16. Dự báo Doanh thu Chuỗi thời gian (Forecasting)
        elif intent == "REVENUE_FORECAST":
            if not data or not isinstance(data, dict):
                reply = (
                    "📈 **Dự báo Doanh thu (Chuỗi thời gian):**\n\n"
                    "Chưa đủ dữ liệu lịch sử bán hàng theo ngày để chạy mô hình dự báo chính xác.\n"
                    "💡 *Gợi ý:* Hãy duy trì bán hàng và hoàn tất đơn hàng đều đặn để kích hoạt dự báo."
                )
                presentation = {"type": "text"}
            else:
                forecast_items = data.get("forecast") or data.get("predictions") or []
                if isinstance(forecast_items, list) and len(forecast_items) > 0:
                    forecast_lines = [
                        f"  • {item.get('date') or item.get('day') or 'Ngày tiếp theo'}: ~**{float(item.get('revenue') or item.get('predicted_revenue') or 0.0):,.0f} VNĐ**"
                        for item in forecast_items[:3]
                    ]
                    reply = (
                        "📈 **Dự báo Doanh thu tương lai (Mô hình chuỗi thời gian):**\n\n"
                        + "\n".join(forecast_lines)
                        + "\n\n💡 *Hành động đề xuất:* Bạn nên chuẩn bị trước lượng nguyên vật liệu và nhân sự phù hợp cho các ngày cao điểm."
                    )
                else:
                    reply = "📈 Doanh thu những ngày tới dự kiến duy trì ổn định. Hãy chủ động chuẩn bị nguyên liệu trước cuối tuần."
                presentation = {"type": "forecast_chart", "data": data}
            suggested = [
                "Cần chuẩn bị nguyên liệu món nào nhiều nhất?",
                "Doanh thu tuần này so với tuần trước tăng hay giảm?",
                "Quán đông khách nhất vào khung giờ nào?",
                "Gợi ý combo món kèm để tăng doanh số",
                "Xem tình hình chi phí tuần này",
            ]

        # 17. Nhóm Khách hàng / Phân cụm RFM (K-Means)
        elif intent == "CUSTOMER_CLUSTERING":
            total_rev = float(data.get("total_revenue") or 0.0) if isinstance(data, dict) else 0.0
            total_orders = int(data.get("total_orders") or 0) if isinstance(data, dict) else 0
            reply = (
                "👥 **Tổng quan Khách hàng & Kinh doanh:**\n\n"
                f"- Tổng doanh thu ghi nhận: **{total_rev:,.0f} VNĐ** qua **{total_orders} đơn hàng**.\n"
                "- Nhóm khách hàng thân thiết đóng góp phần lớn doanh số.\n\n"
                "💡 *Gợi ý:* Triển khai chương trình tích điểm hoặc tặng voucher cho khách hàng quay lại."
            )
            suggested = [
                "Khách quen hay khách mới mua nhiều hơn?",
                "Giá trị trung bình mỗi đơn là bao nhiêu?",
                "Gợi ý combo món kèm cho khách quen",
                "Hôm nay bán được bao nhiêu đơn rồi?",
                "Doanh thu tháng này thế nào?",
            ]
            presentation = {"type": "customer_segments"}

        # Mặc định (Greeting / Fallback)
        else:
            reply = (
                "Xin chào! Tôi là Trợ lý AI Cố vấn Kinh doanh. Bạn có thể hỏi tôi về "
                "Doanh thu, Chi phí, Lợi nhuận, Top món bán chạy, Giờ cao điểm, Tồn kho hoặc Dự báo tương lai."
            )
            suggested = [
                "Tóm tắt nhanh tình hình kinh doanh hôm nay",
                "Hôm nay bán được bao nhiêu đơn rồi?",
                "Quán đang lời hay lỗ bao nhiêu?",
                "Quán thường đông khách nhất vào khung giờ nào?",
                "Top món bán chạy nhất đợt này?",
                "Có món nào sắp hết hàng trong kho không?",
                "Dự báo doanh thu tuần tới thế nào?",
                "Gợi ý combo món kèm để tăng doanh số",
            ]
            presentation = {"type": "welcome"}

        return {
            "reply": reply,
            "presentation": presentation,
            "suggested_questions": suggested,
        }