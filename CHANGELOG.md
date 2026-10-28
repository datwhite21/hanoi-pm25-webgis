# LỊCH SỬ THAY ĐỔI (CHANGELOG)
## Dự án: Hanoi PM2.5 GIS

---

## [0.7.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 6: CẢNH BÁO Ô NHIỄM NÂNG CAO, ĐỊA ĐIỂM YÊU THÍCH POSTGIS & PHÂN TÍCH TƯƠNG QUAN KHÍ TƯỢNG – PM2.5

### Đã thêm mới (Added)
- Xây dựng mô-đun phân tích thống kê và tương quan khí tượng – PM2.5 [`packages/shared/src/analytics.ts`](packages/shared/src/analytics.ts):
  - `calculatePearsonCorrelation`: Tính hệ số tương quan tuyến tính Pearson ($r$) kèm phân loại độ mạnh và chiều hướng (`NGHỊCH_BIẾN`, `ĐỒNG_BIẾN`, `KHÔNG_RÕ`).
  - `analyzeMeteorologicalPm25Coupling`: Phân tích đồng thời mối liên hệ giữa PM2.5 (`µg/m³`) với tốc độ gió 10m (`km/h`), độ ẩm tương đối (`%`) và nhiệt độ (`°C`), kèm giải thích khoa học chuẩn mực về cơ chế khuếch tán khí quyển tại Hà Nội.
  - `computeExceedanceSummary`: Tính toán phân phối (`Mean`, `Min`, `Max`, `StdDev`, `P90`) và tỷ lệ vượt ngưỡng WHO 2021 (`15 µg/m³`), QCVN 05:2023/BTNMT (`50 µg/m³`), cùng ngưỡng tùy chỉnh của người dùng.
- Bổ sung API `GET /api/v1/analysis/correlation` trong [`apps/api/src/routes/publicRoutes.ts`](apps/api/src/routes/publicRoutes.ts) và nâng cấp `GET / POST / DELETE /api/v1/user/favorites` trong [`apps/api/src/routes/authAndUserRoutes.ts`](apps/api/src/routes/authAndUserRoutes.ts) sử dụng PostGIS `<->` và `ST_Contains`.
- Nâng cấp [`PointInspectorCard.tsx`](apps/web/src/components/PointInspectorCard.tsx) và [`AnalyticsDrawer.tsx`](apps/web/src/components/AnalyticsDrawer.tsx) cho phép người dùng lưu địa điểm yêu thích với thanh trượt ngưỡng PM2.5 cá nhân và xem trực tiếp ma trận tương quan Pearson ($r$).
- Kiểm thử: Vượt qua **22/22 bài kiểm thử tự động (`3 test files passed`)**.

---

## [0.6.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 5: TÍCH HỢP WEBGIS FRONTEND VỚI BACKEND POSTGIS API & TRUY VẤN KHÔNG GIAN THỜI GIAN THỰC

### Đã thêm mới (Added)
- Xây dựng lớp dịch vụ [`apps/web/src/services/apiClient.ts`](apps/web/src/services/apiClient.ts) kết nối trực tiếp Frontend (`@hanoi-pm25/web`) với Backend REST API (`@hanoi-pm25/api`) và cơ sở dữ liệu Supabase PostGIS.
- Kiểm thử: Vượt qua **18/18 bài kiểm thử Vitest + Supertest**.

---

## [0.5.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 4: THU THẬP DỮ LIỆU THỰC TẾ TỰ ĐỘNG (DATA INGESTION WORKERS, QUALITY CONTROL & SCHEDULER)

### Đã thêm mới (Added)
- Xây dựng hệ thống thu thập dữ liệu thực tế tự động (`openaqWorker.ts`, `waqiWorker.ts`, `openMeteoWorker.ts`, `ingestionOrchestrator.ts`, `scheduler.ts`, `runLiveIngestionCli.ts`).

---

## [0.4.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 3: BACKEND (`@hanoi-pm25/api`) & CƠ SỞ DỮ LIỆU KHÔNG GIAN SUPABASE POSTGIS

### Đã thêm mới (Added)
- Khởi tạo 14 bảng PostGIS trên Supabase và xây dựng gói Backend REST API `@hanoi-pm25/api`.
