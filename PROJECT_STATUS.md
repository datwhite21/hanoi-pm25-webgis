# TRẠNG THÁI DỰ ÁN — HANOI PM2.5 WEBGIS (`PROJECT_STATUS.md`)

> [!IMPORTANT]
> **Dành cho AI trong các phiên làm việc tiếp theo:** Hãy luôn đọc file này đầu tiên cùng với `NEXT_STEPS.md` và `ARCHITECTURE_DECISIONS.md` trước khi thực hiện bất kỳ thao tác nào.

**Cập nhật lần cuối:** 2026-10-28 17:41 (GMT+7)  
**Giai đoạn hiện tại:** GIAI ĐOẠN 0 — KIỂM TRA MÔI TRƯỜNG VÀ KHẢO SÁT DỮ LIỆU  
**Trạng thái Giai đoạn 0:** **Hoàn thành (Chờ người dùng thêm `OPENAQ_API_KEY` vào `.env` và xác nhận chuyển sang Giai đoạn 1)**

---

## 1. Tổng hợp công việc đã hoàn thành trong Giai đoạn 0

- [x] **Bước 1 & 2 — Kiểm tra môi trường Windows và công cụ:**
  - Workspace: `c:\Users\ADMIN\Documents\DALN`
  - Node.js: `v24.22.1` (Hoạt động tốt)
  - npm / npx: `11.19.1` (Gọi qua `npm.cmd` hoạt động tốt; đã hướng dẫn mở `ExecutionPolicy RemoteSigned` cho PowerShell)
  - Git: `2.56.0.windows.3` (User: `datwhite21`, đã khởi tạo branch `main`)
  - Đã xử lý dứt điểm lỗi hook `googlecloudtools.datacloud_telemetry` trong Antigravity.
- [x] **Bước 3, 4, 5 — Khảo sát và gọi thử trực tiếp các API dữ liệu tại Hà Nội:**
  - Đã viết và chạy script [`scripts/verify-data-sources.mjs`](scripts/verify-data-sources.mjs), lưu bằng chứng thực tế vào [`scripts/verification-results.json`](scripts/verification-results.json).
  - **Open-Meteo Air Quality API:** Kết nối thành công (`HTTP 200 OK`, không cần key). Trả về nồng độ thực tế tại Hà Nội lúc `17:00 28/10/2026`: `pm2_5 = 40.6 µg/m³` (trung tâm & phía Bắc HN), `pm2_5 = 47.0 µg/m³` (Tây Nam HN), kèm 120 giờ lịch sử + dự báo. Xác minh độ phân giải mô hình CAMS Global là `0.4° × 0.4° (~40 km)`.
  - **Open-Meteo Weather API:** Kết nối thành công (`HTTP 200 OK`, không cần key). Trả về tại Hà Nội lúc `17:30 28/10/2026`: Nhiệt độ `27.6°C`, Độ ẩm `70%`, Gió `10.5 km/h` hướng `145°`, Áp suất `1013.5 hPa`, Mưa `0 mm`.
  - **Open-Meteo Geocoding API:** Kết nối thành công (`HTTP 200 OK`), trả về tọa độ Hà Nội hỗ trợ tiếng Việt (thay thế cho `nominatim.openstreetmap.org` đang bị lỗi DNS `ENOTFOUND`).
  - **Cổng quan trắc Hà Nội (`airhanoi.hanoi.gov.vn` / `moitruongthudo.vn` / `enviinfo.cem.gov.vn`):** Xác minh `airhanoi.hanoi.gov.vn` lỗi chứng chỉ SSL (đã chuyển về `moitruongthudo.vn`). Cổng web không cung cấp Public REST API mở → Tuân thủ quy tắc không cào dữ liệu (scraping) trái phép.
  - **OpenAQ API v3:** Kết nối máy chủ thành công (`261 ms`), trả về `HTTP 401` yêu cầu `X-API-Key`. Đã hướng dẫn người dùng đăng ký key miễn phí.
  - **WAQI API:** Kết nối thành công (`HTTP 200`). Phát hiện `token=demo` khóa cứng dữ liệu về Thượng Hải (`Shanghai`) và trả về chỉ số con US-EPA AQI (`iaqi.pm25.v`) chứ không phải nồng độ `µg/m³`. Đã lập quy tắc phân tách rõ ràng và hướng dẫn lấy token miễn phí.
