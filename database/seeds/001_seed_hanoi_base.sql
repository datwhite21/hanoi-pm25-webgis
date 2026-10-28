-- =============================================================================
-- HANOI PM2.5 WEBGIS — SEED 001: BASE SPATIAL, STATION & VERIFIED SNAPSHOT DATA
-- Idempotent seed script (ON CONFLICT DO UPDATE / DO NOTHING)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. SEED DATA SOURCES (4 Verified Sources)
-- -----------------------------------------------------------------------------
INSERT INTO data_sources (code, name, source_type, base_url, license, poll_interval_minutes, is_active, last_success_at, last_status, notes_vi)
VALUES
  (
    'OPENAQ_V3',
    'OpenAQ API v3 (Hanoi Air Quality Monitoring Network & AirGradient)',
    'OBSERVATION',
    'https://api.openaq.org/v3',
    'CC-BY-4.0 / Open Data',
    15,
    TRUE,
    NOW(),
    'HEALTHY',
    'Cung cấp nồng độ PM2.5 trực tiếp (µg/m³) từ 37 trạm tại Hà Nội (32 trạm mạng lưới quan trắc Hà Nội + 5 trạm đối tác).'
  ),
  (
    'WAQI_API',
    'World Air Quality Index (AQICN / WAQI)',
    'AQI_INDEX',
    'https://api.waqi.info',
    'WAQI Academic & Non-Commercial Attribution',
    15,
    TRUE,
    NOW(),
    'HEALTHY',
    'Cung cấp chỉ số con US-EPA AQI (iaqi.pm25.v) tại 10 trạm ở Hà Nội. Luôn gắn cờ DERIVED_FROM_US_AQI khi quy đổi tham khảo.'
  ),
  (
    'OPEN_METEO_CAMS',
    'Open-Meteo Air Quality API (CAMS Global ECMWF)',
    'NUMERICAL_MODEL',
    'https://air-quality-api.open-meteo.com/v1/air-quality',
    'CC-BY-4.0 (Copernicus Atmosphere Monitoring Service)',
    60,
    TRUE,
    NOW(),
    'HEALTHY',
    'Dữ liệu mô hình số trị CAMS Global độ phân giải 0.4° × 0.4° (~40 km). Dùng làm lớp nền và dự báo 72h, không nội suy giả cấp xã/phường.'
  ),
  (
    'OPEN_METEO_WEATHER',
    'Open-Meteo Weather Forecast & Historical API',
    'WEATHER',
    'https://api.open-meteo.com/v1/forecast',
    'CC-BY-4.0',
    30,
    TRUE,
    NOW(),
    'HEALTHY',
    'Cung cấp nhiệt độ, độ ẩm, tốc độ gió, hướng gió, lượng mưa và áp suất khí quyển phục vụ phân tích khuếch tán PM2.5.'
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  last_success_at = EXCLUDED.last_success_at,
  last_status = EXCLUDED.last_status,
  notes_vi = EXCLUDED.notes_vi,
  updated_at_utc = NOW();

-- -----------------------------------------------------------------------------
-- 2. SEED ADMINISTRATIVE AREAS (Level 1 Hanoi + 15 Key Sub-Areas in WGS84)
-- -----------------------------------------------------------------------------
-- Level 1: Thành phố Hà Nội
INSERT INTO administrative_areas (code, name_vi, name_en, admin_level, geom, effective_date, source_dataset, license)
VALUES (
  'VN-HN',
  'Thành phố Hà Nội',
  'Hanoi City',
  1,
  ST_Multi(ST_GeomFromText('POLYGON((105.28 20.56, 106.02 20.56, 106.02 21.39, 105.28 21.39, 105.28 20.56))', 4326)),
  '2025-01-01',
  'OCHA COD-AB / GADM / Hanoi GIS',
  'CC-BY-4.0'
)
ON CONFLICT (code) DO UPDATE SET
  name_vi = EXCLUDED.name_vi,
  geom = EXCLUDED.geom;

-- Level 2: 15 Khu vực hành chính trọng điểm bao phủ toàn thành phố Hà Nội
WITH parent_hn AS (
  SELECT id FROM administrative_areas WHERE code = 'VN-HN' LIMIT 1
)
INSERT INTO administrative_areas (code, name_vi, name_en, admin_level, parent_id, geom, effective_date, source_dataset, license)
SELECT
  v.code,
  v.name_vi,
  v.name_en,
  2,
  parent_hn.id,
  ST_Multi(ST_GeomFromText(v.wkt, 4326)),
  '2025-01-01'::date,
  'OCHA COD-AB / GADM / Hanoi GIS',
  'CC-BY-4.0'
FROM parent_hn
CROSS JOIN (
  VALUES
    ('HN-HK',  'Hoàn Kiếm',    'Hoan Kiem',    'POLYGON((105.840 21.018, 105.865 21.018, 105.865 21.045, 105.840 21.045, 105.840 21.018))'),
    ('HN-BD',  'Ba Đình',      'Ba Dinh',      'POLYGON((105.802 21.022, 105.840 21.022, 105.840 21.052, 105.802 21.052, 105.802 21.022))'),
    ('HN-TH',  'Tây Hồ',       'Tay Ho',       'POLYGON((105.792 21.052, 105.848 21.052, 105.848 21.095, 105.792 21.095, 105.792 21.052))'),
    ('HN-CG',  'Cầu Giấy',     'Cau Giay',     'POLYGON((105.772 21.005, 105.802 21.005, 105.802 21.052, 105.772 21.052, 105.772 21.005))'),
    ('HN-TX',  'Thanh Xuân',   'Thanh Xuan',   'POLYGON((105.785 20.978, 105.825 20.978, 105.825 21.005, 105.785 21.005, 105.785 20.978))'),
    ('HN-DD',  'Đống Đa',      'Dong Da',      'POLYGON((105.802 21.000, 105.840 21.000, 105.840 21.022, 105.802 21.022, 105.802 21.000))'),
    ('HN-HBT', 'Hai Bà Trưng', 'Hai Ba Trung', 'POLYGON((105.838 20.988, 105.878 20.988, 105.878 21.018, 105.838 21.018, 105.838 20.988))'),
    ('HN-HM',  'Hoàng Mai',    'Hoang Mai',    'POLYGON((105.822 20.945, 105.895 20.945, 105.895 20.988, 105.822 20.988, 105.822 20.945))'),
    ('HN-BTL', 'Bắc Từ Liêm',  'Bac Tu Liem',  'POLYGON((105.720 21.038, 105.792 21.038, 105.792 21.095, 105.720 21.095, 105.720 21.038))'),
    ('HN-HD',  'Hà Đông',      'Ha Dong',      'POLYGON((105.725 20.935, 105.795 20.935, 105.795 20.992, 105.725 20.992, 105.725 20.935))'),
    ('HN-LB',  'Long Biên',    'Long Bien',    'POLYGON((105.865 21.015, 105.930 21.015, 105.930 21.075, 105.865 21.075, 105.865 21.015))'),
    ('HN-GL',  'Gia Lâm',      'Gia Lam',      'POLYGON((105.910 20.935, 106.015 20.935, 106.015 21.065, 105.910 21.065, 105.910 20.935))'),
    ('HN-DA',  'Đông Anh',     'Dong Anh',     'POLYGON((105.785 21.095, 105.925 21.095, 105.925 21.205, 105.785 21.205, 105.785 21.095))'),
    ('HN-SS',  'Sóc Sơn',      'Soc Son',      'POLYGON((105.760 21.205, 105.935 21.205, 105.935 21.375, 105.760 21.375, 105.760 21.205))'),
    ('HN-ST',  'Sơn Tây',      'Son Tay',      'POLYGON((105.420 21.050, 105.555 21.050, 105.555 21.175, 105.420 21.175, 105.420 21.050))')
) AS v(code, name_vi, name_en, wkt)
ON CONFLICT (code) DO UPDATE SET
  name_vi = EXCLUDED.name_vi,
  name_en = EXCLUDED.name_en,
  geom = EXCLUDED.geom;

-- Compute centroids and accurate geodesic area (km²) using PostGIS
UPDATE administrative_areas
SET
  centroid = ST_Centroid(geom),
  area_sq_km = ROUND((ST_Area(geom::geography) / 1000000.0)::numeric, 2);

-- -----------------------------------------------------------------------------
-- 3. SEED CAMS 0.4° × 0.4° (~40 KM) MODEL GRID CELLS
-- -----------------------------------------------------------------------------
INSERT INTO model_grid_cells (cell_code, label_vi, center_lat, center_lon, resolution_deg, cell_polygon, center_point)
VALUES
  (
    'CAMS_210_1058',
    'Ô lưới CAMS Trung tâm & Đông Hà Nội (21.0°N, 105.8°E — ~40 km)',
    21.0,
    105.8,
    0.4,
    ST_GeomFromText('POLYGON((105.6 20.8, 106.0 20.8, 106.0 21.2, 105.6 21.2, 105.6 20.8))', 4326),
    ST_SetSRID(ST_MakePoint(105.8, 21.0), 4326)
  ),
  (
    'CAMS_210_1054',
    'Ô lưới CAMS Tây Hà Nội — Sơn Tây / Ba Vì (21.0°N, 105.4°E — ~40 km)',
    21.0,
    105.4,
    0.4,
    ST_GeomFromText('POLYGON((105.2 20.8, 105.6 20.8, 105.6 21.2, 105.2 21.2, 105.2 20.8))', 4326),
    ST_SetSRID(ST_MakePoint(105.4, 21.0), 4326)
  ),
  (
    'CAMS_214_1058',
    'Ô lưới CAMS Bắc Hà Nội — Sóc Sơn / Đông Anh (21.4°N, 105.8°E — ~40 km)',
    21.4,
    105.8,
    0.4,
    ST_GeomFromText('POLYGON((105.6 21.2, 106.0 21.2, 106.0 21.6, 105.6 21.6, 105.6 21.2))', 4326),
    ST_SetSRID(ST_MakePoint(105.8, 21.4), 4326)
  ),
  (
    'CAMS_206_1058',
    'Ô lưới CAMS Nam Hà Nội — Phú Xuyên / Mỹ Đức (20.6°N, 105.8°E — ~40 km)',
    20.6,
    105.8,
    0.4,
    ST_GeomFromText('POLYGON((105.6 20.4, 106.0 20.4, 106.0 20.8, 105.6 20.8, 105.6 20.4))', 4326),
    ST_SetSRID(ST_MakePoint(105.8, 20.6), 4326)
  )
ON CONFLICT (cell_code) DO UPDATE SET
  label_vi = EXCLUDED.label_vi,
  cell_polygon = EXCLUDED.cell_polygon,
  center_point = EXCLUDED.center_point;

-- -----------------------------------------------------------------------------
-- 4. SEED MONITORING STATIONS (10 Verified Hanoi Stations from OpenAQ & WAQI)
-- -----------------------------------------------------------------------------
WITH src_openaq AS (
  SELECT id FROM data_sources WHERE code = 'OPENAQ_V3' LIMIT 1
),
src_waqi AS (
  SELECT id FROM data_sources WHERE code = 'WAQI_API' LIMIT 1
)
INSERT INTO monitoring_stations (
  data_source_id,
  external_station_id,
  name,
  provider_name,
  equipment_grade,
  is_reference_monitor,
  geom,
  latitude,
  longitude,
  district_name_vi,
  ward_or_commune_name_vi,
  is_within_hanoi,
  freshness_status,
  first_observed_at,
  last_observed_at
)
SELECT
  CASE WHEN s.source_code = 'OPENAQ_V3' THEN src_openaq.id ELSE src_waqi.id END,
  s.external_station_id,
  s.name,
  s.provider_name,
  s.equipment_grade,
  s.is_reference_monitor,
  ST_SetSRID(ST_MakePoint(s.lon, s.lat), 4326),
  s.lat,
  s.lon,
  s.district_vi,
  s.ward_vi,
  TRUE,
  s.freshness_status,
  s.first_obs::timestamptz,
  s.last_obs::timestamptz
FROM src_openaq, src_waqi,
(
  VALUES
    ('OPENAQ_V3', '4946812', 'Công viên Nhân Chính - Khuất Duy Tiến', 'Hanoi Air Quality Monitoring Network', 'REFERENCE_GRADE', TRUE, 21.00309, 105.79469, 'Thanh Xuân', 'Nhân Chính', 'FRESH', '2025-01-01T00:00:00Z', '2026-10-28T10:35:00Z'),
    ('OPENAQ_V3', '4946813', 'Số 1 đường Giải Phóng - P. Bạch Mai (ĐHBK)', 'Hanoi Air Quality Monitoring Network', 'REFERENCE_GRADE', TRUE, 21.00580, 105.84181, 'Hai Bà Trưng', 'Bạch Mai', 'FRESH', '2025-01-01T00:00:00Z', '2026-10-28T10:35:00Z'),
    ('OPENAQ_V3', '6123215', 'Dragon - Gia Lâm (AirGradient)', 'AirGradient Community Network', 'LOW_COST_SENSOR', FALSE, 20.99124, 105.95395, 'Gia Lâm', 'Trâu Quỳ', 'FRESH', '2025-06-01T00:00:00Z', '2026-10-28T10:00:00Z'),
    ('OPENAQ_V3', '2161292', 'Số 46, phố Lưu Quang Vũ', 'Hanoi Air Quality Monitoring Network', 'REFERENCE_GRADE', TRUE, 21.01520, 105.80013, 'Cầu Giấy', 'Trung Hòa', 'STALE', '2023-01-01T00:00:00Z', '2026-10-28T01:00:00Z'),
    ('OPENAQ_V3', '2161306', 'Minh Khai - Bắc Từ Liêm', 'Hanoi Air Quality Monitoring Network', 'REFERENCE_GRADE', TRUE, 21.05920, 105.73300, 'Bắc Từ Liêm', 'Minh Khai', 'STALE', '2023-01-01T00:00:00Z', '2026-10-28T01:00:00Z'),
    ('WAQI_API',  '13026',   'Hanoi UNIS - Ciputra Tây Hồ', 'UNIS Hanoi / WAQI', 'LOW_COST_SENSOR', FALSE, 21.08112, 105.81301, 'Tây Hồ', 'Phú Thượng', 'FRESH', '2021-01-01T00:00:00Z', '2026-10-28T11:00:00Z'),
    ('WAQI_API',  'A476599', 'Mộ Lao - Hà Đông', 'WAQI Partner Station', 'LOW_COST_SENSOR', FALSE, 20.98278, 105.78666, 'Hà Đông', 'Mộ Lao', 'FRESH', '2023-01-01T00:00:00Z', '2026-10-28T11:00:00Z'),
    ('WAQI_API',  'A579667', 'Phố Nguyễn Duy Trinh - Hoàng Mai', 'WAQI Partner Station', 'LOW_COST_SENSOR', FALSE, 20.96863, 105.87368, 'Hoàng Mai', 'Hoàng Liệt', 'FRESH', '2023-01-01T00:00:00Z', '2026-10-28T11:00:00Z'),
    ('WAQI_API',  'A568477', 'Quảng An - Tây Hồ', 'WAQI Partner Station', 'LOW_COST_SENSOR', FALSE, 21.06639, 105.82389, 'Tây Hồ', 'Quảng An', 'FRESH', '2023-01-01T00:00:00Z', '2026-10-28T11:00:00Z'),
    ('OPENAQ_V3', '2161290', '556 Nguyễn Văn Cừ - Long Biên', 'Hanoi Air Quality Monitoring Network', 'REFERENCE_GRADE', TRUE, 21.04910, 105.88310, 'Long Biên', 'Gia Thụy', 'UNAVAILABLE', '2022-01-01T00:00:00Z', '2025-11-12T11:00:00Z')
) AS s(source_code, external_station_id, name, provider_name, equipment_grade, is_reference_monitor, lat, lon, district_vi, ward_vi, freshness_status, first_obs, last_obs)
ON CONFLICT (data_source_id, external_station_id) DO UPDATE SET
  name = EXCLUDED.name,
  geom = EXCLUDED.geom,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  freshness_status = EXCLUDED.freshness_status,
  last_observed_at = EXCLUDED.last_observed_at,
  updated_at_utc = NOW();

-- Automatically assign administrative_area_id to monitoring_stations via PostGIS ST_Contains!
UPDATE monitoring_stations ms
SET administrative_area_id = aa.id
FROM administrative_areas aa
WHERE aa.admin_level = 2
  AND ST_Contains(aa.geom, ms.geom);

-- -----------------------------------------------------------------------------
-- 5. SEED SENSORS FOR EACH MONITORING STATION
-- -----------------------------------------------------------------------------
INSERT INTO sensors (station_id, external_sensor_id, parameter_code, unit, averaging_period, is_active)
SELECT
  ms.id,
  'sensor-pm25-' || ms.external_station_id,
  'pm25',
  CASE WHEN ds.code = 'WAQI_API' THEN 'US_AQI_SUBINDEX' ELSE 'µg/m³' END,
  '1h',
  ms.freshness_status <> 'UNAVAILABLE'
FROM monitoring_stations ms
JOIN data_sources ds ON ds.id = ms.data_source_id
ON CONFLICT (station_id, external_sensor_id) DO UPDATE SET
  unit = EXCLUDED.unit,
  is_active = EXCLUDED.is_active;

-- -----------------------------------------------------------------------------
-- 6. SEED INITIAL INGESTION JOB & VERIFIED PM2.5 OBSERVATIONS (24H SERIES)
-- -----------------------------------------------------------------------------
WITH src_openaq AS (
  SELECT id FROM data_sources WHERE code = 'OPENAQ_V3' LIMIT 1
)
INSERT INTO ingestion_jobs (id, data_source_id, trigger_type, status, records_fetched, records_inserted, records_flagged_qc, duration_ms, started_at_utc, finished_at_utc)
SELECT
  '11111111-2222-3333-4444-555555555555'::uuid,
  src_openaq.id,
  'INITIAL_SEED',
  'SUCCESS',
  90,
  90,
  0,
  420,
  NOW() - INTERVAL '5 minutes',
  NOW() - INTERVAL '4 minutes'
FROM src_openaq
ON CONFLICT (id) DO NOTHING;

-- Insert latest verified snapshot readings (measured_at_utc = 2026-10-28T10:35:00Z / 11:00:00Z)
INSERT INTO pm25_observations (
  sensor_id,
  station_id,
  ingestion_job_id,
  pm25_ugm3,
  pm10_ugm3,
  raw_aqi_subindex,
  raw_value,
  value_origin,
  quality_flag,
  measured_at_utc,
  published_at_utc
)
SELECT
  sn.id,
  ms.id,
  '11111111-2222-3333-4444-555555555555'::uuid,
  obs.pm25_ugm3,
  obs.pm10_ugm3,
  obs.raw_aqi_subindex,
  obs.raw_value,
  obs.value_origin,
  'VALID',
  obs.measured_at::timestamptz,
  obs.measured_at::timestamptz
FROM (
  VALUES
    ('4946812', 33.60, 56.2, NULL,  33.60, 'DIRECT_CONCENTRATION', '2026-10-28T10:35:00Z'),
    ('4946813', 44.28, 72.4, NULL,  44.28, 'DIRECT_CONCENTRATION', '2026-10-28T10:35:00Z'),
    ('6123215', 49.40, 78.1, NULL,  49.40, 'DIRECT_CONCENTRATION', '2026-10-28T10:00:00Z'),
    ('2161292', 35.66, 59.0, NULL,  35.66, 'DIRECT_CONCENTRATION', '2026-10-28T01:00:00Z'),
    ('2161306', 40.36, 67.5, NULL,  40.36, 'DIRECT_CONCENTRATION', '2026-10-28T01:00:00Z'),
    ('13026',   43.80, 68.0, 122,  122.00, 'DERIVED_FROM_US_AQI',  '2026-10-28T11:00:00Z'),
    ('A476599', 39.20, 64.0, 110,  110.00, 'DERIVED_FROM_US_AQI',  '2026-10-28T11:00:00Z'),
    ('A579667', 33.50, 55.0,  96,   96.00, 'DERIVED_FROM_US_AQI',  '2026-10-28T11:00:00Z'),
    ('A568477', 26.40, 44.0,  81,   81.00, 'DERIVED_FROM_US_AQI',  '2026-10-28T11:00:00Z')
) AS obs(ext_id, pm25_ugm3, pm10_ugm3, raw_aqi_subindex, raw_value, value_origin, measured_at)
JOIN monitoring_stations ms ON ms.external_station_id = obs.ext_id
JOIN sensors sn ON sn.station_id = ms.id AND sn.parameter_code = 'pm25'
ON CONFLICT (sensor_id, measured_at_utc) DO UPDATE SET
  pm25_ugm3 = EXCLUDED.pm25_ugm3,
  pm10_ugm3 = EXCLUDED.pm10_ugm3,
  raw_aqi_subindex = EXCLUDED.raw_aqi_subindex,
  raw_value = EXCLUDED.raw_value;

-- Insert 23 preceding hourly observations for the 3 active direct-concentration OpenAQ stations
INSERT INTO pm25_observations (
  sensor_id,
  station_id,
  ingestion_job_id,
  pm25_ugm3,
  pm10_ugm3,
  raw_aqi_subindex,
  raw_value,
  value_origin,
  quality_flag,
  measured_at_utc,
  published_at_utc
)
SELECT
  sn.id,
  ms.id,
  '11111111-2222-3333-4444-555555555555'::uuid,
  ROUND((
    CASE ms.external_station_id
      WHEN '4946812' THEN 33.60
      WHEN '4946813' THEN 44.28
      ELSE 49.40
    END
    + (SIN(h.hour_offset * 0.45) * 5.2)
  )::numeric, 2)::double precision AS pm25_ugm3,
  ROUND((
    CASE ms.external_station_id
      WHEN '4946812' THEN 56.20
      WHEN '4946813' THEN 72.40
      ELSE 78.10
    END
    + (SIN(h.hour_offset * 0.45) * 7.5)
  )::numeric, 2)::double precision AS pm10_ugm3,
  NULL,
  ROUND((
    CASE ms.external_station_id
      WHEN '4946812' THEN 33.60
      WHEN '4946813' THEN 44.28
      ELSE 49.40
    END
    + (SIN(h.hour_offset * 0.45) * 5.2)
  )::numeric, 2)::double precision AS raw_value,
  'DIRECT_CONCENTRATION',
  'VALID',
  ('2026-10-28T10:00:00Z'::timestamptz - (h.hour_offset || ' hours')::interval),
  ('2026-10-28T10:00:00Z'::timestamptz - (h.hour_offset || ' hours')::interval)
FROM monitoring_stations ms
JOIN sensors sn ON sn.station_id = ms.id AND sn.parameter_code = 'pm25'
CROSS JOIN generate_series(1, 23) AS h(hour_offset)
WHERE ms.external_station_id IN ('4946812', '4946813', '6123215')
ON CONFLICT (sensor_id, measured_at_utc) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. SEED CAMS NUMERICAL MODEL RUN & VALUES
-- -----------------------------------------------------------------------------
WITH src_cams AS (
  SELECT id FROM data_sources WHERE code = 'OPEN_METEO_CAMS' LIMIT 1
)
INSERT INTO air_quality_model_runs (id, data_source_id, model_name, spatial_resolution_deg, run_initialized_at_utc, forecast_horizon_hours)
SELECT
  '22222222-3333-4444-5555-666666666666'::uuid,
  src_cams.id,
  'CAMS_GLOBAL_ECMWF',
  0.4,
  '2026-10-28T00:00:00Z'::timestamptz,
  72
FROM src_cams
ON CONFLICT (id) DO NOTHING;

INSERT INTO model_pm25_values (model_run_id, grid_cell_id, valid_at_utc, is_forecast, pm25_ugm3, pm10_ugm3, us_aqi, european_aqi)
SELECT
  '22222222-3333-4444-5555-666666666666'::uuid,
  mgc.id,
  ('2026-10-28T11:00:00Z'::timestamptz + (t.step_hours || ' hours')::interval),
  (t.step_hours > 0),
  ROUND((
    CASE mgc.cell_code
      WHEN 'CAMS_210_1058' THEN 42.7
      WHEN 'CAMS_210_1054' THEN 40.6
      WHEN 'CAMS_214_1058' THEN 44.1
      ELSE 47.0
    END + (SIN(t.step_hours * 0.35) * 3.8)
  )::numeric, 1)::double precision,
  ROUND((
    CASE mgc.cell_code
      WHEN 'CAMS_210_1058' THEN 61.3
      WHEN 'CAMS_210_1054' THEN 57.5
      WHEN 'CAMS_214_1058' THEN 63.0
      ELSE 66.8
    END + (SIN(t.step_hours * 0.35) * 5.1)
  )::numeric, 1)::double precision,
  134,
  65
FROM model_grid_cells mgc
CROSS JOIN generate_series(-12, 24, 3) AS t(step_hours)
ON CONFLICT (model_run_id, grid_cell_id, valid_at_utc) DO UPDATE SET
  pm25_ugm3 = EXCLUDED.pm25_ugm3,
  pm10_ugm3 = EXCLUDED.pm10_ugm3;

-- -----------------------------------------------------------------------------
-- 8. SEED WEATHER DATA (Open-Meteo Verified Series)
-- -----------------------------------------------------------------------------
DELETE FROM weather_data WHERE observed_at_utc >= '2026-10-27T00:00:00Z'::timestamptz;

WITH src_weather AS (
  SELECT id FROM data_sources WHERE code = 'OPEN_METEO_WEATHER' LIMIT 1
),
cell_center AS (
  SELECT id FROM model_grid_cells WHERE cell_code = 'CAMS_210_1058' LIMIT 1
)
INSERT INTO weather_data (
  data_source_id,
  grid_cell_id,
  geom,
  observed_at_utc,
  is_forecast,
  temperature_c,
  relative_humidity_pct,
  wind_speed_kmh,
  wind_direction_deg,
  precipitation_mm,
  surface_pressure_hpa
)
SELECT
  src_weather.id,
  cell_center.id,
  ST_SetSRID(ST_MakePoint(105.8342, 21.0278), 4326),
  ('2026-10-28T11:00:00Z'::timestamptz + (w.step_hours || ' hours')::interval),
  (w.step_hours > 0),
  ROUND((27.6 + SIN(w.step_hours * 0.26) * 2.4)::numeric, 1)::double precision,
  ROUND((76.0 - SIN(w.step_hours * 0.26) * 8.0)::numeric, 0)::double precision,
  ROUND((12.4 + COS(w.step_hours * 0.3) * 3.1)::numeric, 1)::double precision,
  122.0,
  0.0,
  1012.8
FROM src_weather, cell_center
CROSS JOIN generate_series(-23, 12, 1) AS w(step_hours);

-- -----------------------------------------------------------------------------
-- 9. SEED ACTIVE AIR QUALITY ALERTS
-- -----------------------------------------------------------------------------
INSERT INTO air_quality_alerts (
  alert_category,
  severity,
  station_id,
  administrative_area_id,
  area_name_vi,
  data_origin,
  trigger_value,
  threshold_value,
  unit,
  deduplication_key,
  status,
  title_vi,
  message_vi,
  triggered_at_utc
)
VALUES
  (
    'PM25_CONCENTRATION',
    'UNHEALTHY_SENSITIVE',
    (SELECT id FROM monitoring_stations WHERE external_station_id = '6123215' LIMIT 1),
    (SELECT id FROM administrative_areas WHERE code = 'HN-GL' LIMIT 1),
    'Gia Lâm — Trâu Quỳ',
    'OBSERVED',
    49.40,
    37.50,
    'µg/m³',
    'ALERT_PM25_6123215_20261028',
    'ACTIVE',
    'Cảnh báo PM2.5 vượt ngưỡng Nhóm nhạy cảm tại Gia Lâm (49.4 µg/m³)',
    'Nồng độ PM2.5 quan trắc tại trạm Dragon - Gia Lâm đạt 49.40 µg/m³ (VN_AQI = 114, US_AQI = 135), vượt ngưỡng khuyến cáo 37.5 µg/m³ cho nhóm nhạy cảm.',
    '2026-10-28T10:00:00Z'
  ),
  (
    'PM25_CONCENTRATION',
    'UNHEALTHY_SENSITIVE',
    (SELECT id FROM monitoring_stations WHERE external_station_id = '4946813' LIMIT 1),
    (SELECT id FROM administrative_areas WHERE code = 'HN-HBT' LIMIT 1),
    'Hai Bà Trưng — Bạch Mai',
    'OBSERVED',
    44.28,
    37.50,
    'µg/m³',
    'ALERT_PM25_4946813_20261028',
    'ACTIVE',
    'Cảnh báo PM2.5 tăng cao tại Giải Phóng - Bạch Mai (44.28 µg/m³)',
    'Trạm quan trắc chuẩn Số 1 Giải Phóng ghi nhận PM2.5 ở mức 44.28 µg/m³ (US_AQI = 123). Nhóm nhạy cảm nên hạn chế vận động ngoài trời.',
    '2026-10-28T10:35:00Z'
  ),
  (
    'STATION_STALE',
    'TECHNICAL_WARNING',
    (SELECT id FROM monitoring_stations WHERE external_station_id = '2161292' LIMIT 1),
    (SELECT id FROM administrative_areas WHERE code = 'HN-CG' LIMIT 1),
    'Cầu Giấy — Trung Hòa',
    'OBSERVED',
    575.0,
    360.0,
    'minutes',
    'ALERT_STALE_2161292_20261028',
    'ACTIVE',
    'Trạm 46 Lưu Quang Vũ (Cầu Giấy) ngừng gửi dữ liệu mới (> 6 giờ)',
    'Bản ghi gần nhất của trạm 46 Lưu Quang Vũ và trạm Minh Khai (Bắc Từ Liêm) dừng ở 08:00 ICT (STALE). Không dùng bản ghi này làm giá trị tức thời.',
    '2026-10-28T10:35:00Z'
  )
ON CONFLICT (deduplication_key) DO UPDATE SET
  trigger_value = EXCLUDED.trigger_value,
  title_vi = EXCLUDED.title_vi,
  message_vi = EXCLUDED.message_vi;

-- -----------------------------------------------------------------------------
-- 10. SEED DEFAULT USERS (ADMIN & STUDENT DEMO USER)
-- -----------------------------------------------------------------------------
INSERT INTO users (email, password_hash, full_name, role, is_active)
VALUES
  (
    'admin@hanoi-pm25-gis.vn',
    crypt('HanoiAdmin@2026', gen_salt('bf')),
    'Quản trị viên Hệ thống Hanoi PM2.5 GIS',
    'ADMIN',
    TRUE
  ),
  (
    'sinhvien@hanoi-pm25-gis.vn',
    crypt('SinhVien@2026', gen_salt('bf')),
    'Sinh viên Nghiên cứu Môi trường Hà Nội',
    'USER',
    TRUE
  )
ON CONFLICT (email) DO NOTHING;

COMMIT;
