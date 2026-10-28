# ĐẶC TẢ YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS)
## Dự án: Hanoi PM2.5 GIS

**Phiên bản:** 1.0 (Giai đoạn 1)  
**Ngày cập nhật:** 28/10/2026

---

## 1. Phân hệ Bản đồ Tương tác WebGIS (`FR-MAP`)

| Mã YC | Tên yêu cầu | Mô tả chi tiết nghiệp vụ & kỹ thuật | Mức ưu tiên |
| :--- | :--- | :--- | :--- |
| **`FR-MAP-01`** | Hiển thị bản đồ nền toàn Thành phố Hà Nội | Hiển thị bản đồ tương tác toàn màn hình (MapLibre GL JS), mặc định căn giữa tại Hà Nội (`21.0285°N, 105.8542°E`), hỗ trợ phóng to/thu nhỏ, xoay, nghiêng và giới hạn vùng kéo mở rộng quanh miền Bắc Việt Nam. | Bắt buộc |
| **`FR-MAP-02`** | Hiển thị lớp điểm Trạm quan trắc PM2.5 thực tế | Hiển thị vị trí chính xác của toàn bộ các trạm quan trắc tại Hà Nội (37 trạm OpenAQ v3 + các trạm đối chiếu WAQI). Màu sắc tâm điểm thể hiện mức nồng độ PM2.5 (`µg/m³`), viền và độ trong suốt thể hiện trạng thái độ tươi dữ liệu (`FRESH`, `DELAYED`, `STALE`, `UNAVAILABLE`). | Bắt buộc |
| **`FR-MAP-03`** | Hiển thị lớp phủ Lưới mô hình PM2.5 / PM10 | Hiển thị lớp lưới mô hình chất lượng không khí CAMS Global (Open-Meteo) phủ kín 100% diện tích Hà Nội (cả nội thành và ngoại thành). Ghi chú rõ trên Legend độ phân giải mô hình (`0.4° × 0.4° ~ 40 km`) để không gây hiểu lầm là phép đo chi tiết từng phường. | Bắt buộc |
| **`FR-MAP-04`** | Hiển thị lớp Ranh giới hành chính đa cấp | Cho phép bật/tắt ranh giới hành chính Thành phố Hà Nội (`ADM1`), cấp Quận/Huyện/Thị xã (`ADM2`), và cấp Xã/Phường/Thị trấn hiện hành (`ADM3`) lưu trong PostGIS, hỗ trợ điều chỉnh độ trong suốt (opacity). | Bắt buộc |
| **`FR-MAP-05`** | Hiển thị lớp Khí tượng hỗ trợ (Gió, Nhiệt độ, Độ ẩm, Mưa) | Cho phép bật/tắt lớp trường gió chuyển động (Wind particle/vector layer) và thông tin nhiệt độ, độ ẩm, lượng mưa để hỗ trợ giải thích sự khuếch tán hoặc tích tụ bụi mịn PM2.5. | Bắt buộc |
| **`FR-MAP-06`** | Popup chi tiết Trạm quan trắc | Khi nhấp vào một trạm: hiển thị Tên trạm, Nhà cung cấp (`Hanoi Air Quality Monitoring Network`, `AirNow`, `AirGradient`, `WAQI`), Loại thiết bị (`Government Monitor` / `Community Sensor`), Giá trị PM2.5 (`µg/m³`), Chỉ số AQI tương ứng, Thời điểm đo (`measured_at`), Độ trễ, Cờ chất lượng (`quality_flag`), Mức cảnh báo sức khỏe và Biểu đồ xu hướng 24h/7d. | Bắt buộc |
| **`FR-MAP-07`** | Popup Truy vấn vị trí bất kỳ trên bản đồ | Khi nhấp vào một điểm bất kỳ không phải là trạm: (1) Hiển thị tọa độ (`lat, lon`) và tên Xã/Phường/Quận/Huyện chứa điểm đó (`ST_Contains`); (2) Tìm và vẽ đường nối tới **Trạm quan trắc thực tế gần nhất** kèm khoảng cách chính xác tính bằng km (`ST_Distance`), ghi rõ *"Dữ liệu đo tại trạm gần nhất, không phải đo trực tiếp tại vị trí chọn"*; (3) Hiển thị riêng giá trị ước tính từ **Mô hình CAMS Global & Thời tiết Open-Meteo** tại ô lưới chứa điểm đó. | Bắt buộc |
| **`FR-MAP-08`** | Thanh Timeline Lịch sử – Hiện tại – Dự báo | Cho phép chọn ngày/giờ, phát hoạt ảnh (Play/Pause/Step) qua các mốc thời gian thực sự có dữ liệu (48 giờ quá khứ + hiện tại + 72 giờ dự báo mô hình). | Bắt buộc |
| **`FR-MAP-09`** | Tìm kiếm địa điểm & Lọc trạm | Tìm kiếm nhanh Xã/Phường/Quận/Huyện Hà Nội (từ PostGIS) hoặc địa danh (qua Open-Meteo Geocoding API). Hỗ trợ lọc trạm theo Trạng thái (`FRESH`/`STALE`/`UNAVAILABLE`), Nguồn dữ liệu (`OpenAQ`/`WAQI`), và Loại thiết bị. | Bắt buộc |

