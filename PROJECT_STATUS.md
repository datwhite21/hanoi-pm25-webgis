# TRẠNG THÁI DỰ ÁN — HANOI PM2.5 WEBGIS (`PROJECT_STATUS.md`)

> [!IMPORTANT]
> **Dành cho AI trong các phiên làm việc tiếp theo:** Hãy luôn đọc file này đầu tiên cùng với `NEXT_STEPS.md` và `ARCHITECTURE_DECISIONS.md` trước khi thực hiện bất kỳ thao tác nào.

**Cập nhật lần cuối:** 2026-10-28 18:05 (GMT+7)  
**Giai đoạn vừa hoàn thành:**
- **GIAI ĐOẠN 0 — KIỂM TRA MÔI TRƯỜNG VÀ KHẢO SÁT DỮ LIỆU:** **Hoàn thành 100%**
- **GIAI ĐOẠN 1 — PHÂN TÍCH YÊU CẦU & THIẾT KẾ HỆ THỐNG:** **Hoàn thành 100%**
**Giai đoạn tiếp theo:** **GIAI ĐOẠN 2 — THIẾT KẾ UI/UX & KHỞI TẠO MONOREPO / FRONTEND LAYOUT** (Chờ người dùng xác nhận chuyển giai đoạn)

---

## 1. Kết quả đã hoàn thành ở Giai đoạn 0 (100%)

1. **Môi trường phát triển:**
   - Node.js `v24.22.1`, npm `11.19.1` (PowerShell ExecutionPolicy đã mở `RemoteSigned`, chạy `npm -v` trực tiếp thành công), Git `2.56.0.windows.3`.
   - File `.env` đã được người dùng cấu hình đầy đủ `OPENAQ_API_KEY` và `WAQI_API_TOKEN` (được bảo vệ bởi `.gitignore`).
2. **Kiểm chứng dữ liệu thực tế tại Hà Nội (`scripts/verify-data-sources.mjs` & `scripts/verification-results.json`):**
   - **OpenAQ API v3 (`HTTP 200 OK`):** Tìm thấy **37 trạm đo PM2.5 (`µg/m³`) tại Hà Nội** (trong đó 32 trạm thuộc *Hanoi Air Quality Monitoring Network*). Có **5 trạm phát dữ liệu trong ngày 28/10/2026**:
     - *Công viên Nhân Chính - Khuất Duy Tiến* (`4946812`): **`33.60 µg/m³`** lúc `17:35` (`FRESH`)
     - *Số 1 đường Giải Phóng - P. Bạch Mai - ĐHBK* (`4946813`): **`44.28 µg/m³`** lúc `17:35` (`FRESH`)
     - *Dragon - Gia Lâm* (`6123215`): **`49.40 µg/m³`** lúc `17:00` (`FRESH`)
     - *Số 46, phố Lưu Quang Vũ* (`2161292`): **`35.66 µg/m³`** lúc `08:00` (`STALE`)
     - *Minh Khai - Bắc Từ Liêm* (`2161306`): **`40.36 µg/m³`** lúc `08:00` (`STALE`)
     - 32 trạm còn lại có dữ liệu lịch sử 2016–2026, hiện ở trạng thái `UNAVAILABLE`.
   - **WAQI API (`HTTP 200 OK`):** Tìm thấy **10 trạm trong địa giới Hà Nội** (như *UNIS Tây Hồ* `AQI 122`, *Mộ Lao Hà Đông* `AQI 110`, *Phố Nguyễn Duy Trinh* `AQI 96`, *Tây Hồ Ward* `AQI 81`, *Nhân Chính* `AQI 81`, *ĐHBK Giải Phóng* `AQI 71`) và 1 trạm ở Việt Trì nằm góc Tây Bắc bbox (sẽ được lọc tự động bằng `ST_Within` của PostGIS).
   - **Open-Meteo Air Quality & Weather & Geocoding API (`HTTP 200 OK`):** Dữ liệu mô hình CAMS Global (`40.6 – 47.0 µg/m³`) khớp rất sát với số đo trạm thực tế tại Hà Nội (`33.60 – 49.40 µg/m³`).

---

## 2. Kết quả đã hoàn thành ở Giai đoạn 1 (100%)

Đã xây dựng hoàn chỉnh bộ tài liệu Phân tích Yêu cầu & Thiết kế Kiến trúc / Database / GIS / API:
1. [`docs/requirements/FUNCTIONAL_REQUIREMENTS.md`](docs/requirements/FUNCTIONAL_REQUIREMENTS.md) — Đặc tả 24 nhóm yêu cầu chức năng (`FR-MAP`, `FR-INGEST`, `FR-GIS`, `FR-ANALYTICS`, `FR-ALERT`, `FR-USER`).
2. [`docs/requirements/NON_FUNCTIONAL_REQUIREMENTS.md`](docs/requirements/NON_FUNCTIONAL_REQUIREMENTS.md) — Đặc tả yêu cầu phi chức năng về tính trung thực khoa học, hiệu năng PostGIS/MapLibre, bảo mật và khả năng chịu lỗi.
3. [`docs/requirements/USE_CASES_AND_USER_STORIES.md`](docs/requirements/USE_CASES_AND_USER_STORIES.md) — Sơ đồ Use Cases, User Stories và Acceptance Criteria chi tiết.
4. [`docs/architecture/SYSTEM_ARCHITECTURE_AND_DFD.md`](docs/architecture/SYSTEM_ARCHITECTURE_AND_DFD.md) — Kiến trúc tổng thể 4 tầng và Sơ đồ luồng dữ liệu DFD Mức 0 & Mức 1.
5. [`docs/architecture/DATABASE_ERD.md`](docs/architecture/DATABASE_ERD.md) — Sơ đồ Thực thể Liên kết (ERD) đầy đủ 14 bảng PostgreSQL/PostGIS kèm thiết kế chỉ mục không gian `GIST` và ràng buộc chống trùng lặp.
6. [`docs/gis/GIS_AND_AQI_SPECIFICATION.md`](docs/gis/GIS_AND_AQI_SPECIFICATION.md) — Đặc tả câu lệnh PostGIS (`ST_Distance`, `ST_DWithin`, `ST_Within`, `ST_Contains`, `ST_Intersects`) và công thức tính `VN_AQI` (Quyết định 1459/QĐ-TCMT), QCVN 05:2023/BTNMT và WHO.
7. [`docs/api/API_SPECIFICATION.md`](docs/api/API_SPECIFICATION.md) — Đặc tả đầy đủ các REST API endpoints (`/api/v1/*`) và Server-Sent Events.

---

## 3. Việc cần người dùng thực hiện & Bước tiếp theo

- **Không cần cài đặt hay cấu hình thủ công thêm ở bước này.**
- Người dùng chỉ cần xem báo cáo và xác nhận chuyển sang **GIAI ĐOẠN 2 — THIẾT KẾ UI/UX & KHỞI TẠO WORKSPACE MONOREPO (`apps/web`, `apps/api`, `packages/shared`)**.
