# CÁC BƯỚC TIẾP THEO — HANOI PM2.5 WEBGIS (`NEXT_STEPS.md`)

**Cập nhật lần cuối:** 2026-10-28 19:10 (GMT+7)  
**Trạng thái hiện tại:** Đã hoàn thành **Giai đoạn 0**, **Giai đoạn 1**, **Giai đoạn 2**, và **Giai đoạn 3** (Backend `@hanoi-pm25/api` + Cơ sở dữ liệu không gian Supabase PostgreSQL 17 / PostGIS 3.3.7 với 14 bảng và 15/15 bài kiểm thử tự động thành công).

---

## Kế hoạch triển khai GIAI ĐOẠN 4 — THU THẬP DỮ LIỆU THỰC TẾ TỰ ĐỘNG (DATA INGESTION WORKERS & SCHEDULER)

Ngay khi người dùng xác nhận chuyển sang **Giai đoạn 4**, thực hiện tuần tự các công việc sau:

1. **Xây dựng bộ thu thập dữ liệu (Ingestion Connectors) trong `apps/api/src/ingestion/`:**
   - `openaqWorker.ts`: Gọi OpenAQ API v3 (`https://api.openaq.org/v3/locations` và `/sensors/{id}/measurements` với header `X-API-Key`), đồng bộ toàn bộ 37 trạm tại Hà Nội, kiểm tra ranh giới `ST_Within` với `VN-HN`, chuẩn hóa thời gian UTC, gán `value_origin = 'DIRECT_CONCENTRATION'`, đánh giá `quality_flag` bằng `evaluatePm25QualityFlag()` và `freshness_status` bằng `evaluateFreshnessStatus()`, ghi vào `monitoring_stations`, `sensors`, `pm25_observations` (với `ON CONFLICT DO NOTHING / DO UPDATE`).
   - `waqiWorker.ts`: Gọi WAQI API (`https://api.waqi.info/v2/map/bounds` và `/feed/@{uid}/` với `WAQI_API_TOKEN`), lọc các trạm nằm trong địa giới Hà Nội bằng PostGIS `ST_Within` (tự động loại bỏ trạm Việt Trì, Phú Thọ ở ngoài ranh giới Hà Nội), lưu chỉ số con `raw_aqi_subindex = iaqi.pm25.v` và giá trị quy đổi tham khảo với `value_origin = 'DERIVED_FROM_US_AQI'`.
   - `openMeteoWorker.ts`: Gọi Open-Meteo Air Quality API (`CAMS Global 0.4° × 0.4°`) và Open-Meteo Weather API cho các ô lưới tại Hà Nội, cập nhật `air_quality_model_runs`, `model_pm25_values`, và `weather_data`.
2. **Xây dựng bộ điều phối & kiểm soát chất lượng (`ingestionOrchestrator.ts`):**
   - Ghi nhận chi tiết từng lần chạy vào bảng `ingestion_jobs` (`records_fetched`, `records_inserted`, `records_flagged_qc`, `duration_ms`, `status`), cập nhật `last_success_at` và `last_status` trên bảng `data_sources`.
   - Tự động phát hiện và tạo cảnh báo trong bảng `air_quality_alerts` khi nồng độ PM2.5 vượt ngưỡng hoặc khi trạm chuyển sang trạng thái `STALE`.
   - Cung cấp API `POST /api/v1/admin/ingestion/trigger` (bảo vệ bởi `requireRole('ADMIN')` hoặc `CRON_SECRET`) và script CLI `npm run ingest:now` để chạy thu thập dữ liệu thực tế ngay lập tức và kiểm chứng trong cơ sở dữ liệu PostGIS.
3. **Kiểm thử Giai đoạn 4:**
   - Chạy thực tế pipeline thu thập từ cả 4 nguồn (OpenAQ v3, WAQI, Open-Meteo CAMS, Open-Meteo Weather) vào Supabase PostGIS.
   - Viết bài kiểm thử tích hợp cho bộ lọc chất lượng dữ liệu (`quality_flag`), chống trùng lặp (`ON CONFLICT`), và xử lý lỗi khi API nguồn bị chậm.