---

## 2. Phân hệ Thu thập, Chuẩn hóa & Kiểm soát Chất lượng Dữ liệu (`FR-INGEST`)

| Mã YC | Tên yêu cầu | Mô tả chi tiết nghiệp vụ & kỹ thuật | Mức ưu tiên |
| :--- | :--- | :--- | :--- |
| **`FR-INGEST-01`** | Đồng bộ tự động danh mục Trạm & Cảm biến | Thu thập và cập nhật danh sách 37+ trạm OpenAQ v3 và 10+ trạm WAQI tại Hà Nội vào bảng `monitoring_stations` và `sensors`, tự động kiểm tra `ST_Within` với ranh giới Hà Nội để gắn cờ `OUTSIDE_STUDY_AREA` (ví dụ loại trừ trạm Việt Trì). | Bắt buộc |
| **`FR-INGEST-02`** | Thu thập dữ liệu PM2.5 quan trắc gần thời gian thực | Worker chạy định kỳ (10–15 phút/lần) và qua Cron Webhook để lấy số đo mới nhất từ OpenAQ v3 (`/v3/locations/{id}/latest`) và WAQI, chuẩn hóa thời gian về UTC và đơn vị về `µg/m³` (giữ riêng `aqi_subindex` cho WAQI). | Bắt buộc |
| **`FR-INGEST-03`** | Thu thập dữ liệu Lưới mô hình & Khí tượng | Thu thập dữ liệu lưới điểm Open-Meteo Air Quality (`pm2_5`, `pm10`, `us_aqi`, `european_aqi`) và Open-Meteo Weather (`temperature_2m`, `relative_humidity_2m`, `wind_speed_10m`, `wind_direction_10m`, `precipitation`, `surface_pressure`) cho khu vực Hà Nội. | Bắt buộc |
| **`FR-INGEST-04`** | Kiểm soát chất lượng (QC) & Khử trùng lặp | Áp dụng bộ quy tắc gán cờ `quality_flag` (`VALID`, `HIGH_EXTREME`, `SUSPECT_SPIKE`, `INVALID_NEGATIVE`, `INVALID_OUT_OF_RANGE`, `INVALID_TIMESTAMP`) và ràng buộc `UNIQUE(sensor_id, measured_at_utc)` chống trùng bản ghi. | Bắt buộc |
| **`FR-INGEST-05`** | Đẩy sự kiện cập nhật thời gian thực xuống Frontend | Khi có bản ghi đo mới được lưu vào PostGIS, phát sự kiện qua Server-Sent Events (`/api/v1/stream/events`) để Frontend tự động cập nhật bản đồ mà không cần tải lại trang. | Bắt buộc |

---

## 3. Phân hệ Phân tích Không gian PostGIS (`FR-GIS`)

| Mã YC | Tên yêu cầu | Mô tả chi tiết nghiệp vụ & kỹ thuật | Mức ưu tiên |
| :--- | :--- | :--- | :--- |
| **`FR-GIS-01`** | Truy vấn k-Trạm gần nhất (`Nearest Neighbor`) | Sử dụng toán tử khoảng cách `<->` trên chỉ mục không gian `GIST` và hàm `ST_Distance(geom::geography, point::geography)` để tìm các trạm gần nhất từ một tọa độ bất kỳ kèm khoảng cách mét/km. | Bắt buộc |
| **`FR-GIS-02`** | Truy vấn trạm trong bán kính (`Radius Search`) | Sử dụng `ST_DWithin(geom::geography, point::geography, radius_meters)` để tìm toàn bộ trạm hoạt động trong bán kính $R$ (ví dụ 5 km, 10 km) quanh vị trí người dùng. | Bắt buộc |
| **`FR-GIS-03`** | Truy vấn theo Khung nhìn bản đồ (`Bounding Box`) | Sử dụng `ST_Intersects(geom, ST_MakeEnvelope(minLon, minLat, maxLon, maxLat, 4326))` để lọc dữ liệu không gian theo vùng nhìn. | Bắt buộc |
| **`FR-GIS-04`** | Xác định đơn vị hành chính chứa điểm (`Point-in-Polygon`) | Sử dụng `ST_Contains(area.geom, point)` / `ST_Within(point, area.geom)` để xác định chính xác một trạm hoặc một điểm nhấp chuột thuộc Xã/Phường, Quận/Huyện nào của Hà Nội. | Bắt buộc |
| **`FR-GIS-05`** | Thống kê PM2.5 theo đơn vị hành chính | Kết hợp `ST_Within` để thống kê số lượng trạm, số trạm đang hoạt động, giá trị PM2.5 trung bình/lớn nhất/nhỏ nhất của các trạm nằm trong đơn vị hành chính đó; đồng thời hiển thị rõ cảnh báo nếu khu vực không có trạm đo trực tiếp (chỉ có dữ liệu mô hình nền). | Bắt buộc |

