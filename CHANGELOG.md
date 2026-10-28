# LỊCH SỬ THAY ĐỔI (CHANGELOG)
## Dự án: Hanoi PM2.5 GIS

---

## [0.8.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 7: QUẢN TRỊ HỆ THỐNG, GIAO DIỆN PHÂN QUYỀN RBAC (`ADMIN` / `USER` / `GUEST`) & NHẬT KÝ KIỂM TOÁN (`audit_logs`)

### Đã thêm mới (Added)
- Xây dựng Trung tâm Quản trị Hệ thống & Phân quyền RBAC [`apps/web/src/components/AdminDashboardModal.tsx`](apps/web/src/components/AdminDashboardModal.tsx):
  - Hiển thị Ma trận phân quyền RBAC (`GUEST`, `USER`, `ADMIN`) và màn hình chặn `HTTP 403 Forbidden` khi chưa có quyền `ADMIN`.
  - Quản lý tiến trình thu thập tự động (`ingestion_jobs`) và kích hoạt thu thập tức thời (`POST /api/v1/admin/ingestion/trigger`).
  - Quản lý quy tắc cảnh báo (`GET / PATCH /api/v1/admin/alert-rules`) và xác nhận xử lý cảnh báo (`PATCH /api/v1/admin/alerts/:id/status`).
  - Hiển thị bảng Nhật ký kiểm toán bất biến (`audit_logs`) ghi vết mọi thay đổi (`old_values -> new_values`).
- Mở rộng [`apps/api/src/routes/adminRoutes.ts`](apps/api/src/routes/adminRoutes.ts), [`apps/web/src/services/apiClient.ts`](apps/web/src/services/apiClient.ts), [`apps/web/src/store/useWebGisStore.ts`](apps/web/src/store/useWebGisStore.ts), [`FloatingHeader.tsx`](apps/web/src/components/FloatingHeader.tsx), và [`App.tsx`](apps/web/src/App.tsx).
- Kiểm thử: Vượt qua **24/24 bài kiểm thử tự động (`3 test files passed`)**.

---

## [0.7.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 6: CẢNH BÁO Ô NHIỄM NÂNG CAO, ĐỊA ĐIỂM YÊU THÍCH POSTGIS & PHÂN TÍCH TƯƠNG QUAN KHÍ TƯỢNG – PM2.5

### Đã thêm mới (Added)
- Xây dựng mô-đun phân tích thống kê và tương quan khí tượng – PM2.5 [`packages/shared/src/analytics.ts`](packages/shared/src/analytics.ts) và tích hợp địa điểm yêu thích PostGIS.

---

## [0.6.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 5: TÍCH HỢP WEBGIS FRONTEND VỚI BACKEND POSTGIS API & TRUY VẤN KHÔNG GIAN THỜI GIAN THỰC

### Đã thêm mới (Added)
- Xây dựng lớp dịch vụ [`apps/web/src/services/apiClient.ts`](apps/web/src/services/apiClient.ts) kết nối trực tiếp Frontend với Backend PostGIS API.
