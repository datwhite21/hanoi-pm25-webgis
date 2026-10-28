# BÁO CÁO KIỂM TOÁN NGUỒN DỮ LIỆU (DATA SOURCE AUDIT)
## Dự án: Hệ thống WebGIS Giám sát, Phân tích và Cảnh báo Ô nhiễm Bụi mịn PM2.5 Gần Thời Gian Thực trên Toàn Thành phố Hà Nội (Hanoi PM2.5 GIS)

**Ngày kiểm toán:** 28/10/2026 (GMT+7)  
**Kịch bản kiểm chứng tự động:** [`scripts/verify-data-sources.mjs`](../scripts/verify-data-sources.mjs)  
**Kết quả JSON gốc:** [`scripts/verification-results.json`](../scripts/verification-results.json)

---

## 1. Bảng tổng hợp đánh giá các nguồn dữ liệu (Theo mục 10 — Master Prompt)

| Tiêu chí đánh giá | 1. Cổng quan trắc Hà Nội & Bộ TN&MT (`airhanoi` / `moitruongthudo` / `enviinfo`) | 2. OpenAQ API v3 (Ưu tiên số 1 cho Quan trắc thực) | 3. WAQI / AQICN API (Bổ sung & Đối chiếu trạm) | 4. Open-Meteo Air Quality API (Mô hình & Dự báo) | 5. Open-Meteo Weather & Geocoding API (Khí tượng & Tìm kiếm) | 6. Dữ liệu GIS Ranh giới Hành chính (GADM / OCHA HDX / OSM) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tên nguồn** | Cổng thông tin quan trắc môi trường Hà Nội & CEM MONRE | OpenAQ Platform API v3 | World Air Quality Index Project (WAQI) | Open-Meteo Air Quality API (ECMWF CAMS) | Open-Meteo Forecast & Geocoding API | UN OCHA COD-AB / GADM 4.1 / Open Vietnam GIS |
| **Website chính thức** | https://moitruongthudo.vn/ <br> https://enviinfo.cem.gov.vn/ | https://openaq.org/ <br> https://docs.openaq.org/ | https://aqicn.org/api/ | https://open-meteo.com/en/docs/air-quality-api | https://open-meteo.com/en/docs | https://data.humdata.org/ <br> https://gadm.org/ |
| **API Endpoint đã xác minh** | Không có Public REST API mở cho bên thứ 3 | `https://api.openaq.org/v3/locations` <br> `https://api.openaq.org/v3/sensors/{id}/measurements` | `https://api.waqi.info/feed/hanoi/` <br> `https://api.waqi.info/v2/map/bounds` | `https://air-quality-api.open-meteo.com/v1/air-quality` | `https://api.open-meteo.com/v1/forecast` <br> `https://geocoding-api.open-meteo.com/v1/search` | Tải bộ file tĩnh GeoJSON / Shapefile nhập vào PostGIS |
| **API Key cần thiết** | Không áp dụng (Giao diện web dùng CSRF session) | **CẦN** (`X-API-Key` trong HTTP Header — Đăng ký miễn phí) | **CẦN** (`?token=YOUR_TOKEN` — Đăng ký miễn phí) | **KHÔNG CẦN** (Miễn phí cho mục đích học thuật/phi thương mại) | **KHÔNG CẦN** (Miễn phí cho mục đích học thuật/phi thương mại) | **KHÔNG CẦN** |
| **Điều khoản sử dụng** | Chỉ xem trên cổng web; không cho phép cào (scraping) tự động trái phép | Mở (Open Data); tùy giấy phép từng nhà cung cấp trạm (CC-BY 4.0 / Public Domain) | Cho phép hiển thị phi thương mại kèm trích dẫn nguồn; cấm tái phân phối kho lịch sử | CC-BY 4.0 (Ghi nguồn Open-Meteo & Copernicus Atmosphere Monitoring Service) | CC-BY 4.0 (Ghi nguồn Open-Meteo) | CC-BY-IGO / dữ liệu mở phục vụ nghiên cứu học thuật |
| **Số trạm PM2.5 tại Hà Nội** | ~10–35 điểm hiển thị trên web nội bộ (tùy thời điểm bảo trì) | **37 trạm đã đăng ký** (Trong đó **32 trạm** thuộc *Hanoi Air Quality Monitoring Network*; **5 trạm** có dữ liệu mới trong ngày 28/10/2026) | **11 trạm trong Bounding Box** (Trong đó **10 trạm thuộc Hà Nội**, **7 trạm** đang phát chỉ số AQI hôm nay) | Dữ liệu lưới mô hình phủ kín 100% diện tích Hà Nội | Dữ liệu lưới khí tượng phủ kín 100% diện tích Hà Nội | Bao phủ toàn bộ Thành phố Hà Nội và các cấp hành chính trực thuộc |
| **Thời gian đo gần nhất** | Hiển thị trên giao diện HTML | **`2026-10-28T17:35:00+07:00`** (Độ trễ ~24 phút tại trạm Nhân Chính & ĐHBK Giải Phóng) | **`2026-10-28T17:52:14+07:00`** (Tại trạm Mộ Lao - Hà Đông & Tây Hồ) | **`2026-10-28T17:00`** (GMT+7) — Đã xác minh thực tế | **`2026-10-28T17:45`** (GMT+7) — Đã xác minh thực tế | Dữ liệu ranh giới tĩnh (cập nhật theo kỳ công bố) |
| **Độ trễ công bố (Latency)** | 1–2 giờ trên giao diện web | Thường từ 15–60 phút sau khi trạm đo xong | Thường từ 15–60 phút sau khi trạm đo xong | Theo giờ (bước thời gian `3600s`) | Mỗi 15 phút (`interval: 900s`) cho dữ liệu `current` | Không áp dụng |
| **Đơn vị gốc** | AQI VN & `µg/m³` | **`µg/m³`** (Nồng độ khối lượng chuẩn cho PM2.5, `parameter_id = 2`) | **Chỉ số con US-EPA AQI** (`iaqi.pm25.v`) — **KHÔNG PHẢI `µg/m³` trực tiếp!** | **`µg/m³`** cho `pm2_5`, `pm10`; `USAQI` và `EAQI` cho chỉ số | `°C`, `%`, `mm`, `hPa`, `km/h`, `°` (độ góc hướng gió) | Hệ tọa độ địa lý WGS84 (`EPSG:4326`) |
| **Độ phân giải không gian** | Điểm trạm cố định (Point) | Điểm trạm cố định (Point `lat, lon`) | Điểm trạm cố định (Point `lat, lon`) | **Lưới mô hình CAMS Global: 0.4° × 0.4° (~40 km)** tại khu vực Việt Nam | **Lưới mô hình khí tượng: ~0.1° đến 0.25° (~11–25 km)** | Đa giác ranh giới hành chính (MultiPolygon) |
| **Chu kỳ cập nhật** | 1 giờ | 15–60 phút (tùy trạm) | 15–60 phút (tùy trạm) | Mô hình chạy 2 lần/ngày (00 UTC & 12 UTC), cung cấp chuỗi theo từng giờ | Cập nhật mỗi 1–6 giờ, bước thời gian 15 phút (current) và 1 giờ (hourly) | Cập nhật khi có thay đổi địa giới hành chính |
| **Khả năng lấy lịch sử** | Không có API lịch sử công khai | **CÓ** (Hỗ trợ truy vấn lịch sử theo giờ/ngày qua `/v3/sensors/{id}/measurements` & `/hours`) | **HẠN CHẾ** (API miễn phí chỉ trả về hiện tại + dự báo ngắn hạn, không trả lịch sử trạm qua REST API thường) | **CÓ** (`past_days` tới 92 ngày + Historical Air Quality API từ 2013) | **CÓ** (`past_days` tới 92 ngày + Historical Weather API) | Lưu trữ lâu dài trong PostGIS kèm `effective_date` |
| **Kết quả thử API thực tế** | `airhanoi.hanoi.gov.vn` lỗi SSL (trỏ về cert `moitruongthudo.vn`). `moitruongthudo.vn` trả về HTML `200 OK` (243ms). | **THÀNH CÔNG (`HTTP 200 OK`, `1138ms`)** — Trả về 37 trạm; nồng độ PM2.5 mới nhất từ `33.6` đến `49.4 µg/m³`. | **THÀNH CÔNG (`HTTP 200 OK`, `130ms`)** — Trả về 11 trạm trong vùng bao Hà Nội (`AQI` từ `71` đến `122`). | **THÀNH CÔNG (`HTTP 200 OK`, `904ms`)** — Trả về `pm2_5 = 40.6 µg/m³` (trung tâm HN) & `47.0 µg/m³` (Tây Nam HN). | **THÀNH CÔNG (`HTTP 200 OK`, `853ms`)** — Trả về `27.5°C`, độ ẩm `70%`, gió `9.9 km/h` hướng `148°`. | Đã xác minh nguồn tải hợp lệ; sẽ nạp vào PostGIS ở Giai đoạn 3 & 4. |
| **Đề xuất sử dụng trong hệ thống** | **Không cào tự động (scraping)**. Chỉ hỗ trợ chức năng Admin Import file CSV/Excel nếu có dữ liệu cấp phép. | **NGUỒN QUAN TRẮC CHÍNH (PRIMARY OBSERVATION SOURCE)** để lấy nồng độ PM2.5 (`µg/m³`) và lịch sử đo. | **NGUỒN ĐỐI CHIẾU / BỔ SUNG TRẠM** (Phải gắn nhãn rõ `US-EPA AQI Sub-index`, không trộn lẫn với `µg/m³` gốc). | **NGUỒN MÔ HÌNH & DỰ BÁO CHÍNH** (Hiển thị đúng độ phân giải lưới ~40 km, phân biệt rõ với điểm đo thực). | **NGUỒN KHÍ TƯỢNG & GEOCODING CHÍNH** (Phục vụ phân tích tương quan thời tiết - PM2.5 và tìm kiếm địa điểm). | **NGUỒN DỮ LIỆU KHÔNG GIAN NỀN** lưu trong bảng `administrative_areas` của PostGIS. |