---

## 4. Phân hệ Phân tích Thời gian, Khí tượng, So sánh & Báo cáo (`FR-ANALYTICS`)

| Mã YC | Tên yêu cầu | Mô tả chi tiết nghiệp vụ & kỹ thuật | Mức ưu tiên |
| :--- | :--- | :--- | :--- |
| **`FR-ANA-01`** | Phân tích chuỗi thời gian đa khung | Biểu đồ biến thiên PM2.5 theo giờ (24h), theo ngày (7 ngày, 30 ngày) và khoảng thời gian tùy chọn. Tính toán trung bình, cực đại, cực tiểu, độ lệch chuẩn, tỷ lệ thiếu dữ liệu (`missing_rate %`) và xu hướng tăng/giảm. | Bắt buộc |
| **`FR-ANA-02`** | Phân tích tương quan Khí tượng – PM2.5 | Biểu đồ kết hợp (Dual-axis / Scatter plot) và hệ số tương quan Pearson $r$ giữa nồng độ PM2.5 với Nhiệt độ, Độ ẩm, Tốc độ gió, Hướng gió (Hoa gió / Wind Rose) và Lượng mưa kèm giải thích khoa học. | Bắt buộc |
| **`FR-ANA-03`** | So sánh song song nhiều Trạm / Khu vực | Cho phép người dùng chọn từ 2 đến 4 trạm hoặc khu vực để so sánh trực quan đường biểu đồ PM2.5, giá trị trung bình, đỉnh ô nhiễm, độ đầy đủ dữ liệu và điều kiện gió/ẩm. | Bắt buộc |
| **`FR-ANA-04`** | Xuất dữ liệu CSV và Báo cáo PDF | Cho phép lọc dữ liệu theo trạm/khu vực và khoảng thời gian để tải về tệp `.csv` chuẩn UTF-8 (có BOM cho Excel tiếng Việt) và xuất báo cáo phân tích định dạng `.pdf` có biểu đồ và bảng thống kê. | Bắt buộc |

---

## 5. Phân hệ Cảnh báo Ô nhiễm & Phân hệ Người dùng / Quản trị (`FR-ALERT` & `FR-USER`)

| Mã YC | Tên yêu cầu | Mô tả chi tiết nghiệp vụ & kỹ thuật | Mức ưu tiên |
| :--- | :--- | :--- | :--- |
| **`FR-ALT-01`** | Cảnh báo vượt ngưỡng nồng độ PM2.5 & AQI | Tự động phát hiện và tạo bản ghi cảnh báo khi nồng độ PM2.5 trung bình 24h vượt ngưỡng QCVN 05:2023/BTNMT (`50 µg/m³`), khuyến nghị WHO (`15 µg/m³`), hoặc nồng độ giờ vượt ngưỡng cảnh báo sức khỏe. Phân biệt rõ cảnh báo từ **Quan trắc thực tế** và cảnh báo dự báo từ **Mô hình**. | Bắt buộc |
| **`FR-ALT-02`** | Cảnh báo kỹ thuật (Trạm mất dữ liệu / Bất thường) | Tự động phát cảnh báo khi trạm đang hoạt động chuyển sang `STALE`/`UNAVAILABLE` hoặc khi xuất hiện giá trị `SUSPECT_SPIKE` / `INVALID`. Có cơ chế chống tạo cảnh báo trùng lặp (`deduplication_key`). | Bắt buộc |
| **`FR-USR-01`** | Xác thực & Phân quyền 3 vai trò (`GUEST`, `USER`, `ADMIN`) | Khách xem toàn bộ bản đồ, phân tích và cảnh báo chung. Người dùng đăng ký lưu địa điểm yêu thích (`user_favorite_locations`) và cấu hình ngưỡng cảnh báo cá nhân. | Bắt buộc |
| **`FR-USR-02`** | Quản trị hệ thống & Kiểm toán dữ liệu (`ADMIN`) | Quản trị viên quản lý danh mục trạm, cấu hình nguồn dữ liệu, kích hoạt đồng bộ thủ công, xem lịch sử `ingestion_jobs`, nhập file dữ liệu kiểm định (CSV/JSON) và hiệu chỉnh có lưu vết (`audit_logs`) mà không bao giờ xóa/ghi đè giá trị gốc (`raw_value`). | Bắt buộc |

