# BÁO CÁO XÁC MINH DỮ LIỆU THỜI GIAN THỰC (REALTIME DATA VERIFICATION)
## Dự án: Hanoi PM2.5 GIS

**Thời điểm thực thi kiểm chứng:** `2026-10-28T10:33:41.416Z` (`17:33:41 28/10/2026` giờ Việt Nam GMT+7)  
**Công cụ kiểm chứng:** Node.js `v24.22.1` trên Windows (`win32 x64`)  
**Tệp script kiểm chứng:** [`scripts/verify-data-sources.mjs`](../scripts/verify-data-sources.mjs)  
**Tệp log kết quả thực tế:** [`scripts/verification-results.json`](../scripts/verification-results.json)

---

## 1. Kết quả kiểm chứng trực tiếp (Live API Calls)

### 1.1. Nguồn đã kết nối và lấy dữ liệu thực thành công ngay lập tức (Không cần API Key)

#### A. Open-Meteo Air Quality API (`https://air-quality-api.open-meteo.com/v1/air-quality`)
- **Trạng thái HTTP:** `200 OK`
- **Độ trễ phản hồi (Latency):** `2032 ms`
- **Dữ liệu thực tế thu được tại Hà Nội (Mốc giờ `2026-10-28T17:00` GMT+7):**
  1. **Tâm ô lưới Khu vực Trung tâm Hà Nội (`21.00°N, 105.90°E`, độ cao `19m`):**
     - Nồng độ bụi mịn `pm2_5`: **`40.6 µg/m³`**
     - Nồng độ bụi `pm10`: **`41.9 µg/m³`**
     - Chỉ số `us_aqi`: **`154 USAQI`**
     - Chỉ số `european_aqi`: **`71 EAQI`**
  2. **Tâm ô lưới Khu vực Phía Bắc Hà Nội (`21.30°N, 105.90°E`, độ cao `14m`):**
     - Nồng độ bụi mịn `pm2_5`: **`40.6 µg/m³`**
     - Nồng độ bụi `pm10`: **`41.9 µg/m³`**
  3. **Tâm ô lưới Khu vực Tây Nam Hà Nội (`20.80°N, 105.70°E`, độ cao `21m`):**
     - Nồng độ bụi mịn `pm2_5`: **`47.0 µg/m³`**
     - Nồng độ bụi `pm10`: **`48.3 µg/m³`**
     - Chỉ số `us_aqi`: **`154 USAQI`**
     - Chỉ số `european_aqi`: **`75 EAQI`**
- **Chuỗi thời gian theo giờ (`hourly`):** Trả về chính xác `120` bản ghi theo giờ liên tục từ `2026-10-26T00:00` đến `2026-10-30T23:00` (48 giờ quá khứ + 72 giờ dự báo).

#### B. Open-Meteo Weather Forecast API (`https://api.open-meteo.com/v1/forecast`)
- **Trạng thái HTTP:** `200 OK`
- **Độ trễ phản hồi (Latency):** `1983 ms`
- **Tọa độ lưới giải quyết:** `21.05448°N, 105.898476°E` (độ cao `19m`)
- **Dữ liệu thời tiết thực tế tại Hà Nội (Mốc thời gian `2026-10-28T17:30` GMT+7, chu kỳ cập nhật `900s` = 15 phút):**
  - Nhiệt độ (`temperature_2m`): **`27.6 °C`**
  - Độ ẩm tương đối (`relative_humidity_2m`): **`70 %`**
  - Lượng mưa (`precipitation`): **`0 mm`**
  - Áp suất khí quyển bề mặt (`surface_pressure`): **`1013.5 hPa`**
  - Tốc độ gió ở độ cao 10m (`wind_speed_10m`): **`10.5 km/h`**
  - Hướng gió ở độ cao 10m (`wind_direction_10m`): **`145°`** (Gió Đông Nam)
- **Chuỗi thời gian theo giờ (`hourly`):** `120` mốc giờ liên tục.

#### C. Open-Meteo Geocoding API (`https://geocoding-api.open-meteo.com/v1/search`)
- **Trạng thái HTTP:** `200 OK`
- **Kết quả truy vấn thử từ khóa `"Ha Noi"` (`language=vi`):**
  - Trả về chính xác bản ghi thủ đô: `id: 1581130`, `name: "Hà Nội"`, `latitude: 21.0245`, `longitude: 105.84117`, `country: "Việt Nam"`, `admin1: "Hanoi"`, `population: 8053663`.

---

### 1.2. Nguồn quan trắc thực tế cần cấu hình API Key cá nhân (Đang ở trạng thái CHỜ API KEY)

> [!IMPORTANT]
> Tuân thủ nghiêm ngặt Quy tắc 8 & Quy tắc 10 của Master Prompt: **Không tạo kết quả kiểm thử giả và không tuyên bố đã lấy được danh sách trạm chi tiết khi chưa có API key hợp lệ.**

