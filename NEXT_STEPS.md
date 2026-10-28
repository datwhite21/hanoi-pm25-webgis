# CÁC BƯỚC TIẾP THEO — HANOI PM2.5 WEBGIS (`NEXT_STEPS.md`)

**Cập nhật lần cuối:** 2026-10-28 19:53 (GMT+7)  
**Trạng thái hiện tại:** Đã hoàn thành **Giai đoạn 0**, **Giai đoạn 1**, **Giai đoạn 2**, **Giai đoạn 3**, **Giai đoạn 4**, **Giai đoạn 5**, và **Giai đoạn 6** (Hoàn thiện thuật toán tương quan Pearson $r$ giữa khí tượng và PM2.5, thống kê tỷ lệ vượt ngưỡng QCVN 05:2023 & WHO 2021, lưu địa điểm yêu thích PostGIS với ngưỡng cảnh báo tùy chỉnh, và vượt qua 22/22 bài kiểm thử tự động).

---

## Kế hoạch triển khai GIAI ĐOẠN 7 — QUẢN TRỊ HỆ THỐNG, GIAO DIỆN PHÂN QUYỀN RBAC (`ADMIN` / `USER`) & NHẬT KÝ KIỂM TOÁN (`audit_logs`)

Ngay khi người dùng xác nhận chuyển sang **Giai đoạn 7**, thực hiện tuần tự các công việc sau:

1. **Xây dựng Hộp thoại Đăng nhập / Chuyển đổi Vai trò RBAC (`GUEST`, `USER`, `ADMIN`) & Quản lý Phiên JWT (`AuthAndAdminModal.tsx`):**
   - Cho phép đăng nhập trực tiếp với tài khoản `ADMIN` (`admin@hanoi-pm25-gis.vn`) hoặc `USER` (`sinhvien@hanoi-pm25-gis.vn`) kết nối API `/api/v1/auth/login` (lưu JWT `accessToken` và đồng bộ tự động danh sách địa điểm yêu thích từ bảng `user_favorite_locations` trong Supabase PostGIS).
2. **Xây dựng Bảng điều khiển Quản trị viên (`AdminDashboardModal.tsx` dành riêng cho `ADMIN`):**
   - Hiển thị lịch sử các tiến trình thu thập dữ liệu (`GET /api/v1/admin/ingestion/jobs`) và nút kích hoạt thu thập tức thời (`POST /api/v1/admin/ingestion/trigger`).
   - Cho phép Quản trị viên cấu hình bật/tắt hoặc điều chỉnh ngưỡng quy tắc cảnh báo (`PATCH /api/v1/admin/alert-rules/:id`) và xác nhận xử lý cảnh báo (`POST /api/v1/admin/alerts/:id/acknowledge`).
   - Hiển thị bảng Nhật ký kiểm toán hệ thống (`GET /api/v1/admin/audit-logs`) ghi vết đầy đủ người thực hiện, hành động, đối tượng và dữ liệu trước/sau (`before_state`, `after_state`).
3. **Kiểm thử Giai đoạn 7:**
   - Viết bài kiểm thử cho luồng quản trị và kiểm tra `npm run typecheck`, `npm test`, `npm run build`.
