# TRẠNG THÁI DỰ ÁN — HANOI PM2.5 WEBGIS (`PROJECT_STATUS.md`)

> [!IMPORTANT]
> **Dành cho AI trong các phiên làm việc tiếp theo:** Hãy luôn đọc file này đầu tiên cùng với `NEXT_STEPS.md` và `ARCHITECTURE_DECISIONS.md` trước khi thực hiện bất kỳ thao tác nào.

**Cập nhật lần cuối:** 2026-10-28 19:53 (GMT+7)  
**Các giai đoạn đã hoàn thành:**
- **GIAI ĐOẠN 0 — KIỂM TRA MÔI TRƯỜNG VÀ KHẢO SÁT DỮ LIỆU:** **Hoàn thành 100%**
- **GIAI ĐOẠN 1 — PHÂN TÍCH YÊU CẦU & THIẾT KẾ HỆ THỐNG:** **Hoàn thành 100%**
- **GIAI ĐOẠN 2 — THIẾT KẾ UI/UX (LẤY CẢM HỨNG TỪ WINDY.COM) & KHỞI TẠO MONOREPO / FRONTEND:** **Hoàn thành 100%**
- **GIAI ĐOẠN 3 — BACKEND (`@hanoi-pm25/api`) VÀ CƠ SỞ DỮ LIỆU KHÔNG GIAN SUPABASE POSTGIS:** **Hoàn thành 100%**
- **GIAI ĐOẠN 4 — THU THẬP DỮ LIỆU THỰC TẾ TỰ ĐỘNG (DATA INGESTION WORKERS, QUALITY CONTROL & SCHEDULER):** **Hoàn thành 100%**
- **GIAI ĐOẠN 5 — TÍCH HỢP WEBGIS FRONTEND VỚI BACKEND POSTGIS API VÀ TRUY VẤN KHÔNG GIAN THỜI GIAN THỰC:** **Hoàn thành 100%**
- **GIAI ĐOẠN 6 — CẢNH BÁO Ô NHIỄM NÂNG CAO, LƯU ĐỊA ĐIỂM YÊU THÍCH (POSTGIS FAVORITES) VÀ PHÂN TÍCH TƯƠNG QUAN KHÍ TƯỢNG – PM2.5:** **Hoàn thành 100%**

**Giai đoạn tiếp theo:** **GIAI ĐOẠN 7 — QUẢN TRỊ HỆ THỐNG, GIAO DIỆN PHÂN QUYỀN RBAC (`ADMIN` / `USER`) & NHẬT KÝ KIỂM TOÁN (`audit_logs`)** (Chờ người dùng xác nhận chuyển giai đoạn)

---

## 1. Kết quả Kiểm thử Giai đoạn 6 (Cảnh báo nâng cao, Địa điểm yêu thích PostGIS & Phân tích tương quan khí tượng – PM2.5)

- **Mô-đun Phân tích Thống kê & Tương quan Khí tượng – PM2.5 (`packages/shared/src/analytics.ts` & `GET /api/v1/analysis/correlation`):**
  - Tính toán chính xác hệ số tương quan tuyến tính Pearson ($r$) giữa nồng độ PM2.5 (`µg/m³`) và 3 biến khí tượng: Tốc độ gió 10m (`km/h`), Độ ẩm tương đối (`%`), và Nhiệt độ không khí (`°C`).
  - Cung cấp giải thích khoa học chuẩn mực: chứng minh tương quan nghịch biến ($r < 0$) giữa tốc độ gió và nồng độ PM2.5 tại Hà Nội do cơ chế thông gió ngang, đồng thời cảnh báo không quy kết nhân quả đơn biến nếu tách rời nguồn phát thải nội đô và nghịch nhiệt bức xạ.
  - Tính toán phân phối thống kê (`Mean`, `Min`, `Max`, `StdDev`, `P90`) và tỷ lệ vượt ngưỡng QCVN 05:2023/BTNMT (`50 µg/m³`), WHO 2021 (`15 µg/m³`), cùng ngưỡng tùy chỉnh của người dùng.
- **Hệ thống Lưu Địa điểm Yêu thích & Cảnh báo Cá nhân hóa (`user_favorite_locations` trên Supabase PostGIS):**
  - Người dùng chọn bất kỳ tọa độ nào trên bản đồ Hà Nội trong `PointInspectorCard.tsx`, đặt tên địa điểm và thanh trượt ngưỡng cảnh báo PM2.5 cá nhân (`15–150 µg/m³`).
  - Backend `/api/v1/user/favorites` (`GET`, `POST`, `DELETE`) tự động giải quyết không gian bằng PostGIS (`<->` KNN tìm trạm quan trắc gần nhất và `ST_Contains` tìm đơn vị hành chính chứa điểm) và lưu đồng bộ vào bảng `user_favorite_locations` (hoặc `localStorage` dự phòng).
  - Ngăn kéo `AnalyticsDrawer.tsx` hiển thị trực quan thẻ tương quan Pearson ($r$), thẻ phân phối vượt ngưỡng WHO/QCVN, và danh sách địa điểm yêu thích kèm cảnh báo vượt ngưỡng cá nhân.
- **Kiểm tra kiểu tĩnh TypeScript (`npm run typecheck`) & Build (`npm run build`):** Đạt 100% (`0 errors`).
- **Kiểm thử tự động (`npm test`):** Đạt **22/22 bài kiểm thử (`3 test files passed`)**.

---

## 2. Danh sách File đã tạo / sửa trong Giai đoạn 6

1. `packages/shared/src/analytics.ts`
2. `packages/shared/src/index.ts`
3. `packages/shared/src/__tests__/aqi-and-qc.test.ts`
4. `apps/api/src/routes/publicRoutes.ts`
5. `apps/api/src/routes/authAndUserRoutes.ts`
6. `apps/api/src/__tests__/api-postgis.test.ts`
7. `apps/web/src/store/useWebGisStore.ts`
8. `apps/web/src/components/PointInspectorCard.tsx`
9. `apps/web/src/components/AnalyticsDrawer.tsx`
