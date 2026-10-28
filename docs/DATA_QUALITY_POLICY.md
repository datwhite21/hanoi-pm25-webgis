# CHÍNH SÁCH KIỂM SOÁT CHẤT LƯỢNG DỮ LIỆU (DATA QUALITY POLICY)
## Dự án: Hanoi PM2.5 GIS

**Ngày ban hành:** 28/10/2026  
**Phạm vi áp dụng:** Toàn bộ luồng thu thập dữ liệu (Ingestion Workers), cơ sở dữ liệu PostgreSQL/PostGIS, công cụ phân tích không gian - thời gian, và giao diện WebGIS.

---

## 1. Quy trình xử lý dữ liệu chuẩn (8 Bước)

Mọi gói dữ liệu từ các nguồn bên ngoài bắt buộc đi qua pipeline 8 bước tuần tự:

```text
[1. Fetch] → [2. Validate] → [3. Normalize] → [4. Quality Check (QC)] 
     → [5. Deduplicate] → [6. Store (PostGIS)] → [7. Analyze & Alert] → [8. Publish (API/SSE)]
```

1. **Fetch (Thu thập):** Gọi API nguồn với timeout chặt chẽ (10 giây), cơ chế retry có backoff (tối đa 3 lần khi lỗi mạng/5xx) và tôn trọng giới hạn Rate Limit (`429 Too Many Requests`).
2. **Validate (Xác thực cấu trúc):** Sử dụng **Zod Schema** để kiểm tra kiểu dữ liệu, trường bắt buộc (`station_id`, `measured_at`, `value`, `unit`, `coordinates`).
3. **Normalize (Chuẩn hóa):**
   - **Thời gian:** Chuyển đổi mọi timestamp về chuẩn **UTC (`TIMESTAMPTZ`)** trong cơ sở dữ liệu; chỉ chuyển sang múi giờ Việt Nam (`Asia/Bangkok`, `UTC+7`) ở tầng hiển thị hoặc báo cáo.
   - **Đơn vị:** Nồng độ bụi mịn PM2.5 và PM10 bắt buộc chuẩn hóa về **`µg/m³`**. Nếu nguồn chỉ cung cấp chỉ số con AQI (như WAQI `iaqi.pm25.v`), lưu vào cột riêng `raw_aqi_subindex` và gắn nhãn `value_origin = 'AQI_SUBINDEX'`, tuyệt đối không ghi trực tiếp vào cột nồng độ `pm25_ugm3` mà không có cờ phân biệt.
   - **Hệ tọa độ:** Chuẩn hóa về `WGS84 (EPSG:4326)`, định dạng `POINT(longitude latitude)` trong PostGIS.
4. **Quality Check — QC (Kiểm tra chất lượng khoa học):** Gán cờ chất lượng (`quality_flag`) dựa trên bộ quy tắc ở Mục 2, giữ nguyên giá trị gốc trong trường `raw_value` và `raw_payload`.
5. **Deduplicate (Khử trùng lặp):** Sử dụng khóa duy nhất `(sensor_id, measured_at_utc)` để ngăn chặn việc lưu trùng bản ghi khi worker chạy lặp lại giữa hai chu kỳ đo của trạm.
6. **Store (Lưu trữ):** Ghi vào PostgreSQL/PostGIS trong giao dịch (Transaction) an toàn kèm `ingestion_job_id`.
7. **Analyze & Alert (Phân tích & Cảnh báo):** Chỉ sử dụng các bản ghi có `quality_flag = 'VALID'` (hoặc `'HIGH_CONCENTRATION_VERIFIED'`) để kích hoạt cảnh báo ô nhiễm vượt ngưỡng; các bản ghi `'SUSPECT'` hoặc `'INVALID'` sẽ kích hoạt **Cảnh báo kỹ thuật (Data Anomaly Alert)** cho quản trị viên.
8. **Publish (Công bố):** Đẩy sự kiện cập nhật xuống Frontend kèm trạng thái độ tươi (`Fresh` / `Delayed` / `Stale` / `Unavailable`).

---

## 2. Bộ quy tắc gán cờ chất lượng dữ liệu PM2.5 (`quality_flag`)

> [!IMPORTANT]
> **Nguyên tắc bất di bất dịch (Quy tắc 11 — Master Prompt):** Hệ thống **KHÔNG TỰ Ý SỬA** giá trị bất thường và **KHÔNG THAY THẾ** dữ liệu thiếu bằng giá trị nội suy/ngẫu nhiên giả. Mọi bản ghi đều lưu giá trị gốc (`raw_value`) và được phân loại bằng cờ `quality_flag`.

