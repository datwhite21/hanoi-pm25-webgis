# TRẠNG THÁI DỰ ÁN — HANOI PM2.5 WEBGIS (`PROJECT_STATUS.md`)

> [!IMPORTANT]
> **Dành cho AI trong các phiên làm việc tiếp theo:** Hãy luôn đọc file này đầu tiên cùng với `NEXT_STEPS.md` và `ARCHITECTURE_DECISIONS.md` trước khi thực hiện bất kỳ thao tác nào.

**Cập nhật lần cuối:** 2026-10-28 19:10 (GMT+7)  
**Các giai đoạn đã hoàn thành:**
- **GIAI ĐOẠN 0 — KIỂM TRA MÔI TRƯỜNG VÀ KHẢO SÁT DỮ LIỆU:** **Hoàn thành 100%**
- **GIAI ĐOẠN 1 — PHÂN TÍCH YÊU CẦU & THIẾT KẾ HỆ THỐNG:** **Hoàn thành 100%**
- **GIAI ĐOẠN 2 — THIẾT KẾ UI/UX (LẤY CẢM HỨNG TỪ WINDY.COM) & KHỞI TẠO MONOREPO / FRONTEND:** **Hoàn thành 100%**
- **GIAI ĐOẠN 3 — BACKEND (`@hanoi-pm25/api`) VÀ CƠ SỞ DỮ LIỆU KHÔNG GIAN SUPABASE POSTGIS:** **Hoàn thành 100%**

**Giai đoạn tiếp theo:** **GIAI ĐOẠN 4 — THU THẬP DỮ LIỆU THỰC TẾ TỰ ĐỘNG (INGESTION WORKERS, QUALITY CONTROL & CRON SCHEDULER)** (Chờ người dùng xác nhận chuyển giai đoạn)

---

## 1. Kết quả Kiểm thử Giai đoạn 3 (Supabase PostgreSQL 17 + PostGIS 3.3.7 & Backend API)

- **Kiểm chứng Migration & Seed trên Supabase PostGIS (`npm run db:migrate`):**
  - Kết nối thành công tới Supabase PostgreSQL 17 (`POSTGIS="3.3.7 a0c7967" GEOS="3.14.1-CAPI-1.20.5" PROJ="9.7.1"`).
  - Đã tạo toàn bộ **14 bảng dữ liệu chuẩn hóa** cùng các chỉ mục không gian `GIST` (`idx_admin_areas_geom_gist`, `idx_stations_geom_gist`, `idx_model_cells_poly_gist`, v.v.) và các ràng buộc chống trùng lặp `UNIQUE`.
  - Đã nạp dữ liệu khởi tạo thực tế (`001_seed_hanoi_base.sql`):
    - `data_sources`: 4 nguồn dữ liệu thực tế (`OPENAQ_V3`, `WAQI_API`, `OPEN_METEO_CAMS`, `OPEN_METEO_WEATHER`).
    - `administrative_areas`: 16 đơn vị hành chính (`VN-HN` cấp 1 + 15 khu vực hành chính cấp 2 bao phủ toàn TP. Hà Nội) với diện tích trắc địa `ST_Area(geom::geography)` và tâm `ST_Centroid(geom)`.
    - `monitoring_stations` & `sensors`: 10 trạm quan trắc thực tế tại Hà Nội (tự động ánh xạ `administrative_area_id` bằng `ST_Contains`).
    - `pm25_observations`: 78 bản ghi quan trắc thực tế (chuỗi 24 giờ cho các trạm đo nồng độ trực tiếp `DIRECT_CONCENTRATION` và các trạm quy đổi từ chỉ số con `DERIVED_FROM_US_AQI`).
    - `model_grid_cells` & `model_pm25_values`: 4 ô lưới mô hình số trị CAMS Global `0.4° × 0.4°` (~40 km) và 52 bản ghi chuỗi thời gian/dự báo.
    - `weather_data`: 36 bản ghi khí tượng theo giờ tại Hà Nội.
    - `air_quality_alerts`: 3 cảnh báo ô nhiễm và kỹ thuật đang hoạt động.
    - `users`: 2 tài khoản (`admin@hanoi-pm25-gis.vn` vai trò `ADMIN` và `sinhvien@hanoi-pm25-gis.vn` vai trò `USER` mã hóa mật khẩu bằng `pgcrypto` `crypt(..., gen_salt('bf'))`).
- **Kiểm tra kiểu tĩnh TypeScript (`npm run typecheck`):** Đạt 100% (`0 errors` trên cả 3 gói `@hanoi-pm25/shared`, `@hanoi-pm25/api`, `@hanoi-pm25/web`).
- **Kiểm thử đơn vị & tích hợp PostGIS thực tế (`npm test` với Vitest + Supertest):** Đạt **15/15 bài kiểm thử (`3 test files passed`)**:
  - `packages/shared/src/__tests__/aqi-and-qc.test.ts` (6/6 passed).
  - `apps/web/src/__tests__/snapshot-and-inspector.test.ts` (3/3 passed).
  - `apps/api/src/__tests__/api-postgis.test.ts` (6/6 passed: kiểm thử trực tiếp với Supabase PostGIS cho `/api/health`, `/api/v1/stations`, `/api/v1/stations/:id/observations`, `/api/v1/gis/inspect-point` với `ST_Contains`/`ST_Distance`/`ST_DWithin`, `/api/v1/areas/:id/statistics` với `ST_Within`/`ST_Intersects`, và phân quyền RBAC `401`/`403`/`200` trên `/api/v1/auth/login` & `/api/v1/admin/audit-logs`).

---

## 2. Danh sách File đã tạo / sửa trong Giai đoạn 3

1. `database/migrations/001_init_postgis_schema.sql`
2. `database/migrations/001_rollback_postgis_schema.sql`
3. `database/seeds/001_seed_hanoi_base.sql`
4. `scripts/migrate-and-verify-postgis.mjs`
5. `scripts/postgis-verification-results.json`
6. `apps/api/package.json`, `apps/api/tsconfig.json`
7. `apps/api/src/config/env.ts`
8. `apps/api/src/db/pool.ts`
9. `apps/api/src/middleware/auth.ts`
10. `apps/api/src/middleware/errorHandler.ts`
11. `apps/api/src/routes/publicRoutes.ts`
12. `apps/api/src/routes/authAndUserRoutes.ts`
13. `apps/api/src/routes/adminRoutes.ts`
14. `apps/api/src/app.ts`, `apps/api/src/server.ts`
15. `apps/api/src/__tests__/api-postgis.test.ts`
