# CÁC BƯỚC TIẾP THEO (NEXT STEPS)
## Dự án: Hanoi PM2.5 GIS

**Cập nhật lần cuối:** 2026-10-28 17:41 (GMT+7)

---

## 1. Thao tác thủ công cần Người dùng (Sinh viên) thực hiện ngay để hoàn tất 100% Giai đoạn 0

Trước khi chuyển sang **Giai đoạn 1 (Phân tích yêu cầu chi tiết & Thiết kế ERD/DFD)** hoặc xác minh danh sách trạm thực tế từ OpenAQ v3, bạn cần thực hiện 2 thao tác ngắn sau:

1. **(Tùy chọn khuyến nghị) Mở quyền chạy script `npm` trong PowerShell:**
   Chạy lệnh sau trong PowerShell để gọi `npm` trực tiếp không bị chặn `.ps1`:
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
   ```
2. **Đăng ký API Key miễn phí của OpenAQ v3 (và WAQI nếu muốn bổ sung nguồn đối chiếu):**
   - Tạo file `.env` tại thư mục gốc `c:\Users\ADMIN\Documents\DALN\.env` (bản sao từ `.env.example`).
   - Đăng ký tài khoản miễn phí tại https://explore.openaq.org/register, lấy API Key và điền vào dòng `OPENAQ_API_KEY=...` trong file `.env`.
   - *(Khuyến nghị thêm)* Đăng ký token miễn phí tại https://aqicn.org/data-platform/token/ và điền vào dòng `WAQI_API_TOKEN=...` trong file `.env`.
   - Nhắn lại cho AI xác nhận ***"Đã thêm API Key vào .env"*** (hoặc ***"Tiếp tục sang Giai đoạn 1"***) để AI chạy lại `node scripts/verify-data-sources.mjs`, ghi nhận danh sách trạm quan trắc thực tế tại Hà Nội và chuyển sang Giai đoạn 1.

---

## 2. Lộ trình Giai đoạn 1 (Sẽ thực hiện ngay sau khi bạn xác nhận)

Khi bước sang **GIAI ĐOẠN 1 — PHÂN TÍCH YÊU CẦU & THIẾT KẾ HỆ THỐNG**, AI sẽ tạo bộ tài liệu kỹ thuật đầy đủ trong `docs/requirements/`, `docs/architecture/`, `docs/gis/`, `docs/api/`:
1. Yêu cầu chức năng (Functional Requirements) và Phi chức năng (Non-Functional Requirements).
2. Sơ đồ Use Cases, User Stories và Tiêu chí nghiệm thu (Acceptance Criteria).
3. Kiến trúc tổng thể hệ thống (System Architecture) và Sơ đồ luồng dữ liệu (DFD Mức 0, Mức 1, Mức 2).
4. Sơ đồ Thực thể - Liên kết (Database ERD) cho 14 bảng PostgreSQL/PostGIS (`administrative_areas`, `monitoring_stations`, `sensors`, `pm25_observations`, `data_sources`, `air_quality_model_runs`, `model_grid_cells`, `model_pm25_values`, `weather_data`, `air_quality_alerts`, `ingestion_jobs`, `users`, `user_favorite_locations`, `audit_logs`).
5. Đặc tả kỹ thuật các phép phân tích không gian PostGIS (`ST_Distance`, `ST_DWithin`, `ST_Within`, `ST_Contains`, `ST_Intersects`) và quy tắc tính toán AQI (VN_AQI & US-EPA AQI).
