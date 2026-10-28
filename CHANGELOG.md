# LỊCH SỬ THAY ĐỔI (CHANGELOG)
## Dự án: Hanoi PM2.5 GIS

---

## [0.2.0] - 2026-10-28 — HOÀN TẤT XÁC MINH TRẠM THỰC TẾ (GIAI ĐOẠN 0) & HOÀN THÀNH PHÂN TÍCH YÊU CẦU (GIAI ĐOẠN 1)

### Đã thêm mới (Added)
- Xác minh thành công 100% với `OPENAQ_API_KEY` và `WAQI_API_TOKEN` thực tế tại Hà Nội:
  - Ghi nhận **37 trạm đo PM2.5 (`µg/m³`) trên OpenAQ v3** tại Hà Nội (32 trạm thuộc *Hanoi Air Quality Monitoring Network*), lấy thành công nồng độ PM2.5 mới nhất của 5 trạm đang hoạt động trong ngày (`33.60` – `49.40 µg/m³`).
  - Ghi nhận **10 trạm trên WAQI** nằm trong địa giới Hà Nội (`AQI` từ `71` đến `122`).
- Hoàn thành trọn bộ 7 tài liệu Phân tích & Thiết kế của **Giai đoạn 1**:
  - [`docs/requirements/FUNCTIONAL_REQUIREMENTS.md`](docs/requirements/FUNCTIONAL_REQUIREMENTS.md)
  - [`docs/requirements/NON_FUNCTIONAL_REQUIREMENTS.md`](docs/requirements/NON_FUNCTIONAL_REQUIREMENTS.md)
  - [`docs/requirements/USE_CASES_AND_USER_STORIES.md`](docs/requirements/USE_CASES_AND_USER_STORIES.md)
  - [`docs/architecture/SYSTEM_ARCHITECTURE_AND_DFD.md`](docs/architecture/SYSTEM_ARCHITECTURE_AND_DFD.md)
  - [`docs/architecture/DATABASE_ERD.md`](docs/architecture/DATABASE_ERD.md)
  - [`docs/gis/GIS_AND_AQI_SPECIFICATION.md`](docs/gis/GIS_AND_AQI_SPECIFICATION.md)
  - [`docs/api/API_SPECIFICATION.md`](docs/api/API_SPECIFICATION.md)

---

## [0.1.0] - 2026-10-28 — GIAI ĐOẠN 0: KIỂM TRA MÔI TRƯỜNG & KHẢO SÁT DỮ LIỆU BAN ĐẦU
- Khởi tạo Git repository (`main`), `.gitignore`, `.env.example`, `scripts/verify-data-sources.mjs` và 6 tài liệu khảo sát Giai đoạn 0.