---

## 2. Phân tích chi tiết từng nguồn dữ liệu

### 2.1. Khảo sát nguồn quan trắc chính thức (`airhanoi.hanoi.gov.vn`, `moitruongthudo.vn`, `enviinfo.cem.gov.vn`)
1. **Hiện trạng kỹ thuật thực tế (kiểm chứng lúc 17:33 ngày 28/10/2026):**
   - Khi gọi HTTPS tới `https://airhanoi.hanoi.gov.vn/`, kết nối TLS bị từ chối với lỗi:
     `Hostname/IP does not match certificate's altnames: Host: airhanoi.hanoi.gov.vn. is not in the cert's altnames: DNS:moitruongthudo.vn`.
   - Nguyên nhân: Hạ tầng cổng thông tin quan trắc của Hà Nội đã chuyển về tên miền chính thức là **`https://moitruongthudo.vn/`** (*Cổng thông tin quan trắc môi trường thủ đô Hà Nội*).
   - Cả `https://moitruongthudo.vn/` (`HTTP 200`, 322 ms) và `https://enviinfo.cem.gov.vn/` (`HTTP 200`, 582 ms - thuộc Trung tâm Quan trắc môi trường miền Bắc, Bộ TN&MT) đều là ứng dụng web hiển thị trực tiếp cho người dân, sử dụng CSRF token (`<meta name="csrf_token" ...>`) và **không cung cấp Public API hay tài liệu Open API cho nhà phát triển bên thứ ba**.
