# ĐẶC TẢ PHÂN TÍCH KHÔNG GIAN POSTGIS VÀ PHƯƠNG PHÁP TÍNH AQI KHOA HỌC
## Dự án: Hanoi PM2.5 GIS

**Phiên bản:** 1.0 (Giai đoạn 1)  
**Ngày cập nhật:** 28/10/2026

---

## 1. Đặc tả các Phép Toán Không Gian PostGIS Thực Tế (Theo mục 22 — Master Prompt)

Hệ thống bắt buộc thực thi các phép toán không gian trực tiếp trong cơ sở dữ liệu PostgreSQL/PostGIS thông qua chỉ mục `GIST`, tuyệt đối không tải toàn bộ bảng về bộ nhớ Backend để tính toán thủ công.

### 1.1. Tìm Trạm quan trắc gần nhất (`ST_Distance` + Toán tử KNN `<->`)
- **Mục đích:** Khi người dùng nhấp vào một điểm bất kỳ $(\text{lon}, \text{lat})$ trên bản đồ Hà Nội, tìm trạm quan trắc đang hoạt động (`freshness_status IN ('FRESH', 'DELAYED')`) gần nhất và tìm trạm bất kỳ gần nhất.
- **Câu lệnh PostGIS chuẩn (Tính khoảng cách thực trên mặt cầu Trái Đất bằng kiểu `geography` đơn vị mét):**
  ```sql
  SELECT
    s.id,
    s.name,
    s.provider_name,
    s.freshness_status,
    s.latitude,
    s.longitude,
    ROUND((ST_Distance(
      s.geom::geography,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
    ) / 1000.0)::numeric, 2) AS distance_km
  FROM monitoring_stations s
  WHERE s.is_within_hanoi = TRUE
  ORDER BY s.geom::geography <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
  LIMIT 5;
  ```

### 1.2. Truy vấn các Trạm trong Bán kính $R$ (`ST_DWithin`)
- **Mục đích:** Tìm tất cả các trạm quan trắc nằm trong bán kính $R$ mét (ví dụ $5000\text{ m} = 5\text{ km}$) quanh vị trí người dùng hoặc địa điểm yêu thích để phát cảnh báo cục bộ.
- **Câu lệnh PostGIS chuẩn:**
  ```sql
  SELECT
    s.id,
    s.name,
    s.freshness_status,
    ST_Distance(
      s.geom::geography,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
    ) AS distance_meters
  FROM monitoring_stations s
  WHERE ST_DWithin(
    s.geom::geography,
    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
    $3 -- radius_meters (ví dụ: 5000)
  )
  ORDER BY distance_meters ASC;
  ```

### 1.3. Xác định Đơn vị Hành chính chứa Điểm chọn (`ST_Contains` & `ST_Within`)
- **Mục đích:**
  1. Khi nạp trạm mới: kiểm tra `ST_Within(station.geom, hanoi.geom)` để xác định trạm có thực sự thuộc Thành phố Hà Nội hay không (ví dụ loại trừ trạm Việt Trì, Phú Thọ trong kết quả WAQI bbox).
  2. Khi người dùng nhấp vào bản đồ: dùng `ST_Contains(area.geom, point)` để biết điểm đó thuộc Xã/Phường (`admin_level = 3`) và Quận/Huyện (`admin_level = 2`) nào, đồng thời lấy giá trị ô lưới mô hình (`model_grid_cells.cell_polygon`) chứa điểm đó.
- **Câu lệnh PostGIS chuẩn:**
  ```sql
  SELECT
    a.id,
    a.code,
    a.name_vi,
    a.admin_level,
    p.name_vi AS parent_name_vi
  FROM administrative_areas a
  LEFT JOIN administrative_areas p ON a.parent_id = p.id
  WHERE ST_Contains(a.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
  ORDER BY a.admin_level DESC;
  ```

### 1.4. Lọc theo Khung nhìn Bản đồ / Bounding Box (`ST_Intersects` & `ST_MakeEnvelope`)
- **Mục đích:** Truy vấn nhanh các trạm và đơn vị hành chính giao cắt với khung nhìn hiện tại $[ \text{minLon}, \text{minLat}, \text{maxLon}, \text{maxLat} ]$.
- **Câu lệnh PostGIS chuẩn:**
  ```sql
  SELECT s.*
  FROM monitoring_stations s
  WHERE ST_Intersects(
    s.geom,
    ST_MakeEnvelope($1, $2, $3, $4, 4326)
  );
  ```

### 1.5. Thống kê Trạm và PM2.5 theo Khu vực Hành chính (`ST_Within` Spatial Join)
- **Nguyên tắc giải thích khoa học bắt buộc (Mục 22 — Master Prompt):**
  Số liệu thống kê của một Quận/Huyện/Xã/Phường là **thống kê điểm của các trạm quan trắc đặt bên trong ranh giới đó (`station_count_in_area`)**, không mặc định là giá trị trung bình đại diện đều cho toàn bộ diện tích nếu khu vực có ít hoặc không có trạm. Nếu `active_station_count = 0`, API trả về `observed_avg_pm25 = null` và cung cấp riêng trường `model_grid_pm25` (từ ô lưới CAMS Global giao cắt `ST_Intersects` với khu vực đó) kèm nhãn rõ ràng.

