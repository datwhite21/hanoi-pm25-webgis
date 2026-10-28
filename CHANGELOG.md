# LỊCH SỬ THAY ĐỔI (CHANGELOG)
## Dự án: Hanoi PM2.5 GIS

---

## [0.5.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 4: THU THẬP DỮ LIỆU THỰC TẾ TỰ ĐỘNG (DATA INGESTION WORKERS, QUALITY CONTROL & SCHEDULER)

### Đã thêm mới (Added)
- Bổ sung hàm quy đổi ngược `convertUsAqiToApproximatePm25UgM3()` trong [`packages/shared/src/aqi.ts`](packages/shared/src/aqi.ts) phục vụ riêng cho các trạm WAQI (`value_origin = 'DERIVED_FROM_US_AQI'`).
- Xây dựng hệ thống thu thập dữ liệu thực tế tự động trong `apps/api/src/ingestion/`:
  - [`openaqWorker.ts`](apps/api/src/ingestion/openaqWorker.ts): Đồng bộ 43 trạm trong vùng bao Hà Nội từ OpenAQ API v3, thu thập số đo nồng độ PM2.5 trực tiếp (`DIRECT_CONCENTRATION`, đơn vị `µg/m³`), cập nhật tức thời các giá trị mới nhất (ví dụ: trạm *Dragon - Gia Lâm* tăng lên `64.30 µg/m³` vượt ngưỡng QCVN 05:2023; trạm *Số 1 Giải Phóng* cập nhật `33.0 µg/m³`).
  - [`waqiWorker.ts`](apps/api/src/ingestion/waqiWorker.ts): Đồng bộ 11 trạm từ WAQI API, gắn nhãn `DERIVED_FROM_US_AQI` và tự động lọc địa giới Hà Nội bằng PostGIS `ST_Contains` trên đa giác `VN-HN` (tự động gắn cờ `OUTSIDE_STUDY_AREA` và `is_within_hanoi = FALSE` cho trạm *Viet Tri, Vietnam (Tp Việt Trì)*).
  - [`openMeteoWorker.ts`](apps/api/src/ingestion/openMeteoWorker.ts): Thu thập và nạp theo lô (`UNNEST`) dữ liệu mô hình số trị CAMS Global (`0.4° × 0.4°`) vào `model_pm25_values` và dữ liệu khí tượng theo giờ vào `weather_data`.
  - [`ingestionOrchestrator.ts`](apps/api/src/ingestion/ingestionOrchestrator.ts), [`scheduler.ts`](apps/api/src/ingestion/scheduler.ts), và [`runLiveIngestionCli.ts`](apps/api/src/ingestion/runLiveIngestionCli.ts): Điều phối tiến trình thu thập, ghi nhật ký `ingestion_jobs`, tự động phát hiện và cập nhật 10 cảnh báo ô nhiễm trong `air_quality_alerts`.
- Bổ sung API Quản trị thu thập dữ liệu: `POST /api/v1/admin/ingestion/trigger` và `GET /api/v1/admin/ingestion/jobs`.
- Kiểm thử: Vượt qua **17/17 bài kiểm thử Vitest + Supertest**.

---

## [0.4.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 3: BACKEND (`@hanoi-pm25/api`) & CƠ SỞ DỮ LIỆU KHÔNG GIAN SUPABASE POSTGIS

### Đã thêm mới (Added)
- Tạo bộ kịch bản SQL Migration & Rollback cho PostgreSQL 17 + PostGIS 3.3.7 (`001_init_postgis_schema.sql`, `001_rollback_postgis_schema.sql`, `001_seed_hanoi_base.sql`).
- Xây dựng gói Backend REST API `@hanoi-pm25/api` với truy vấn không gian PostGIS thực tế, xác thực JWT và phân quyền RBAC (`GUEST`, `USER`, `ADMIN`).

---

## [0.3.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 2: THIẾT KẾ UI/UX (WINDY-INSPIRED) & KHỞI TẠO MONOREPO / FRONTEND WEBGIS

### Đã thêm mới (Added)
- Tạo tài liệu đặc tả UI/UX và khởi tạo Monorepo (`@hanoi-pm25/shared` và `@hanoi-pm25/web`).