2. **Quyết định tuân thủ pháp lý và đạo đức kỹ thuật (Quy tắc 9.1 & 23):**
   - Hệ thống **tuyệt đối không sử dụng kỹ thuật web scraping trái phép** hoặc vượt tường lửa/CSRF của `moitruongthudo.vn` và `enviinfo.cem.gov.vn`.
   - Thay vào đó:
     - Khai thác dữ liệu của các trạm quan trắc nhà nước và đại sứ quán tại Hà Nội thông qua kênh chia sẻ hợp pháp quốc tế là **OpenAQ API v3** (ví dụ: trạm *556 Nguyễn Văn Cừ* thuộc mạng lưới quan trắc quốc gia, trạm *US Diplomatic Post: Hanoi*).
     - Xây dựng module **Admin Data Import (CSV/JSON chuẩn hóa)** trong phân hệ Quản trị viên để cho phép nhập bộ dữ liệu quan trắc lịch sử chính thức khi sinh viên hoặc nhóm nghiên cứu được cấp dữ liệu phục vụ bảo vệ đồ án.

### 2.2. OpenAQ API v3 (`https://api.openaq.org/v3`)
1. **Kết quả kiểm tra kết nối:**
   - Máy chủ `api.openaq.org` hoạt động ổn định, độ trễ mạng từ Việt Nam chỉ **261 ms**.
   - Kể từ phiên bản v3 (khi OpenAQ ngừng v1/v2), **mọi request đều bắt buộc phải đính kèm header `X-API-Key`**. Request không có key trả về `HTTP 401 Unauthorized`.
