# ĐẶC TẢ YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)
## Dự án: Hanoi PM2.5 GIS

**Phiên bản:** 1.0 (Giai đoạn 1)  
**Ngày cập nhật:** 28/10/2026

---

## 1. Tính Trung thực Khoa học & Minh bạch Dữ liệu (`NFR-SCI`)

1. **`NFR-SCI-01` (Không làm giả dữ liệu):** Tuyệt đối không sinh số ngẫu nhiên cho nồng độ PM2.5 trong môi trường vận hành. Nếu trạm ngừng gửi dữ liệu (như 32 trạm lịch sử trên OpenAQ Hà Nội), hệ thống hiển thị đúng trạng thái `UNAVAILABLE` kèm thời điểm đo cuối cùng trong quá khứ.
2. **`NFR-SCI-02` (Không nội suy độ chi tiết giả):** Không sử dụng thuật toán nội suy không gian từ số ít trạm nội thành để gán giá trị đo thực tế cho các xã/phường ngoại thành xa (như Ba Vì, Mỹ Đức, Sóc Sơn). Lớp phủ diện rộng bắt buộc ghi rõ là **Dữ liệu mô hình CAMS Global (~40 km)**.
3. **`NFR-SCI-03` (Phân tách đơn vị đo):** Không bao giờ hiển thị chỉ số con US-EPA AQI của WAQI (`iaqi.pm25.v`) dưới nhãn đơn vị `µg/m³` nếu chưa qua bước chuyển đổi có gắn cờ `is_derived_from_aqi = true`.
4. **`NFR-SCI-04` (Minh bạch 5 mốc thời gian):** Lưu trữ đầy đủ `measured_at_utc`, `published_at_utc`, `fetched_at_utc`, `stored_at_utc` trong CSDL dưới dạng `TIMESTAMPTZ` (UTC) và hiển thị theo múi giờ Việt Nam (`UTC+7`).

---

## 2. Hiệu năng & Khả năng Phản hồi (`NFR-PERF`)

1. **`NFR-PERF-01` (Thời gian phản hồi API):**
   - Các API truy vấn trạng thái hiện tại (`/api/v1/pm25/latest`, `/api/v1/stations`, `/api/v1/alerts`) phải phản hồi trong thời gian **$< 500\text{ ms}$** (ở phân vị P95 khi kết nối CSDL ấm).
   - Các API truy vấn không gian PostGIS (`ST_Distance`, `ST_Within`, `ST_Intersects`) bắt buộc sử dụng chỉ mục không gian **`GIST`** và chỉ mục thời gian **`BTREE (sensor_id, measured_at_utc DESC)`**.
2. **`NFR-PERF-02` (Hiệu năng kết xuất Bản đồ WebGIS):**
   - Khung hình bản đồ MapLibre GL JS đạt tốc độ mượt mà ($\ge 30\text{–}60\text{ FPS}$) khi bật đồng thời lớp ranh giới hành chính, lớp điểm trạm và lớp phủ mô hình.
   - Dữ liệu GeoJSON ranh giới hành chính phải được tối ưu hóa đỉnh hình học (simplify hợp lý khi ở mức zoom nhỏ) và cache tại trình duyệt.

---

## 3. Bảo mật & Toàn vẹn Dữ liệu (`NFR-SEC`)

1. **`NFR-SEC-01` (Quản lý Bí mật / Secrets):**
   - Toàn bộ khóa nhạy cảm (`OPENAQ_API_KEY`, `WAQI_API_TOKEN`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `CRON_SECRET`) chỉ được đọc từ biến môi trường ở Backend, tuyệt đối không xuất hiện trong mã nguồn Frontend (`VITE_*`) hoặc lịch sử Git.
2. **`NFR-SEC-02` (Chống tấn công Web & API):**
   - Sử dụng **Parameterized Queries** cho 100% câu lệnh SQL/PostGIS để chống SQL Injection.
   - Sử dụng **Zod** để kiểm tra (validate) toàn bộ `body`, `query`, `params` đầu vào của mọi API.
   - Cấu hình **CORS**, **Helmet**, và **Rate Limiting** (`express-rate-limit`) để bảo vệ Backend khỏi spam request.
3. **`NFR-SEC-03` (Bảo toàn dữ liệu gốc & Nhật ký kiểm toán):**
   - Bảng `pm25_observations` luôn giữ cột `raw_value` và `raw_payload`. Mọi thao tác quản trị (thêm trạm, đổi cấu hình, hiệu chỉnh cờ chất lượng) đều bắt buộc ghi vào bảng `audit_logs` kèm `actor_user_id`, `ip_address`, `old_data`, `new_data`.

---

## 4. Khả năng Tương thích Đa thiết bị & Độ tin cậy (`NFR-UX` & `NFR-REL`)

1. **`NFR-UX-01` (Responsive Design):** Giao diện hoạt động tốt trên cả màn hình máy tính (`\ge 1280px`), Laptop (`1024px`), Tablet (`768px`) và Điện thoại di động (`375px–430px` với ngăn kéo Bottom Sheet và Sidebar thu gọn).
2. **`NFR-REL-01` (Chịu lỗi khi API bên ngoài gián đoạn):** Khi một trong các nguồn bên ngoài (`OpenAQ`, `WAQI`, hoặc `Open-Meteo`) bị timeout hoặc lỗi `5xx`, Ingestion Worker phải ghi log lỗi vào `ingestion_jobs`, giữ nguyên hoạt động của các nguồn còn lại và hệ thống WebGIS vẫn phục vụ bình thường từ dữ liệu đã lưu trong PostgreSQL/PostGIS kèm trạng thái độ tươi tương ứng.