| Mã cờ (`quality_flag`) | Điều kiện áp dụng cho PM2.5 (`µg/m³`) | Hành vi của hệ thống |
| :--- | :--- | :--- |
| `VALID` | `0.0 < pm25 <= 500.0 µg/m³`, tọa độ nằm trong phạm vi hợp lệ, timestamp hợp lệ (`measured_at <= now + 5 phút`). | Hiển thị bình thường trên bản đồ, đưa vào tính trung bình thời gian và cảnh báo ô nhiễm. |
| `HIGH_EXTREME` | `500.0 < pm25 <= 1000.0 µg/m³` (Có thể xảy ra trong đợt nghịch nhiệt cực đoan hoặc đốt rơm rạ/cháy cục bộ sát cảm biến). | Hiển thị kèm biểu tượng cảnh báo kiểm chứng; yêu cầu đối chiếu với trạm lân cận hoặc giờ liền trước trước khi đưa vào trung bình khu vực. |
| `SUSPECT_SPIKE` | Giá trị tăng đột biến `> 300 µg/m³` chỉ trong 1 giờ rồi giảm ngay ở giờ kế tiếp, hoặc bằng đúng `0.0 µg/m³` liên tục nhiều giờ (dấu hiệu kẹt cảm biến). | Lưu vào DB để truy vết, gắn nhãn *"Dữ liệu nghi vấn cảm biến"* trên popup chi tiết, loại khỏi phép tính trung bình chuẩn nếu chưa xác nhận. |
| `INVALID_NEGATIVE` | `pm25 < 0.0 µg/m³` (Lỗi hiệu chuẩn đường nền của cảm biến). | Không hiển thị làm nồng độ hiện tại; giữ trong DB kèm `raw_value` để kiểm toán kỹ thuật. |
| `INVALID_OUT_OF_RANGE` | `pm25 > 1000.0 µg/m³` (Vượt giới hạn đo vật lý thông thường của cảm biến quang học/BAM). | Không hiển thị làm giá trị hợp lệ trên bản đồ; tạo cảnh báo lỗi dữ liệu (`DATA_ANOMALY`). |
| `INVALID_TIMESTAMP` | Thiếu timestamp, sai định dạng ISO-8601, hoặc timestamp nằm ở tương lai (`> now + 5 phút`). | Từ chối đưa vào chuỗi thời gian chuẩn; ghi nhận vào bảng `audit_logs` / `ingestion_jobs`. |
| `OUTSIDE_STUDY_AREA` | Tọa độ trạm nằm ngoài vùng đệm mở rộng của Hà Nội (`ST_DWithin` > 15 km so với ranh giới Thành phố Hà Nội). | Không tính vào thống kê nội bộ của Thành phố Hà Nội; chỉ hiển thị nếu người dùng bật lớp "Trạm vùng lân cận". |

---

## 3. Quy định phân loại trạng thái độ tươi dữ liệu (`data_freshness_status`)

Theo Mục 14 của Master Prompt, mỗi trạm quan trắc và mỗi nguồn dữ liệu mô hình phải được tính toán trạng thái độ tươi theo thời gian thực dựa trên độ trễ $\Delta t = \text{now} - \text{measured\_at\_utc}$:

| Trạng thái | Ngưỡng thời gian đối với Trạm quan trắc (`OpenAQ` / `WAQI`) | Ngưỡng thời gian đối với Mô hình (`Open-Meteo CAMS`) | Quy tắc hiển thị trên giao diện WebGIS |
| :--- | :--- | :--- | :--- |
| **`FRESH` (Mới)** | $\Delta t \le 90 \text{ phút}$ | Phiên chạy mô hình trong vòng $\le 12 \text{ giờ}$ | Hiển thị màu sắc chuẩn theo thang PM2.5/AQI, huy hiệu xanh *"Đang hoạt động (Fresh)"*. |
| **`DELAYED` (Trễ nhẹ)** | $90 \text{ phút} < \Delta t \le 3 \text{ giờ}$ | $12 \text{ giờ} < \Delta t \le 24 \text{ giờ}$ | Hiển thị giá trị kèm viền cảnh báo vàng và ghi chú rõ *"Dữ liệu đo cách đây X giờ"*. |
| **`STALE` (Dữ liệu cũ)** | $3 \text{ giờ} < \Delta t \le 24 \text{ giờ}$ | $\Delta t > 24 \text{ giờ}$ | Làm mờ biểu tượng trạm trên bản đồ (giảm độ bão hòa màu), hiển thị nhãn cam *"Dữ liệu cũ (Stale)"*, **không dùng để phát cảnh báo thời gian thực hiện tại**. |
| **`UNAVAILABLE` (Mất tín hiệu)** | $\Delta t > 24 \text{ giờ}$ hoặc trạm chưa từng có dữ liệu | API mô hình ngừng phản hồi và hết hạn dữ liệu dự báo | Hiển thị biểu tượng trạm màu xám (`N/A`), khi nhấn vào vẫn xem được lịch sử cũ nhưng ghi rõ *"Trạm ngừng gửi dữ liệu từ [Thời điểm]"*. |

---

## 4. Phân biệt độ tin cậy nguồn và loại thiết bị quan trắc

Trong bảng `monitoring_stations` và `sensors`, hệ thống bắt buộc phân loại rõ cấp độ thiết bị (`equipment_grade`) để giải thích khoa học trong đồ án:

1. **`REFERENCE_GRADE` (Trạm chuẩn tham chiếu quốc gia / Đại sứ quán):** Sử dụng phương pháp hấp thụ tia Beta (BAM) hoặc TEOM (ví dụ: Trạm ĐSQ Mỹ tại Láng Hạ, trạm chuẩn 556 Nguyễn Văn Cừ). Độ chính xác cao nhất, là mốc chuẩn đối chiếu.
2. **`LOW_COST_SENSOR` (Trạm cảm biến quang học chi phí thấp / Cộng đồng):** Sử dụng nguyên lý tán xạ laser (Laser Scattering), nhạy với độ ẩm không khí cao (khi độ ẩm $> 85\%$ dễ đọc cao hơn thực tế nếu chưa hiệu chỉnh ẩm).
3. **`NUMERICAL_MODEL` (Dữ liệu mô hình số trị — CAMS Global / Open-Meteo):** Dữ liệu tính toán từ mô hình hóa học khí quyển kết hợp viễn thám vệ tinh trên ô lưới ~40 km. Không phải phép đo trực tiếp tại mặt đất.

