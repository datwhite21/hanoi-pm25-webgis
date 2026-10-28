# LỊCH SỬ THAY ĐỔI (CHANGELOG)
## Dự án: Hanoi PM2.5 GIS

---

## [0.9.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 8: KIỂM THỬ TOÀN DIỆN, ĐO KIỂM HIỆU NĂNG POSTGIS (`EXPLAIN ANALYZE`) & TỐI ƯU GÓI BUILD (`manualChunks`)

### Đã thêm mới (Added)
- Cấu hình tách gói (`manualChunks`) trong [`apps/web/vite.config.ts`](apps/web/vite.config.ts) thành `vendor-maplibre`, `vendor-react`, `vendor-icons`, và `index`, loại bỏ hoàn toàn cảnh báo kích thước chunk.
- Xây dựng kịch bản đo kiểm hiệu năng không gian PostGIS [`scripts/benchmark-postgis-and-security.mjs`](scripts/benchmark-postgis-and-security.mjs) và lưu kết quả thực thi `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` tại [`scripts/postgis-benchmark-results.json`](scripts/postgis-benchmark-results.json).
- Bổ sung kiểm thử bảo mật chống SQL Injection, kiểm tra biên Zod và xác thực JWT trong [`apps/api/src/__tests__/api-postgis.test.ts`](apps/api/src/__tests__/api-postgis.test.ts) (**25/25 bài kiểm thử thành công**).
- Xuất bản báo cáo kiểm thử toàn diện [`docs/testing/SYSTEM_TEST_REPORT.md`](docs/testing/SYSTEM_TEST_REPORT.md).

---

## [0.8.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 7: QUẢN TRỊ HỆ THỐNG, GIAO DIỆN PHÂN QUYỀN RBAC (`ADMIN` / `USER` / `GUEST`) & NHẬT KÝ KIỂM TOÁN (`audit_logs`)

### Đã thêm mới (Added)
- Xây dựng Trung tâm Quản trị Hệ thống & Phân quyền RBAC [`apps/web/src/components/AdminDashboardModal.tsx`](apps/web/src/components/AdminDashboardModal.tsx).
