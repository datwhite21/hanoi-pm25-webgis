# ĐẶC TẢ THIẾT KẾ GIAO DIỆN VÀ TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX DESIGN SPECIFICATION)
## Dự án: Hanoi PM2.5 GIS (Lấy cảm hứng tương tác từ Windy.com)

**Phiên bản:** 1.0 (Giai đoạn 2)  
**Ngày cập nhật:** 28/10/2026

---

## 1. Triết lý Thiết kế Chủ đạo (Design Philosophy)

1. **Bản đồ là Trung tâm (Map-First Fullscreen Canvas):**
   - Bản đồ tương tác **MapLibre GL JS** chiếm **100% diện tích màn hình (`100vw × 100vh`)**.
   - Toàn bộ thanh công cụ (Header, Sidebar chọn lớp, Timeline, Legend, Popup, Drawer phân tích) được thiết kế dưới dạng các **khối nổi bán trong suốt (Floating Glassmorphism Panels: `backdrop-blur-md bg-slate-900/85 border border-slate-700/60 text-slate-100`)** lấy cảm hứng từ phong cách hiện đại của **Windy.com**, giúp bản đồ Hà Nội luôn rộng thoáng và sắc nét.
2. **PM2.5 là Trái tim của Hệ thống:**
   - Mặc dù kế thừa phong cách tương tác mượt mà của Windy.com, **bụi mịn PM2.5 (`µg/m³`) luôn là lớp dữ liệu mặc định và nổi bật nhất**.
   - Các yếu tố khí tượng (Gió, Nhiệt độ, Độ ẩm, Mưa, Áp suất) đóng vai trò lớp hỗ trợ để giải thích nguyên nhân tích tụ hoặc phát tán PM2.5 tại Hà Nội.
3. **Trung thực Thị giác (Visual Data Honesty):**
   - **Điểm trạm quan trắc thực tế (`OBSERVED`):** Hiển thị bằng huy hiệu tròn/vòng có tâm phát sáng (Đối với trạm `FRESH` đang hoạt động), viền nét đứt màu vàng/cam (Đối với trạm `DELAYED` / `STALE`), và chấm xám mờ (Đối với trạm `UNAVAILABLE` chỉ có dữ liệu lịch sử).
   - **Lớp lưới mô hình CAMS Global (`MODELED`):** Hiển thị đúng cấu trúc ô lưới độ phân giải `0.4° × 0.4° (~40 km)` hoặc lớp chuyển sắc độ phân giải thô kèm huy hiệu cảnh báo rõ trên màn hình: *"Lớp nền: Mô hình CAMS Global (~40 km) — Không phải số đo chi tiết cấp phường"*.

---

## 2. Hệ Thống Bảng Màu Chuẩn Khoa Học cho PM2.5 & VN_AQI

Hệ thống sử dụng thang màu chuẩn hóa theo **Quyết định 1459/QĐ-TCMT (VN_AQI)** kết hợp **QCVN 05:2023/BTNMT (`50 µg/m³`)** và **WHO (`15 µg/m³`)**:

| Mức độ cảnh báo | Khoảng PM2.5 (`µg/m³`) | Khoảng `VN_AQI` | Mã màu Chính (Hex) | Mã màu Nền Huy Hiệu | Khuyến cáo sức khỏe ngắn gọn |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tốt (Good)** | `0.0 – 25.0` | `0 – 50` | `#10B981` (Emerald 500) | `rgba(16, 185, 129, 0.2)` | Chất lượng không khí tốt, tự do hoạt động ngoài trời. _(Lưu ý: Nếu `> 15 µg/m³` đã vượt ngưỡng khuyến nghị năm/24h của WHO)_. |
| **Trung bình (Moderate)** | `25.1 – 50.0` | `51 – 100` | `#FACC15` (Yellow 400) | `rgba(250, 204, 21, 0.2)` | Nằm trong giới hạn QCVN 05:2023/BTNMT (`50 µg/m³`). Nhóm rất nhạy cảm nên giảm vận động mạnh. |
| **Kém (Unhealthy for Sensitive)** | `50.1 – 80.0` | `101 – 150` | `#F97316` (Orange 500) | `rgba(249, 115, 22, 0.2)` | **Vượt quy chuẩn QCVN 05:2023/BTNMT!** Trẻ em, người già, người bệnh hô hấp hạn chế ra ngoài. |
| **Xấu (Unhealthy)** | `80.1 – 150.0` | `151 – 200` | `#EF4444` (Red 500) | `rgba(239, 68, 68, 0.25)` | Mọi người bắt đầu bị ảnh hưởng sức khỏe; đeo khẩu trang chống bụi mịn N95/KN95 khi ra đường. |
| **Rất xấu (Very Unhealthy)** | `150.1 – 250.0` | `201 – 300` | `#A855F7` (Purple 500) | `rgba(168, 85, 247, 0.25)` | Cảnh báo khẩn cấp về sức khỏe; tránh mọi hoạt động thể lực ngoài trời, đóng cửa sổ. |
| **Nguy hại (Hazardous)** | `> 250.0` | `301 – 500` | `#881337` (Rose 900) | `rgba(136, 19, 55, 0.35)` | Tình trạng báo động; toàn bộ người dân nên ở trong nhà có lọc không khí. |

