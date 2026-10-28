# PHẠM VI DỰ ÁN (PROJECT SCOPE)
## Dự án: Hanoi PM2.5 GIS

**Tên đề tài tiếng Việt:** Xây dựng hệ thống WebGIS giám sát, phân tích và cảnh báo ô nhiễm bụi mịn PM2.5 gần thời gian thực trên địa bàn thành phố Hà Nội  
**Tên đề tài tiếng Anh:** Development of a Near-Real-Time WebGIS System for PM2.5 Air Pollution Monitoring, Spatial Analysis and Warning in Hanoi  
**Tên ứng dụng:** Hanoi PM2.5 GIS

---

## 1. Phạm vi Địa lý & Không gian (Geographic Scope)

- **Khu vực nghiên cứu:** Toàn bộ lãnh thổ hành chính Thành phố Hà Nội (diện tích ~3.359,8 km², tọa độ bao quanh: `20.56°N – 21.39°N`, `105.28°E – 106.02°E`).
- **Cấp độ hành chính hỗ trợ:**
  1. Cấp Thành phố (`ADM1`: Thành phố Hà Nội).
  2. Cấp Quận / Huyện / Thị xã (`ADM2`).
  3. Cấp Xã / Phường / Thị trấn hiện hành (`ADM3`) kèm metadata ngày hiệu lực (`effective_date`) và nguồn dữ liệu GIS.
- **Không giới hạn ở các quận nội thành:** Mọi khu vực ngoại thành (Ba Vì, Sóc Sơn, Mỹ Đức, Phú Xuyên, Đông Anh, Gia Lâm,...) đều có thể tìm kiếm, nhấp chọn trên bản đồ, truy vấn khoảng cách tới trạm quan trắc gần nhất và xem dữ liệu lưới mô hình CAMS Global / khí tượng Open-Meteo.

---

## 2. Phạm vi Dữ liệu & Đối tượng Nghiên cứu (Thematic Scope)

1. **Đối tượng trung tâm (Core Subject):**
   - **Bụi mịn PM2.5** (đơn vị chuẩn: `µg/m³`).
   - Phân biệt rõ ràng 3 loại hình dữ liệu PM2.5 trên giao diện và trong cơ sở dữ liệu:
     - **Quan trắc thực tế (`OBSERVED`):** Đo trực tiếp tại trạm mặt đất (OpenAQ v3 / Admin Import), hiển thị dưới dạng điểm trạm (`Point`).
     - **Chỉ số đối chiếu (`DERIVED_INDEX`):** Chỉ số con AQI từ WAQI (gắn nhãn rõ ràng, không đánh đồng với nồng độ `µg/m³` gốc).
     - **Mô hình & Dự báo (`MODELED` / `FORECAST`):** Lưới mô hình CAMS Global từ Open-Meteo (độ phân giải ~40 km), hiển thị dưới dạng lưới ô/lớp phủ mô hình.
2. **Đối tượng bổ trợ (Supporting Parameters):**
   - Bụi **PM10** (`µg/m³`).
   - **Chỉ số chất lượng không khí (AQI):** Hỗ trợ hiển thị chỉ số theo quy chuẩn (US-EPA AQI và VN_AQI theo Quyết định 1459/QĐ-TCMT khi đủ điều kiện dữ liệu trung bình giờ/ngày).
   - **6 yếu tố khí tượng hỗ trợ giải thích xu hướng PM2.5:** Nhiệt độ (`°C`), Độ ẩm tương đối (`%`), Tốc độ gió (`km/h` hoặc `m/s`), Hướng gió (`°`), Lượng mưa (`mm`), Áp suất bề mặt (`hPa`).

---

## 3. Phạm vi Chức năng Nghiệp vụ (Functional Scope)

1. **Phân hệ Bản đồ WebGIS (Lấy cảm hứng tương tác từ Windy.com):**
   - Bản đồ toàn màn hình MapLibre GL JS tập trung vào Hà Nội.
   - Bật/tắt lớp: Điểm trạm PM2.5, Lưới mô hình PM2.5/PM10, Hướng & tốc độ gió, Nhiệt độ/Độ ẩm, Ranh giới hành chính cấp Thành phố / Quận-Huyện / Xã-Phường.
   - Thanh Timeline phía dưới cho phép xem Lịch sử (48h qua) – Hiện tại – Dự báo (72h tới) với các mốc thời gian thực có dữ liệu.
   - Popup thông minh cho Trạm quan trắc và Popup truy vấn cho Vị trí bất kỳ trên bản đồ.
2. **Phân hệ Truy vấn và Phân tích Không gian với PostGIS:**
   - Tìm trạm quan trắc gần nhất (`ST_Distance` trên kiểu `geography`).
   - Tìm các trạm trong bán kính (`ST_DWithin`) hoặc trong khung nhìn bản đồ (`ST_MakeEnvelope` / `ST_Intersects`).
   - Xác định đơn vị hành chính chứa điểm chọn (`ST_Contains` / `ST_Within`).
   - Thống kê PM2.5 theo khu vực hành chính (ghi rõ số trạm thực có trong khu vực).
3. **Phân hệ Phân tích Thời gian & Tương quan Khí tượng:**
   - Biểu đồ chuỗi thời gian theo giờ, 24 giờ, 7 ngày, 30 ngày và khoảng tùy chọn.
   - Biểu đồ phân tán / tương quan giữa PM2.5 với tốc độ gió, độ ẩm, nhiệt độ, lượng mưa.
4. **Phân hệ Cảnh báo Ô nhiễm & Cảnh báo Kỹ thuật:**
   - Cảnh báo nồng độ PM2.5 vượt ngưỡng quy chuẩn (QCVN 05:2023/BTNMT và khuyến nghị WHO).
   - Cảnh báo kỹ thuật khi trạm mất tín hiệu (`STALE`/`UNAVAILABLE`) hoặc dữ liệu bất thường (`SUSPECT_SPIKE`).
   - Cảnh báo cá nhân hóa cho địa điểm yêu thích của người dùng đăng ký.
5. **Phân hệ So sánh Khu vực & Xuất Báo cáo (CSV / PDF):**
   - So sánh song song 2 hoặc nhiều trạm/khu vực.
   - Xuất bảng dữ liệu CSV và báo cáo tổng hợp PDF phục vụ nghiên cứu.
6. **Phân hệ Người dùng & Quản trị hệ thống (RBAC):**
   - 3 vai trò: Khách (`GUEST`), Người dùng đăng ký (`USER`), Quản trị viên (`ADMIN`).
   - Quản trị viên quản lý danh mục trạm, nguồn dữ liệu, cấu hình ngưỡng cảnh báo, theo dõi nhật ký đồng bộ (`ingestion_jobs`), và nhập dữ liệu kiểm định (có lưu vết `audit_logs`, bảo toàn dữ liệu gốc).

---

## 4. Các giới hạn nằm ngoài phạm vi (Out of Scope / Non-Goals)

- Không biến hệ thống thành cổng dự báo thời tiết tổng hợp đa mục đích (mọi yếu tố thời tiết chỉ phục vụ giải thích sự khuếch tán/tích tụ bụi mịn PM2.5).
- Không tự chế tạo phần cứng cảm biến IoT vật lý (hệ thống thu thập qua API chuẩn và hỗ trợ chuẩn webhook/import cho trạm mới).
- Không thực hiện nội suy không gian giả tạo ở những vùng không có trạm đo để đánh lừa người xem về độ chi tiết cấp xã/phường.
- Không cào (scrape) trái phép các website không cấp quyền khai thác tự động.

