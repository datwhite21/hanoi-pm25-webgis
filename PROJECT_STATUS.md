# TRẠNG THÁI DỰ ÁN — HANOI PM2.5 WEBGIS (`PROJECT_STATUS.md`)

> [!IMPORTANT]
> **Dành cho AI trong các phiên làm việc tiếp theo:** Hãy luôn đọc file này đầu tiên cùng với `NEXT_STEPS.md` và `ARCHITECTURE_DECISIONS.md` trước khi thực hiện bất kỳ thao tác nào.

**Cập nhật lần cuối:** 2026-10-28 19:39 (GMT+7)  
**Các giai đoạn đã hoàn thành:**
- **GIAI ĐOẠN 0 — KIỂM TRA MÔI TRƯỜNG VÀ KHẢO SÁT DỮ LIỆU:** **Hoàn thành 100%**
- **GIAI ĐOẠN 1 — PHÂN TÍCH YÊU CẦU & THIẾT KẾ HỆ THỐNG:** **Hoàn thành 100%**
- **GIAI ĐOẠN 2 — THIẾT KẾ UI/UX (LẤY CẢM HỨNG TỪ WINDY.COM) & KHỞI TẠO MONOREPO / FRONTEND:** **Hoàn thành 100%**
- **GIAI ĐOẠN 3 — BACKEND (`@hanoi-pm25/api`) VÀ CƠ SỞ DỮ LIỆU KHÔNG GIAN SUPABASE POSTGIS:** **Hoàn thành 100%**
- **GIAI ĐOẠN 4 — THU THẬP DỮ LIỆU THỰC TẾ TỰ ĐỘNG (DATA INGESTION WORKERS, QUALITY CONTROL & SCHEDULER):** **Hoàn thành 100%**
- **GIAI ĐOẠN 5 — TÍCH HỢP WEBGIS FRONTEND VỚI BACKEND POSTGIS API VÀ TRUY VẤN KHÔNG GIAN THỜI GIAN THỰC:** **Hoàn thành 100%**

**Giai đoạn tiếp theo:** **GIAI ĐOẠN 6 — CẢNH BÁO Ô NHIỄM NÂNG CAO, LƯU ĐỊA ĐIỂM YÊU THÍCH (POSTGIS FAVORITES) VÀ PHÂN TÍCH THỐNG KÊ CHUYÊN SÂU** (Chờ người dùng xác nhận chuyển giai đoạn)

---

## 1. Kết quả Kiểm thử Giai đoạn 5 (Tích hợp WebGIS Frontend + Backend PostGIS API)

- **Lớp dịch vụ API Client (`apps/web/src/services/apiClient.ts`):**
  - Đồng bộ tự động toàn bộ **57 trạm quan trắc trong địa giới Hà Nội** từ `GET /api/v1/stations` của Supabase PostGIS lên bản đồ MapLibre GL JS.
  - Tích hợp truy vấn không gian trực tiếp `GET /api/v1/gis/inspect-point` (`ST_Contains`, `ST_Distance`, `ST_DWithin`) khi người dùng nhấp chuột vào bất kỳ vị trí nào trên bản đồ.
  - Tích hợp truy vấn thống kê không gian theo đơn vị hành chính `GET /api/v1/areas/:id/statistics` (`ST_Within` & `ST_Intersects`) ngay trong thẻ `PointInspectorCard.tsx`, chứng minh nguyên tắc trung thực khoa học (khu vực có trạm đo trực tiếp như *Hai Bà Trưng*, *Thanh Xuân*, *Gia Lâm* hiển thị trung bình quan trắc; khu vực chưa có trạm như *Sóc Sơn* báo rõ `0 trạm` và tham chiếu ô lưới CAMS `0.4°`).
  - Tích hợp nút **"PostGIS Live (57 trạm)"** trên `FloatingHeader.tsx` để đồng bộ tức thời danh sách trạm, 10 cảnh báo hoạt động và 4 nguồn dữ liệu.
- **Kiểm tra kiểu tĩnh TypeScript (`npm run typecheck`):** Đạt 100% (`0 errors`).
- **Kiểm thử tự động (`npm test`):** Đạt **18/18 bài kiểm thử (`3 test files passed`)**.

---

## 2. Danh sách File đã tạo / sửa trong Giai đoạn 5

1. `apps/web/src/services/apiClient.ts`
2. `apps/web/src/store/useWebGisStore.ts`
3. `apps/web/src/App.tsx`
4. `apps/web/src/components/MapCanvas.tsx`
5. `apps/web/src/components/FloatingHeader.tsx`
6. `apps/web/src/components/PointInspectorCard.tsx`
7. `apps/web/src/components/AnalyticsDrawer.tsx`
8. `apps/web/src/__tests__/snapshot-and-inspector.test.ts`