---

## 3. Sơ đồ Bố cục Giao diện Màn hình Chính (Desktop & Mobile Wireframe)

```text
+--------------------------------------------------------------------------------------------------+
| [Logo] HANOI PM2.5 GIS | [🔍 Tìm xã/phường, địa điểm Hà Nội...] | [⏱️ Đo mới nhất: 17:35] [Nguồn: 3/3 OK] [Phân tích & Cảnh báo] [Đăng nhập] |
+--------------------------------------------------------------------------------------------------+
|                                                                                      [LỚP BẢN ĐỒ]|
|   +-----------------------------------------+                                        (o) PM2.5   |
|   | 📍 TRẠM: Công viên Nhân Chính           |                                        ( ) PM10    |
|   | Nguồn: Hanoi AQ Monitoring Network      |          BẢN ĐỒ TOÀN MÀN HÌNH          ( ) VN_AQI  |
|   | PM2.5: 33.60 µg/m³  [Trung bình]        |            MAPLIBRE GL JS              ----------- |
|   | Thời điểm đo: 17:35 (Cách đây 24 phút)  |         (Trung tâm: TP. Hà Nội)        [x] Trạm đo |
|   | Trạng thái: [● FRESH]  QC: [VALID]      |                                        [x] Mô hình |
|   | [Biểu đồ xu hướng 24h mini]             |       (Hạt gió chuyển động mượt)       [x] Gió     |
|   | [So sánh trạm này] [Xem phân tích sâu]  |                                        [ ] Nhiệt độ|
|   +-----------------------------------------+                                        [ ] Độ ẩm   |
|                                                                                      [ ] Lượng mưa|
|                                                                                      [x] Ranh giới|
+--------------------------------------------------------------------------------------------------+
| [▶️ Phát] [⏮️ -1h] [⏭️ +1h] | 26/10 ---- 27/10 ---- [● 28/10 17:00 LIVE] ---- 29/10 ---- 30/10 | [Thang màu PM2.5 µg/m³: 0 | 25 | 50 | 80 | 150 | 250+] |
+--------------------------------------------------------------------------------------------------+
```

### Quy tắc Chuyển đổi Đáp ứng (Responsive Breakpoints):
1. **Desktop & Laptop (`\ge 1024px`):**
   - Header nổi phía trên, Sidebar chọn lớp nổi bên phải, Popup chi tiết nổi bên trái, Timeline nổi phía dưới cùng Legend.
2. **Tablet (`768px – 1023px`):**
   - Sidebar thu gọn thành thanh icon kèm nhãn ngắn; Drawer phân tích mở dạng trượt nửa màn hình.
3. **Mobile (`< 768px`):**
   - Sidebar thu gọn thành nút nổi (FAB) hoặc cuộn ngang;
   - **Popup Trạm & Popup Vị trí bất kỳ** tự động chuyển thành **Bottom Sheet** trượt từ dưới lên để dễ thao tác bằng một ngón tay;
   - **Timeline** rút gọn còn nút `Play/Pause`, thanh trượt giờ và nhãn thời gian hiện tại.
