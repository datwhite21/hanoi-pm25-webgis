# TRẠNG THÁI DỰ ÁN — HANOI PM2.5 WEBGIS (`PROJECT_STATUS.md`)

> [!IMPORTANT]
> **Dành cho AI trong các phiên làm việc tiếp theo:** Hãy luôn đọc file này đầu tiên cùng với `NEXT_STEPS.md` và `ARCHITECTURE_DECISIONS.md` trước khi thực hiện bất kỳ thao tác nào.

**Cập nhật lần cuối:** 2026-10-28 20:07 (GMT+7)  
**Các giai đoạn đã hoàn thành:**
- **GIAI ĐOẠN 0 — KIỂM TRA MÔI TRƯỜNG VÀ KHẢO SÁT DỮ LIỆU:** **Hoàn thành 100%**
- **GIAI ĐOẠN 1 — PHÂN TÍCH YÊU CẦU & THIẾT KẾ HỆ THỐNG:** **Hoàn thành 100%**
- **GIAI ĐOẠN 2 — THIẾT KẾ UI/UX (LẤY CẢM HỨNG TỪ WINDY.COM) & KHỞI TẠO MONOREPO / FRONTEND:** **Hoàn thành 100%**
- **GIAI ĐOẠN 3 — BACKEND (`@hanoi-pm25/api`) VÀ CƠ SỞ DỮ LIỆU KHÔNG GIAN SUPABASE POSTGIS:** **Hoàn thành 100%**
- **GIAI ĐOẠN 4 — THU THẬP DỮ LIỆU THỰC TẾ TỰ ĐỘNG (DATA INGESTION WORKERS, QUALITY CONTROL & SCHEDULER):** **Hoàn thành 100%**
- **GIAI ĐOẠN 5 — TÍCH HỢP WEBGIS FRONTEND VỚI BACKEND POSTGIS API VÀ TRUY VẤN KHÔNG GIAN THỜI GIAN THỰC:** **Hoàn thành 100%**
- **GIAI ĐOẠN 6 — CẢNH BÁO Ô NHIỄM NÂNG CAO, LƯU ĐỊA ĐIỂM YÊU THÍCH (POSTGIS FAVORITES) VÀ PHÂN TÍCH TƯƠNG QUAN KHÍ TƯỢNG – PM2.5:** **Hoàn thành 100%**
- **GIAI ĐOẠN 7 — QUẢN TRỊ HỆ THỐNG, GIAO DIỆN PHÂN QUYỀN RBAC (`ADMIN` / `USER` / `GUEST`) & NHẬT KÝ KIỂM TOÁN (`audit_logs`):** **Hoàn thành 100%**

**Giai đoạn tiếp theo:** **GIAI ĐOẠN 8 — KIỂM THỬ TOÀN DIỆN (END-TO-END, BẢO MẬT, HIỆU NĂNG POSTGIS & TỐI ƯU GÓI BUILD)** (Chờ người dùng xác nhận chuyển giai đoạn)

---

## 1. Kết quả Kiểm thử Giai đoạn 7 (Quản trị Hệ thống, Phân quyền RBAC & Nhật ký Kiểm toán `audit_logs`)

- **Trung tâm Quản trị Hệ thống & Phân quyền RBAC (`apps/web/src/components/AdminDashboardModal.tsx`):**
  - Hiển thị trực quan Ma trận phân quyền RBAC (`GUEST`, `USER`, `ADMIN`) và chặn truy cập (`HTTP 403 Forbidden`) khi vai trò hiện tại không phải `ADMIN`, kèm nút 1-click đăng nhập tài khoản Quản trị viên (`admin@hanoi-pm25-gis.vn`).
  - **Tab 1 — Tiến trình Thu thập Tự động (`ingestion_jobs`):** Xem lịch sử thực thi của các worker (`OPENAQ_V3`, `WAQI_API`, `OPEN_METEO_CAMS`, `OPEN_METEO_WEATHER`) và nút kích hoạt thu thập dữ liệu thực tế tức thời (`POST /api/v1/admin/ingestion/trigger`).
  - **Tab 2 — Quản lý Quy tắc & Xử lý Cảnh báo (`alert_rules` & `air_quality_alerts`):** Bật/tắt quy tắc cảnh báo, chỉnh sửa ngưỡng kích hoạt (`PATCH /api/v1/admin/alert-rules/:id`) và xác nhận/đóng cảnh báo (`PATCH /api/v1/admin/alerts/:id/status`).
  - **Tab 3 — Nhật ký Kiểm toán Bất biến (`audit_logs`):** Truy vết toàn bộ thao tác quản trị (thời điểm, email người thực hiện, bảng tác động, giá trị JSONB trước và sau khi sửa `old_values -> new_values`, và lý do).
- **Kiểm tra kiểu tĩnh TypeScript (`npm run typecheck`) & Build (`npm run build`):** Đạt 100% (`0 errors`).
- **Kiểm thử tự động (`npm test`):** Đạt **24/24 bài kiểm thử (`3 test files passed`)**.

---

## 2. Danh sách File đã tạo / sửa trong Giai đoạn 7

1. `apps/api/src/routes/adminRoutes.ts`
2. `apps/api/src/__tests__/api-postgis.test.ts`
3. `apps/web/src/services/apiClient.ts`
4. `apps/web/src/store/useWebGisStore.ts`
5. `apps/web/src/components/AdminDashboardModal.tsx`
6. `apps/web/src/components/FloatingHeader.tsx`
7. `apps/web/src/App.tsx`
8. `apps/web/src/__tests__/snapshot-and-inspector.test.ts`
