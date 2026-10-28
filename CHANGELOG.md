# LỊCH SỬ THAY ĐỔI (CHANGELOG)
## Dự án: Hanoi PM2.5 GIS

---

## [0.3.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 2: THIẾT KẾ UI/UX (WINDY-INSPIRED) & KHỞI TẠO MONOREPO / FRONTEND WEBGIS

### Đã thêm mới (Added)
- Tạo tài liệu đặc tả UI/UX: [`docs/architecture/UI_UX_DESIGN_SPECIFICATION.md`](docs/architecture/UI_UX_DESIGN_SPECIFICATION.md).
- Khởi tạo Monorepo với npm workspaces (`@hanoi-pm25/shared` và `@hanoi-pm25/web`).
- Xây dựng thư viện khoa học dùng chung `@hanoi-pm25/shared`:
  - Tính toán `VN_AQI` và `NowCast 12 giờ` theo Quyết định 1459/QĐ-TCMT.
  - Phân loại mức độ ô nhiễm PM2.5 theo QCVN 05:2023/BTNMT (`50 µg/m³`) và WHO (`15 µg/m³`).
  - Phân loại độ tươi dữ liệu (`FRESH`, `DELAYED`, `STALE`, `UNAVAILABLE`) và cờ kiểm soát chất lượng (`quality_flag`).
- Xây dựng giao diện WebGIS toàn màn hình `@hanoi-pm25/web` (React + TypeScript + Vite + Tailwind CSS + MapLibre GL JS + Recharts):
  - Bản đồ tương tác Hà Nội (`MapCanvas.tsx`) với lớp ranh giới hành chính, lưới ô mô hình CAMS Global (`0.4° × 0.4° ~ 40 km`) và các trạm quan trắc thực tế.
  - Hiệu ứng hạt gió chuyển động mượt (`WindParticleOverlay.tsx`) theo tốc độ và hướng gió thực tế.
  - Thanh Header nổi (`FloatingHeader.tsx`) tích hợp tìm kiếm trạm & Open-Meteo Geocoding API.
  - Sidebar chọn lớp (`LayerSidebar.tsx`), Popup chi tiết trạm (`StationPopupCard.tsx`), Popup truy vấn vị trí bất kỳ (`PointInspectorCard.tsx`), Thanh Timeline hoạt ảnh & Chú giải màu (`TimelineBar.tsx`), và Ngăn kéo Phân tích 5 tab kèm Xuất CSV (`AnalyticsDrawer.tsx`).
- Kiểm thử: Vượt qua 9/9 bài kiểm thử Vitest, `tsc --noEmit` 0 lỗi, và `vite build` thành công.