---

## 2. Cơ sở Khoa học về Quy chuẩn PM2.5 và Phương pháp Tính Chỉ số AQI (Theo mục 25 — Master Prompt)

### 2.1. Ngưỡng Quy chuẩn Kỹ thuật Quốc gia về Chất lượng Không khí Xung quanh (QCVN 05:2023/BTNMT & WHO 2021)

| Tiêu chuẩn | Trung bình 24 giờ (`24h Average`) | Trung bình Năm (`Annual Average`) | Ý nghĩa áp dụng trong hệ thống Cảnh báo |
| :--- | :--- | :--- | :--- |
| **QCVN 05:2023/BTNMT (Việt Nam)** | **`50 µg/m³`** | **`25 µg/m³`** | Ngưỡng pháp lý chính thức tại Việt Nam để phát cảnh báo vượt quy chuẩn quốc gia. |
| **Khuyến nghị WHO (2021)** | **`15 µg/m³`** | **`5 µg/m³`** | Ngưỡng tham chiếu bảo vệ sức khỏe dài hạn theo Tổ chức Y tế Thế giới. |

### 2.2. Phương pháp tính Chỉ số Chất lượng Không khí Việt Nam (`VN_AQI`) cho thông số PM2.5
Theo **Quyết định số 1459/QĐ-TCMT ngày 12/11/2019 của Tổng cục Môi trường (Bộ TN&MT)** về Hướng dẫn kỹ thuật tính toán và công bố chỉ số chất lượng không khí Việt Nam (`VN_AQI`):

1. **Điều kiện dữ liệu đối với PM2.5:**
   - Trong tính toán `VN_AQI` giờ cho thông số bụi PM2.5 và PM10, quy định sử dụng giá trị **trung bình trượt NowCast** (cập nhật theo từng giờ dựa trên 12 giờ liên tiếp gần nhất, trong đó bắt buộc phải có **ít nhất 2 trên 3 giờ gần nhất** có số liệu hợp lệ).
   - Công thức NowCast cho chuỗi 12 giờ $c_1, c_2, \dots, c_{12}$ (với $c_1$ là giờ gần nhất):
     - Tính tỷ lệ biến thiên $w^* = \frac{c_{\min}}{c_{\max}}$, hệ số trọng số $w = \max(w^*, 0.5)$.
     - Giá trị NowCast:
       $$\text{NowCast} = \frac{\sum_{i=1}^{12} w^{i-1} c_i}{\sum_{i=1}^{12} w^{i-1}}$$
   - **Quy tắc trung thực dữ liệu trong hệ thống:** Nếu một trạm chưa đủ lịch sử tối thiểu (ít nhất 2/3 giờ gần nhất) để tính NowCast hợp lệ theo Quyết định 1459/QĐ-TCMT, hệ thống sẽ ghi rõ trạng thái `vn_aqi_status = 'INSUFFICIENT_HISTORical_HOURS_FOR_NOWCAST'` và chỉ hiển thị **Nồng độ tức thời `µg/m³`** (hoặc ước tính tham khảo theo nồng độ 1 giờ có gắn nhãn rõ ràng), tuyệt đối không tự bịa số NowCast!

2. **Bảng giá trị quy chuẩn điểm cắt (`BP` — Breakpoints) tính `VN_AQI` cho PM2.5 (`µg/m³`):**

| Khoảng giá trị $I$ (`VN_AQI`) | Mức chất lượng không khí | Màu sắc hiển thị (Hex) | Điểm cắt nồng độ PM2.5 $BP_i \rightarrow BP_{i+1}$ (`µg/m³`) |
| :--- | :--- | :--- | :--- |
| **`0 – 50`** | **Tốt (Good)** | Xanh lá (`#00E400`) | `0 – 25` |
| **`51 – 100`** | **Trung bình (Moderate)** | Vàng (`#FFFF00`) | `> 25 – 50` |
| **`101 – 150`** | **Kém (Nhóm nhạy cảm chú ý)** | Da cam (`#FF7E00`) | `> 50 – 80` |
| **`151 – 200`** | **Xấu (Unhealthy)** | Đỏ (`#FF0000`) | `> 80 – 150` |
| **`201 – 300`** | **Rất xấu (Very Unhealthy)** | Tím (`#8F3F97`) | `> 150 – 250` |
| **`301 – 500`** | **Nguy hại (Hazardous)** | Nâu (`#7E0023`) | `> 250 – 500+` |

3. **Công thức nội suy tuyến tính từng đoạn tính $AQI_{PM2.5}$:**
   $$AQI_x = \frac{I_{i+1} - I_i}{BP_{i+1} - BP_i} \times (C_x - BP_i) + I_i$$
   *(Kết quả làm tròn thành số nguyên).*
