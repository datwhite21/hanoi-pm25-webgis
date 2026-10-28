# LỊCH SỬ THAY ĐỔI (CHANGELOG)
## Dự án: Hanoi PM2.5 GIS

---

## [0.4.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 3: BACKEND (`@hanoi-pm25/api`) & CƠ SỞ DỮ LIỆU KHÔNG GIAN SUPABASE POSTGIS

### Đã thêm mới (Added)
- Tạo bộ kịch bản SQL Migration & Rollback cho PostgreSQL 17 + PostGIS 3.3.7:
  - [`database/migrations/001_init_postgis_schema.sql`](database/migrations/001_init_postgis_schema.sql): Bật extension `postgis` và `pgcrypto`, khởi tạo 14 bảng chuẩn hóa (`data_sources`, `administrative_areas`, `monitoring_stations`, `sensors`, `ingestion_jobs`, `pm25_observations`, `air_quality_model_runs`, `model_grid_cells`, `model_pm25_values`, `weather_data`, `air_quality_alerts`, `users`, `user_favorite_locations`, `audit_logs`) kèm các chỉ mục không gian `GIST` và ràng buộc chống trùng lặp `UNIQUE`.
  - [`database/migrations/001_rollback_postgis_schema.sql`](database/migrations/001_rollback_postgis_schema.sql): Kịch bản hoàn tác an toàn.
  - [`database/seeds/001_seed_hanoi_base.sql`](database/seeds/001_seed_hanoi_base.sql): Nạp dữ liệu không gian Hà Nội (16 đơn vị hành chính, 4 ô lưới CAMS `0.4° × 0.4°`, 10 trạm quan trắc thực tế tại Hà Nội, 78 bản ghi quan trắc PM2.5, 52 bản ghi mô hình, 36 bản ghi thời tiết, 3 cảnh báo và 2 tài khoản phân quyền `ADMIN` / `USER`).
- Tạo kịch bản tự động chạy Migration, Seed và kiểm chứng truy vấn không gian PostGIS: [`scripts/migrate-and-verify-postgis.mjs`](scripts/migrate-and-verify-postgis.mjs) và lưu kết quả tại [`scripts/postgis-verification-results.json`](scripts/postgis-verification-results.json).
- Xây dựng gói Backend REST API `@hanoi-pm25/api` (Node.js + Express + TypeScript + `pg` + Zod + Helmet + Rate Limit):
  - Truy vấn không gian PostGIS thực tế (`ST_Contains`, `ST_Distance`, `ST_DWithin`, `ST_Within`, `ST_Intersects`, `ST_AsGeoJSON`, `ST_Area`).
  - Xác thực JWT HMAC-SHA256 và phân quyền RBAC (`GUEST`, `USER`, `ADMIN`) cùng ghi vết kiểm toán bất biến vào `audit_logs`.
- Kiểm thử: Vượt qua **15/15 bài kiểm thử Vitest + Supertest** (bao gồm 6 bài kiểm thử tích hợp trực tiếp trên Supabase PostGIS), `npm run typecheck` 0 lỗi, và `npm run build` thành công.

---

## [0.3.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 2: THIẾT KẾ UI/UX (WINDY-INSPIRED) & KHỞI TẠO MONOREPO / FRONTEND WEBGIS

### Đã thêm mới (Added)
- Tạo tài liệu đặc tả UI/UX: [`docs/architecture/UI_UX_DESIGN_SPECIFICATION.md`](docs/architecture/UI_UX_DESIGN_SPECIFICATION.md).
- Khởi tạo Monorepo với npm workspaces (`@hanoi-pm25/shared` và `@hanoi-pm25/web`).
- Xây dựng thư viện khoa học dùng chung `@hanoi-pm25/shared`:
  - Tính toán `VN_AQI` và `NowCast 12 giờ` theo Quyết định 1459/QĐ-TCMT.
  - Phân loại mức độ ô nhiễm PM2.5 theo QCVN 05:2023/BTNMT (`50 µg/m³`) và WHO (`15 µg/m³`).
  - Phân loại độ tươi dữ liệu (`FRESH`, `DELAYED`, `STALE`, `UNAVAILABLE`) và cờ kiểm soát chất lượng (`quality_flag`).
- Xây dựng giao diện WebGIS toàn màn hình `@hanoi-pm25/web` (React + TypeScript + Vite + Tailwind CSS + MapLibre GL JS + Recharts).
- Kiểm thử: Vượt qua 9/9 bài kiểm thử Vitest, `tsc --noEmit` 0 lỗi, và `vite build` thành công.