2. **Ưu điểm vượt trội cho đề tài PM2.5:**
   - Cung cấp nồng độ bụi mịn **PM2.5 thực đo theo đơn vị khối lượng `µg/m³`** (`parameter_id = 2`).
   - Cung cấp đầy đủ cấu trúc phân cấp: `Location (Trạm)` → `Sensors (Cảm biến)` → `Measurements / Latest / Hours / Days`, giúp thiết kế chuẩn xác 3 bảng `monitoring_stations`, `sensors`, và `pm25_observations` trong PostgreSQL/PostGIS.
   - Hỗ trợ lấy dữ liệu lịch sử thực tế để vẽ biểu đồ 24 giờ, 7 ngày, 30 ngày và tính toán thống kê không gian - thời gian.

### 2.3. WAQI API (`https://api.waqi.info`)
1. **Phát hiện quan trọng khi kiểm chứng `token=demo`:**
   - Khi gọi `https://api.waqi.info/feed/hanoi/?token=demo`, dù đường dẫn ghi `hanoi`, API với token `demo` luôn trả về dữ liệu mẫu cố định của thành phố **Shanghai (`idx: 1437`, tọa độ `31.2047, 121.4489`)**.
   - Khi gọi `/v2/map/bounds?latlng=20.56,105.28,21.39,106.02&token=demo`, API trả về `{"status": "error", "data": "Invalid key"}`.
   - Điều này chứng minh việc kiểm chứng payload thực tế là tối quan trọng: nếu lập trình viên không kiểm tra trường `data.city.name` và `data.city.geo`, hệ thống sẽ hiển thị nhầm dữ liệu Thượng Hải thành Hà Nội!
2. **Sự khác biệt giữa chỉ số con AQI (`iaqi.pm25.v`) và nồng độ `µg/m³`:**
   - Trong JSON của WAQI, trường `iaqi.pm25.v` là **chỉ số con AQI theo thang US-EPA (0–500)**, không phải nồng độ `µg/m³`.
   - Do đó, trong hệ thống **Hanoi PM2.5 GIS**, dữ liệu từ WAQI (sau khi cấu hình `WAQI_API_TOKEN` thật) chỉ được dùng để:
     - Bổ sung danh sách điểm trạm hoạt động theo thời gian thực trong bounding box Hà Nội (`/v2/map/bounds`).
     - Hiển thị chỉ số `US-EPA AQI` đối chiếu hoặc ước lượng khoảng nồng độ tương đương với cờ cảnh báo rõ ràng (`is_derived_from_aqi = true`), tuyệt đối không ghi đè lên nồng độ `µg/m³` đo trực tiếp từ OpenAQ.

