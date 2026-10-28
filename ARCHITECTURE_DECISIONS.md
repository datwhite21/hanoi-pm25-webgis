# QUYẾT ĐỊNH KIẾN TRÚC HỆ THỐNG (ARCHITECTURE DECISIONS — ADR)
## Dự án: Hanoi PM2.5 GIS

Tài liệu này lưu lại mọi quyết định kiến trúc và công nghệ quan trọng của dự án theo từng giai đoạn để đảm bảo tính nhất quán và phục vụ thuyết minh báo cáo đồ án.

---

## ADR-001: Cấu trúc thư mục Monorepo tại thư mục gốc Workspace (`c:\Users\ADMIN\Documents\DALN`)
- **Ngày quyết định:** 28/10/2026 (Giai đoạn 0)
- **Bối cảnh:** Master Prompt dự kiến tên dự án là `hanoi-pm25-webgis` với cấu trúc monorepo (`apps/web`, `apps/api`, `packages/shared`, `database/`, `docs/`, `scripts/`), đồng thời yêu cầu các file trạng thái (`PROJECT_STATUS.md`, `NEXT_STEPS.md`, `docs/DATA_SOURCE_AUDIT.md`) nằm ngay tại thư mục làm việc của Antigravity.
- **Quyết định:** Đặt gốc của monorepo (`hanoi-pm25-webgis`) trực tiếp tại thư mục workspace `c:\Users\ADMIN\Documents\DALN` (thay vì lồng thêm một thư mục con thừa `DALN\hanoi-pm25-webgis\`). Định danh tên gói gốc trong `package.json` là `"name": "hanoi-pm25-webgis"`.
- **Lý do:** Giúp đường dẫn tài liệu `docs/*`, `scripts/*`, `PROJECT_STATUS.md` khớp 100% với cấu trúc yêu cầu và tránh lỗi đường dẫn lồng nhau khi chạy lệnh từ gốc workspace.

---

## ADR-002: Chiến lược Nguồn dữ liệu Đa tầng (Hybrid Multi-Source Data Strategy)
- **Ngày quyết định:** 28/10/2026 (Giai đoạn 0)
- **Bối cảnh:**
  1. `airhanoi.hanoi.gov.vn` gặp lỗi SSL (chuyển về `moitruongthudo.vn`), và `moitruongthudo.vn` không có Public API mở hợp pháp.
  2. `OpenAQ API v3` cung cấp nồng độ PM2.5 thực đo chuẩn `µg/m³` và lịch sử đo tại Hà Nội nhưng yêu cầu header `X-API-Key` (đăng ký miễn phí).
  3. `WAQI API` cung cấp chỉ số con US-EPA AQI (`iaqi.pm25.v`), không phải nồng độ `µg/m³` trực tiếp.
  4. `Open-Meteo Air Quality (CAMS Global)` và `Open-Meteo Weather` hoạt động miễn phí không cần key, phủ kín 100% Hà Nội nhưng mô hình không khí có độ phân giải ô lưới ~40 km (`0.4° × 0.4°`).
- **Quyết định:**
  - Chọn **OpenAQ API v3** làm nguồn **Quan trắc thực tế chính (`PRIMARY_OBSERVED`)** cho nồng độ PM2.5 (`µg/m³`).
  - Chọn **WAQI API** làm nguồn **Đối chiếu / Bổ sung điểm trạm (`SUPPLEMENTARY_INDEX`)**, lưu tách biệt trường chỉ số con US-EPA AQI và gắn cờ nguồn rõ ràng.
  - Chọn **Open-Meteo Air Quality & Weather API** làm nguồn **Dữ liệu Mô hình & Khí tượng (`REGIONAL_MODEL_AND_WEATHER`)**, hiển thị đúng độ phân giải lưới ~40 km để phủ kín các huyện ngoại thành Hà Nội.
  - Bổ sung tính năng **Admin CSV/JSON Import** để cho phép nhập bộ dữ liệu quan trắc chính thức khi có file cấp phép.

---

## ADR-003: Giải pháp Geocoding thay thế Nominatim bị chặn DNS
- **Ngày quyết định:** 28/10/2026 (Giai đoạn 0)
- **Bối cảnh:** Khi kiểm thử thực tế trên môi trường mạng hiện tại, tên miền `nominatim.openstreetmap.org` bị lỗi phân giải DNS (`ENOTFOUND`), trong khi `geocoding-api.open-meteo.com/v1/search` phản hồi `HTTP 200 OK` cực nhanh và hỗ trợ tiếng Việt có dấu.
- **Quyết định:** Kết hợp **Tìm kiếm không gian nội bộ trên bảng `administrative_areas` (PostGIS)** (cho các xã/phường/quận/huyện của Hà Nội) và **Open-Meteo Geocoding API** làm dịch vụ tìm kiếm địa điểm chính.

---

## ADR-004: Cơ chế Thu thập Tự động Bền vững trên Hạ tầng Miễn phí (Dual-Trigger Ingestion)
- **Ngày quyết định:** 28/10/2026 (Giai đoạn 0)
- **Bối cảnh:** Các dịch vụ Backend hosting miễn phí (như Render Free Tier) tự động ngủ sau 15 phút không có truy cập, làm gián đoạn tiến trình `cron` nội bộ.
- **Quyết định:** Thiết kế module Ingestion vừa chạy được bằng **In-process Scheduler** (khi chạy máy local hoặc VPS 24/7), vừa cung cấp **Protected Webhook Endpoint (`POST /api/v1/internal/ingest/trigger`)** để **GitHub Actions Cron / External Free Cron** gọi định kỳ mỗi 15 phút khi triển khai công khai.

