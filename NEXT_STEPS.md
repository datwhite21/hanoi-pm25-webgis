# CÁC BƯỚC TIẾP THEO — HANOI PM2.5 WEBGIS (`NEXT_STEPS.md`)

**Cập nhật lần cuối:** 2026-10-28 19:30 (GMT+7)  
**Trạng thái hiện tại:** Đã hoàn thành **Giai đoạn 0**, **Giai đoạn 1**, **Giai đoạn 2**, **Giai đoạn 3**, và **Giai đoạn 4** (Pipeline thu thập dữ liệu thực tế từ OpenAQ v3, WAQI API, Open-Meteo CAMS Global và Open-Meteo Weather vào Supabase PostGIS với 58 trạm, 163 bản ghi quan trắc, 436 bản ghi mô hình, 48 bản ghi thời tiết, 10 cảnh báo hoạt động và 17/17 bài kiểm thử tự động thành công).

---

## Kế hoạch triển khai GIAI ĐOẠN 5 — TÍCH HỢP WEBGIS FRONTEND VỚI BACKEND POSTGIS API & TRUY VẤN KHÔNG GIAN THỜI GIAN THỰC

Ngay khi người dùng xác nhận chuyển sang **Giai đoạn 5**, thực hiện tuần tự các công việc sau:

1. **Kết nối Frontend (`@hanoi-pm25/web`) với Backend REST API (`@hanoi-pm25/api`):**
   - Tạo lớp dịch vụ API Client `apps/web/src/services/apiClient.ts` có khả năng tự động kết nối tới Backend API (`VITE_API_BASE_URL` / proxy `/api`), đồng thời giữ cơ chế fallback an toàn nếu chạy độc lập khi mất kết nối mạng.
   - Tích hợp nút **"Đồng bộ dữ liệu thực tế (Live PostGIS)"** và trạng thái kết nối trực tiếp (`LIVE SUPABASE POSTGIS — 57 trạm Hà Nội`) ngay trên `FloatingHeader.tsx`.
2. **Nâng cấp Truy vấn Không gian PostGIS trực tiếp trên Bản đồ (`MapCanvas.tsx` & `PointInspectorCard.tsx`):**
   - Khi người dùng nhấp vào bất kỳ điểm nào trên bản đồ Hà Nội, gọi trực tiếp `GET /api/v1/gis/inspect-point?lat=...&lon=...` để hiển thị kết quả tính toán từ PostGIS (`ST_Contains`, `ST_Distance`, `ST_DWithin`).
   - Khi người dùng chọn một đơn vị hành chính trên bản đồ hoặc trong bảng thống kê, gọi `GET /api/v1/areas/:id/statistics` (`ST_Within` & `ST_Intersects`) để hiển thị rõ ràng khu vực có trạm đo thực tế hay đang tham chiếu lớp nền mô hình CAMS `0.4°`.
   - Cấu hình Vite Dev Proxy trong `apps/web/vite.config.ts` chuyển tiếp `/api` sang `http://localhost:4000/api` để chạy đồng thời Frontend + Backend mượt mà.
3. **Kiểm thử Giai đoạn 5:**
   - Kiểm thử tích hợp luồng dữ liệu từ Supabase PostGIS -> Backend API -> Frontend Store/UI.
   - Chạy `npm run typecheck`, `npm test`, và `npm run build`.
