# TRẠNG THÁI DỰ ÁN — HANOI PM2.5 WEBGIS (`PROJECT_STATUS.md`)

> [!IMPORTANT]
> **Dành cho AI trong các phiên làm việc tiếp theo:** Hãy luôn đọc file này đầu tiên cùng với `NEXT_STEPS.md` và `ARCHITECTURE_DECISIONS.md` trước khi thực hiện bất kỳ thao tác nào.

**Cập nhật lần cuối:** 2026-10-28 19:28 (GMT+7)  
**Các giai đoạn đã hoàn thành:**
- **GIAI ĐOẠN 0 — KIỂM TRA MÔI TRƯỜNG VÀ KHẢO SÁT DỮ LIỆU:** **Hoàn thành 100%**
- **GIAI ĐOẠN 1 — PHÂN TÍCH YÊU CẦU & THIẾT KẾ HỆ THỐNG:** **Hoàn thành 100%**
- **GIAI ĐOẠN 2 — THIẾT KẾ UI/UX (LẤY CẢM HỨNG TỪ WINDY.COM) & KHỞI TẠO MONOREPO / FRONTEND:** **Hoàn thành 100%**
- **GIAI ĐOẠN 3 — BACKEND (`@hanoi-pm25/api`) VÀ CƠ SỞ DỮ LIỆU KHÔNG GIAN SUPABASE POSTGIS:** **Hoàn thành 100%**
- **GIAI ĐOẠN 4 — THU THẬP DỮ LIỆU THỰC TẾ TỰ ĐỘNG (DATA INGESTION WORKERS, QUALITY CONTROL & SCHEDULER):** **Hoàn thành 100%**

**Giai đoạn tiếp theo:** **GIAI ĐOẠN 5 — TÍCH HỢP WEBGIS FRONTEND VỚI BACKEND POSTGIS API VÀ TRUY VẤN KHÔNG GIAN THỜI GIAN THỰC** (Chờ người dùng xác nhận chuyển giai đoạn)

---

## 1. Kết quả Kiểm thử Giai đoạn 4 (Pipeline Thu thập Dữ liệu Thực tế & Kiểm soát Chất lượng)

- **Chạy thực tế Pipeline Thu thập Dữ liệu (`npm run ingest:now` -> `scripts/live-ingestion-results.json`):**
  1. **`OPENAQ_V3` (`SUCCESS` — 14.2s):** Đồng bộ toàn bộ **43 trạm** trong khung bao Hà Nội từ OpenAQ API v3, lấy dữ liệu đo trực tiếp (`DIRECT_CONCENTRATION`, đơn vị `µg/m³`) từ các trạm đang hoạt động, gán `freshness_status` (`FRESH`, `STALE`, `UNAVAILABLE`) và `quality_flag` tự động.
  2. **`WAQI_API` (`SUCCESS` — 4.6s):** Đồng bộ **11 trạm** từ WAQI Map Bounds API, quy đổi tham khảo chỉ số con US-EPA AQI sang nồng độ tương đương kèm nhãn bắt buộc `value_origin = 'DERIVED_FROM_US_AQI'`. Tự động phát hiện và gắn cờ **`OUTSIDE_STUDY_AREA`** (`is_within_hanoi = FALSE`, `recordsFlaggedQc = 1`) cho trạm *Viet Tri, Vietnam (Tp Việt Trì)* nằm ngoài địa giới hành chính Hà Nội (`VN-HN`).
  3. **`OPEN_METEO_CAMS` (`SUCCESS` — 2.7s):** Thu thập **288 mốc thời gian** từ mô hình số trị CAMS Global (`0.4° × 0.4°` ~ 40 km) và nạp theo lô (`UNNEST`) **96 bản ghi** quá khứ + dự báo vào `model_pm25_values`.
  4. **`OPEN_METEO_WEATHER` (`SUCCESS` — 1.5s):** Thu thập và nạp theo lô **48 bản ghi** khí tượng theo giờ (nhiệt độ, độ ẩm, tốc độ gió, hướng gió, lượng mưa, áp suất) vào `weather_data`.
  5. **Tổng kết dữ liệu trong Supabase PostGIS sau khi chạy:** `total_stations: 58` (`within_hanoi_stations: 57`, `outside_hanoi_stations: 1`), `fresh_stations: 13`, `total_observations: 163` (`valid_observations: 162`, `flagged_qc_observations: 1`), `total_model_values: 436`, `total_weather_rows: 48`, `active_alerts: 10`.
- **Kiểm tra kiểu tĩnh TypeScript (`npm run typecheck`):** Đạt 100% (`0 errors`).
- **Kiểm thử tự động (`npm test`):** Đạt **17/17 bài kiểm thử (`3 test files passed`)**.

---

## 2. Danh sách File đã tạo / sửa trong Giai đoạn 4

1. `packages/shared/src/aqi.ts`, `packages/shared/src/__tests__/aqi-and-qc.test.ts` (bổ sung `convertUsAqiToApproximatePm25UgM3`)
2. `apps/api/src/ingestion/openaqWorker.ts`
3. `apps/api/src/ingestion/waqiWorker.ts`
4. `apps/api/src/ingestion/openMeteoWorker.ts`
5. `apps/api/src/ingestion/ingestionOrchestrator.ts`
6. `apps/api/src/ingestion/scheduler.ts`
7. `apps/api/src/ingestion/runLiveIngestionCli.ts`
8. `apps/api/src/routes/adminRoutes.ts` (bổ sung `POST /api/v1/admin/ingestion/trigger` và `GET /api/v1/admin/ingestion/jobs`)
9. `apps/api/src/__tests__/api-postgis.test.ts`
10. `scripts/live-ingestion-results.json`