- [x] **Bước 6, 7, 8 — Đánh giá độ phủ không gian Hà Nội, cơ chế Near-Real-Time và Kiến trúc:**
  - Đề xuất kiến trúc dữ liệu đa tầng trung thực: Điểm quan trắc thực (OpenAQ/WAQI) + Lưới mô hình khu vực ~40 km (Open-Meteo CAMS) + Truy vấn không gian PostGIS thông minh cho vị trí bất kỳ.
  - Đề xuất cơ chế Dual-Trigger Ingestion (In-process Scheduler + GitHub Actions Cron Webhook) để hoạt động bền vững trên gói hosting miễn phí.
- [x] **Bước 9 — Tạo đầy đủ hệ thống tài liệu Giai đoạn 0:**
  - [`docs/DATA_SOURCE_AUDIT.md`](docs/DATA_SOURCE_AUDIT.md)
  - [`docs/REALTIME_DATA_VERIFICATION.md`](docs/REALTIME_DATA_VERIFICATION.md)
  - [`docs/DATA_QUALITY_POLICY.md`](docs/DATA_QUALITY_POLICY.md)
  - [`docs/FEASIBILITY_REPORT.md`](docs/FEASIBILITY_REPORT.md)
  - [`docs/INSTALLATION_GUIDE.md`](docs/INSTALLATION_GUIDE.md)
  - [`docs/PROJECT_SCOPE.md`](docs/PROJECT_SCOPE.md)
  - [`ARCHITECTURE_DECISIONS.md`](ARCHITECTURE_DECISIONS.md), [`README.md`](README.md), [`CHANGELOG.md`](CHANGELOG.md), [`NEXT_STEPS.md`](NEXT_STEPS.md), [`.env.example`](.env.example), [`.gitignore`](.gitignore)

---

## 2. Danh sách File đã tạo / sửa trong Giai đoạn 0

1. `.gitignore`
2. `.env.example`
3. `README.md`
4. `PROJECT_STATUS.md`
5. `NEXT_STEPS.md`
6. `CHANGELOG.md`
7. `ARCHITECTURE_DECISIONS.md`
8. `scripts/verify-data-sources.mjs`
9. `scripts/verification-results.json`
10. `docs/DATA_SOURCE_AUDIT.md`
11. `docs/REALTIME_DATA_VERIFICATION.md`
12. `docs/DATA_QUALITY_POLICY.md`
13. `docs/FEASIBILITY_REPORT.md`
14. `docs/INSTALLATION_GUIDE.md`
15. `docs/PROJECT_SCOPE.md`

---

## 3. Lỗi còn tồn tại / Ràng buộc cần lưu ý

1. **Chưa có `OPENAQ_API_KEY` và `WAQI_API_TOKEN` cá nhân trong `.env`:** Cần người dùng tự đăng ký miễn phí và dán vào file `.env` cục bộ (theo quy tắc bảo mật không gửi secret qua chat).
2. **PowerShell ExecutionPolicy:** Đang ở trạng thái `Undefined` (chặn `.ps1`). Có thể dùng `npm.cmd` hoặc người dùng chạy lệnh mở `RemoteSigned` cho `CurrentUser`.

---

## 4. Việc cần người dùng thực hiện & Bước tiếp theo

- **Việc cần người dùng thực hiện:** Tạo file `.env` từ `.env.example`, đăng ký và điền `OPENAQ_API_KEY` (và tùy chọn `WAQI_API_TOKEN`), sau đó xác nhận để chạy kiểm chứng trạm thực tế tại Hà Nội và chuyển sang **Giai đoạn 1 (Phân tích yêu cầu & Thiết kế hệ thống)**.