#### A. OpenAQ API v3 (`https://api.openaq.org/v3/locations`)
- **Trạng thái kết nối mạng:** Máy chủ phản hồi tốt (`HTTP 401`, độ trễ `261 ms`).
- **Phản hồi thực tế từ server:**
  ```json
  {
    "message": "Unauthorized. A valid API key must be provided in the X-API-Key header."
  }
  ```
- **Trạng thái xác minh danh sách trạm tại Hà Nội:** **CHƯA KIỂM CHỨNG CHI TIẾT TỌA ĐỘ & GIÁ TRỊ ĐO (Chờ người dùng cung cấp `OPENAQ_API_KEY` vào file `.env`)**.
- **Cách thức xác minh ngay sau khi có Key:** Chỉ cần thêm `OPENAQ_API_KEY=...` vào file `.env` và chạy lại lệnh `node scripts/verify-data-sources.mjs`, script sẽ tự động xuất toàn bộ danh sách trạm PM2.5 tại Hà Nội, tọa độ thực, cảm biến, thời điểm đo mới nhất và độ trễ thực tế của từng trạm.

#### B. WAQI API (`https://api.waqi.info/`)
- **Trạng thái kết nối mạng:** Máy chủ phản hồi tốt (`HTTP 200`, độ trễ `121 ms` – `1098 ms`).
- **Phản hồi thực tế khi dùng `token=demo`:**
  - Endpoint `/feed/hanoi/?token=demo`: Trả về dữ liệu mẫu của **Thượng Hải (`Shanghai`)**, không trả về dữ liệu Hà Nội.
  - Endpoint `/v2/map/bounds?latlng=20.56,105.28,21.39,106.02&networks=all&token=demo`:
    ```json
    {
      "status": "error",
      "data": "Invalid key"
    }
    ```
- **Trạng thái xác minh danh sách trạm WAQI tại Hà Nội:** **CHƯA KIỂM CHỨNG CHI TIẾT (Chờ người dùng đăng ký `WAQI_API_TOKEN` miễn phí tại `https://aqicn.org/data-platform/token/`)**.

---

## 2. Phân biệt 5 mốc thời gian trong chuỗi thu thập gần thời gian thực (Theo mục 12 — Master Prompt)

Để đảm bảo tính trung thực khoa học, cơ sở dữ liệu và giao diện của hệ thống **Hanoi PM2.5 GIS** bắt buộc lưu trữ và phân biệt rõ 5 mốc thời gian sau cho mỗi bản ghi quan trắc:

| STT | Tên trường kỹ thuật | Ý nghĩa khoa học / Kỹ thuật | Nguồn cung cấp |
| :--- | :--- | :--- | :--- |
| 1 | `measured_at_utc` | **Thời điểm trạm thực hiện phép đo:** Thời điểm thiết bị cảm biến quang học/beta-attenuation tại trạm hoàn tất chu kỳ đo (ví dụ kết thúc trung bình 1 giờ). | Trường `datetime.utc` (OpenAQ) hoặc `time.iso` (WAQI). |
| 2 | `published_at_utc` | **Thời điểm nhà cung cấp công bố dữ liệu:** Thời điểm dữ liệu từ datalogger của trạm được đồng bộ lên máy chủ OpenAQ / WAQI / CAMS. | Metadata đồng bộ của API nguồn (nếu có, ví dụ `debug.sync`). |
| 3 | `fetched_at_utc` | **Thời điểm Backend thu thập dữ liệu:** Thời điểm Ingestion Worker của hệ thống Hanoi PM2.5 GIS gọi HTTP request thành công tới API nguồn. | Sinh tự động tại Backend Worker (`new Date().toISOString()`). |
| 4 | `stored_at_utc` | **Thời điểm Database lưu dữ liệu:** Thời điểm bản ghi vượt qua bước kiểm tra chất lượng (QC) và được ghi (`INSERT`/`UPSERT`) vào bảng `pm25_observations` trong PostgreSQL. | `DEFAULT NOW()` trong PostgreSQL. |
| 5 | `displayed_at_utc` | **Thời điểm Frontend hiển thị dữ liệu:** Thời điểm trình duyệt người dùng nhận gói tin qua REST/SSE và render lên bản đồ MapLibre. | State đồng hồ tại trình duyệt người dùng. |

### Công thức tính Độ trễ dữ liệu thực tế (Data Lag):
$$\text{Data Lag (phút)} = \frac{\text{Current Time (UTC)} - \text{measured\_at\_utc}}{60}$$

> [!WARNING]
> **Nguyên tắc hiển thị bắt buộc trên giao diện:**
> Giao diện **KHÔNG BAO GIỜ** lấy `fetched_at_utc` hay `displayed_at_utc` để tuyên bố là *"Dữ liệu đo lúc vừa xong"*. Mọi popup trạm và thanh trạng thái trên Header phải hiển thị rõ ràng cả **Thời điểm trạm đo (`measured_at`)** và **Thời điểm hệ thống kiểm tra gần nhất (`fetched_at`)**.