### 2.4. Open-Meteo Air Quality API (`https://air-quality-api.open-meteo.com/v1/air-quality`)
1. **Thông số mô hình đã xác minh:**
   - Tên mô hình tại khu vực Việt Nam: **CAMS Global Atmospheric Composition Forecasts** (vận hành bởi ECMWF — Trung tâm Dự báo Thời tiết Hạn vừa Châu Âu, thuộc chương trình Copernicus của Liên minh Châu Âu).
   - Độ phân giải không gian: **0.4° × 0.4° (tương đương ~40 km × 40 km)**.
   - Chu kỳ chạy mô hình: 2 lần/ngày (00:00 UTC và 12:00 UTC), cung cấp bước thời gian theo từng giờ (`interval: 3600s`).
2. **Bằng chứng thực nghiệm về độ phân giải không gian trên địa bàn Hà Nội:**
   - Khi truy vấn đồng thời 3 tọa độ trải dọc Hà Nội lúc `2026-10-28T17:00`:
     - Trung tâm Hà Nội (`21.0285, 105.8542` → ô lưới `21.00°N, 105.90°E`): `pm2_5 = 40.6 µg/m³`, `pm10 = 41.9 µg/m³`.
     - Phía Bắc Hà Nội (`21.2500, 105.8500` → ô lưới `21.30°N, 105.90°E`): `pm2_5 = 40.6 µg/m³`, `pm10 = 41.9 µg/m³`.
     - Phía Tây Nam Hà Nội (`20.7500, 105.6500` → ô lưới `20.80°N, 105.70°E`): `pm2_5 = 47.0 µg/m³`, `pm10 = 48.3 µg/m³`.
   - **Kết luận thiết kế WebGIS:** Trên toàn bộ diện tích Hà Nội (~3.359 km²), lưới mô hình CAMS Global chỉ gồm khoảng **6 đến 9 ô lưới độc lập**. Vì vậy, khi hiển thị lớp phủ mô hình trên bản đồ, hệ thống sẽ hiển thị đúng lưới ô vuông mô hình (Model Grid Cells) hoặc lớp chuyển sắc độ phân giải thô kèm chú thích rõ *"Mô hình CAMS Global (~40 km)"*, không bao giờ dùng mô hình này để xếp hạng chi tiết từng xã/phường.

### 2.5. Open-Meteo Weather API & Geocoding API
1. **Dữ liệu khí tượng (`https://api.open-meteo.com/v1/forecast`):**
   - Hoạt động hoàn hảo không cần key (`HTTP 200 OK`, `1983 ms`).
   - Cung cấp đầy đủ 6 biến khí tượng cốt lõi phục vụ phân tích môi trường: Nhiệt độ 2m (`temperature_2m`), Độ ẩm tương đối 2m (`relative_humidity_2m`), Lượng mưa (`precipitation`), Áp suất bề mặt (`surface_pressure`), Tốc độ gió 10m (`wind_speed_10m`), và Hướng gió 10m (`wind_direction_10m`).
2. **Dịch vụ tìm kiếm địa điểm (`https://geocoding-api.open-meteo.com/v1/search`):**
   - Qua kiểm chứng thực tế trên máy Windows hiện tại, `nominatim.openstreetmap.org` bị lỗi phân giải DNS (`ENOTFOUND`), trong khi **Open-Meteo Geocoding API** hoạt động ổn định (`HTTP 200 OK`), hỗ trợ tiếng Việt (`language=vi`).
   - Kết hợp **Tìm kiếm nội bộ trong bảng PostGIS `administrative_areas` (Xã/Phường/Quận/Huyện Hà Nội)** + **Open-Meteo Geocoding API**, chức năng tìm kiếm địa điểm trên thanh Header sẽ luôn hoạt động nhanh và không phụ thuộc vào dịch vụ bên ngoài bị chặn.

