# LỊCH SỬ THAY ĐỔI (CHANGELOG)
## Dự án: Hanoi PM2.5 GIS

---

## [0.6.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 5: TÍCH HỢP WEBGIS FRONTEND VỚI BACKEND POSTGIS API & TRUY VẤN KHÔNG GIAN THỜI GIAN THỰC

### Đã thêm mới (Added)
- Xây dựng lớp dịch vụ [`apps/web/src/services/apiClient.ts`](apps/web/src/services/apiClient.ts) kết nối trực tiếp Frontend (`@hanoi-pm25/web`) với Backend REST API (`@hanoi-pm25/api`) và cơ sở dữ liệu Supabase PostGIS:
  - Đồng bộ trực tiếp toàn bộ 57 trạm quan trắc trong địa giới Hà Nội (`fetchLiveStationsFromApi`).
  - Truy vấn không gian tại tọa độ bất kỳ (`fetchLivePointInspectionFromApi` -> `/api/v1/gis/inspect-point` với `ST_Contains`, `ST_Distance`, `ST_DWithin`).
  - Truy vấn thống kê không gian theo đơn vị hành chính (`fetchLiveAreaStatisticsFromApi` -> `/api/v1/areas/:id/statistics` với `ST_Within` & `ST_Intersects`).
  - Đồng bộ danh sách 10 cảnh báo hoạt động (`fetchLiveAlertsFromApi`) và trạng thái 4 nguồn dữ liệu (`fetchLiveDataSourcesFromApi`).
- Nâng cấp Zustand Store [`apps/web/src/store/useWebGisStore.ts`](apps/web/src/store/useWebGisStore.ts), [`MapCanvas.tsx`](apps/web/src/components/MapCanvas.tsx), [`FloatingHeader.tsx`](apps/web/src/components/FloatingHeader.tsx), [`PointInspectorCard.tsx`](apps/web/src/components/PointInspectorCard.tsx), và [`AnalyticsDrawer.tsx`](apps/web/src/components/AnalyticsDrawer.tsx).
- Kiểm thử: Vượt qua **18/18 bài kiểm thử Vitest + Supertest**.

---

## [0.5.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 4: THU THẬP DỮ LIỆU THỰC TẾ TỰ ĐỘNG (DATA INGESTION WORKERS, QUALITY CONTROL & SCHEDULER)

### Đã thêm mới (Added)
- Xây dựng hệ thống thu thập dữ liệu thực tế tự động (`openaqWorker.ts`, `waqiWorker.ts`, `openMeteoWorker.ts`, `ingestionOrchestrator.ts`, `scheduler.ts`, `runLiveIngestionCli.ts`).

---

## [0.4.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 3: BACKEND (`@hanoi-pm25/api`) & CƠ SỞ DỮ LIỆU KHÔNG GIAN SUPABASE POSTGIS

### Đã thêm mới (Added)
- Khởi tạo 14 bảng PostGIS trên Supabase và xây dựng gói Backend REST API `@hanoi-pm25/api`.
