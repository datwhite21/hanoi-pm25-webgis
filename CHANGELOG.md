# LỊCH SỬ THAY ĐỔI (CHANGELOG)
## Dự án: Hanoi PM2.5 GIS

Mọi thay đổi quan trọng của dự án theo từng giai đoạn được ghi nhận tại đây.

---

## [0.1.0] - 2026-10-28 — GIAI ĐOẠN 0: KIỂM TRA MÔI TRƯỜNG & KHẢO SÁT DỮ LIỆU

### Đã thêm mới (Added)
- Khởi tạo kho lưu trữ Git (`main` branch) và cấu hình `.gitignore`, `.env.example`, `README.md`.
- Xây dựng công cụ kiểm chứng tự động kết nối API thực tế: [`scripts/verify-data-sources.mjs`](scripts/verify-data-sources.mjs) và xuất kết quả thực nghiệm tại [`scripts/verification-results.json`](scripts/verification-results.json).
- Hoàn thành bộ 6 tài liệu khảo sát và chính sách dữ liệu của Giai đoạn 0 trong thư mục `docs/`:
  - [`docs/DATA_SOURCE_AUDIT.md`](docs/DATA_SOURCE_AUDIT.md)
  - [`docs/REALTIME_DATA_VERIFICATION.md`](docs/REALTIME_DATA_VERIFICATION.md)
  - [`docs/DATA_QUALITY_POLICY.md`](docs/DATA_QUALITY_POLICY.md)
  - [`docs/FEASIBILITY_REPORT.md`](docs/FEASIBILITY_REPORT.md)
  - [`docs/INSTALLATION_GUIDE.md`](docs/INSTALLATION_GUIDE.md)
  - [`docs/PROJECT_SCOPE.md`](docs/PROJECT_SCOPE.md)
- Thiết lập hệ thống tài liệu theo dõi trạng thái liên tục: `PROJECT_STATUS.md`, `NEXT_STEPS.md`, `ARCHITECTURE_DECISIONS.md`, `CHANGELOG.md`.

### Đã khắc phục (Fixed)
- Hướng dẫn xử lý lỗi đường dẫn của hook `googlecloudtools.datacloud_telemetry` trên môi trường Windows trong Antigravity.
- Phát hiện và thay thế `nominatim.openstreetmap.org` (bị lỗi phân giải DNS `ENOTFOUND`) bằng `Open-Meteo Geocoding API` (`HTTP 200 OK`) kết hợp truy vấn PostGIS nội bộ.
