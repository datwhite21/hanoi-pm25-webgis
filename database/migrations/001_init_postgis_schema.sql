-- =============================================================================
-- HANOI PM2.5 WEBGIS — MIGRATION 001: INITIALIZE POSTGIS & 14 CORE TABLES
-- Target DBMS: PostgreSQL 15+ (Supabase) with PostGIS Extension
-- All timestamps stored in UTC (TIMESTAMPTZ). Spatial SRID = 4326 (WGS84).
-- =============================================================================

BEGIN;

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Table 1: data_sources
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  source_type VARCHAR(64) NOT NULL CHECK (
    source_type IN ('OBSERVATION', 'AQI_INDEX', 'NUMERICAL_MODEL', 'WEATHER', 'GIS')
  ),
  base_url TEXT NOT NULL,
  license VARCHAR(255),
  poll_interval_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_success_at TIMESTAMPTZ,
  last_status VARCHAR(32) NOT NULL DEFAULT 'HEALTHY' CHECK (
    last_status IN ('HEALTHY', 'DEGRADED', 'DOWN')
  ),
  notes_vi TEXT,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table 2: administrative_areas
CREATE TABLE IF NOT EXISTS administrative_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name_vi VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  admin_level SMALLINT NOT NULL CHECK (admin_level IN (1, 2, 3)),
  parent_id UUID REFERENCES administrative_areas(id) ON DELETE SET NULL,
  geom geometry(MultiPolygon, 4326) NOT NULL,
  centroid geometry(Point, 4326),
  area_sq_km NUMERIC(10, 2),
  effective_date DATE NOT NULL DEFAULT '2025-01-01',
  source_dataset VARCHAR(255) NOT NULL DEFAULT 'OCHA COD-AB / GADM / Hanoi GIS',
  license VARCHAR(128) NOT NULL DEFAULT 'CC-BY-4.0 / Open Academic',
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_areas_geom_gist
  ON administrative_areas USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_admin_areas_geog_gist
  ON administrative_areas USING GIST ((geom::geography));
CREATE INDEX IF NOT EXISTS idx_admin_areas_level
  ON administrative_areas (admin_level);

-- 4. Table 3: monitoring_stations
CREATE TABLE IF NOT EXISTS monitoring_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE RESTRICT,
  external_station_id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  provider_name VARCHAR(255) NOT NULL,
  equipment_grade VARCHAR(64) NOT NULL DEFAULT 'REFERENCE_GRADE' CHECK (
    equipment_grade IN ('REFERENCE_GRADE', 'LOW_COST_SENSOR', 'NUMERICAL_MODEL')
  ),
  is_reference_monitor BOOLEAN NOT NULL DEFAULT TRUE,
  geom geometry(Point, 4326) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  administrative_area_id UUID REFERENCES administrative_areas(id) ON DELETE SET NULL,
  district_name_vi VARCHAR(255),
  ward_or_commune_name_vi VARCHAR(255),
  is_within_hanoi BOOLEAN NOT NULL DEFAULT TRUE,
  freshness_status VARCHAR(32) NOT NULL DEFAULT 'UNAVAILABLE' CHECK (
    freshness_status IN ('FRESH', 'DELAYED', 'STALE', 'UNAVAILABLE')
  ),
  first_observed_at TIMESTAMPTZ,
  last_observed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_station_source_external UNIQUE (data_source_id, external_station_id)
);

CREATE INDEX IF NOT EXISTS idx_stations_geom_gist
  ON monitoring_stations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_stations_geog_gist
  ON monitoring_stations USING GIST ((geom::geography));
CREATE INDEX IF NOT EXISTS idx_stations_freshness
  ON monitoring_stations (freshness_status, is_within_hanoi);

-- 5. Table 4: sensors
CREATE TABLE IF NOT EXISTS sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES monitoring_stations(id) ON DELETE CASCADE,
  external_sensor_id VARCHAR(128) NOT NULL,
  parameter_code VARCHAR(32) NOT NULL CHECK (
    parameter_code IN ('pm25', 'pm10', 'co', 'no2', 'so2', 'o3', 'temperature', 'humidity')
  ),
  unit VARCHAR(32) NOT NULL,
  averaging_period VARCHAR(32) NOT NULL DEFAULT '1h',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sensor_station_external UNIQUE (station_id, external_sensor_id)
);

CREATE INDEX IF NOT EXISTS idx_sensors_station_param
  ON sensors (station_id, parameter_code);

-- 6. Table 5: ingestion_jobs (Created before pm25_observations so FK can reference it)
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  trigger_type VARCHAR(32) NOT NULL DEFAULT 'SCHEDULER' CHECK (
    trigger_type IN ('SCHEDULER', 'CRON_WEBHOOK', 'MANUAL_ADMIN', 'INITIAL_SEED')
  ),
  status VARCHAR(32) NOT NULL CHECK (
    status IN ('RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED')
  ),
  records_fetched INTEGER NOT NULL DEFAULT 0,
  records_inserted INTEGER NOT NULL DEFAULT 0,
  records_flagged_qc INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  started_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at_utc TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_started_desc
  ON ingestion_jobs (started_at_utc DESC);

-- 7. Table 6: pm25_observations
CREATE TABLE IF NOT EXISTS pm25_observations (
  id BIGSERIAL PRIMARY KEY,
  sensor_id UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES monitoring_stations(id) ON DELETE CASCADE,
  ingestion_job_id UUID REFERENCES ingestion_jobs(id) ON DELETE SET NULL,
  pm25_ugm3 DOUBLE PRECISION,
  pm10_ugm3 DOUBLE PRECISION,
  raw_aqi_subindex INTEGER,
  raw_value DOUBLE PRECISION NOT NULL,
  value_origin VARCHAR(48) NOT NULL DEFAULT 'DIRECT_CONCENTRATION' CHECK (
    value_origin IN ('DIRECT_CONCENTRATION', 'DERIVED_FROM_US_AQI')
  ),
  quality_flag VARCHAR(48) NOT NULL DEFAULT 'VALID' CHECK (
    quality_flag IN (
      'VALID',
      'HIGH_EXTREME',
      'SUSPECT_SPIKE',
      'INVALID_NEGATIVE',
      'INVALID_OUT_OF_RANGE',
      'INVALID_TIMESTAMP',
      'OUTSIDE_STUDY_AREA'
    )
  ),
  measured_at_utc TIMESTAMPTZ NOT NULL,
  published_at_utc TIMESTAMPTZ,
  fetched_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stored_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT uq_observation_sensor_time UNIQUE (sensor_id, measured_at_utc)
);

CREATE INDEX IF NOT EXISTS idx_pm25_obs_station_time_desc
  ON pm25_observations (station_id, measured_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_pm25_obs_valid_time_desc
  ON pm25_observations (measured_at_utc DESC)
  WHERE quality_flag = 'VALID';

-- 8. Table 7: air_quality_model_runs
CREATE TABLE IF NOT EXISTS air_quality_model_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE RESTRICT,
  model_name VARCHAR(128) NOT NULL DEFAULT 'CAMS_GLOBAL_ECMWF',
  spatial_resolution_deg DOUBLE PRECISION NOT NULL DEFAULT 0.4,
  run_initialized_at_utc TIMESTAMPTZ NOT NULL,
  fetched_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  forecast_horizon_hours INTEGER NOT NULL DEFAULT 72
);

-- 9. Table 8: model_grid_cells
CREATE TABLE IF NOT EXISTS model_grid_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_code VARCHAR(64) NOT NULL UNIQUE,
  label_vi VARCHAR(255) NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lon DOUBLE PRECISION NOT NULL,
  resolution_deg DOUBLE PRECISION NOT NULL DEFAULT 0.4,
  cell_polygon geometry(Polygon, 4326) NOT NULL,
  center_point geometry(Point, 4326) NOT NULL,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_cells_poly_gist
  ON model_grid_cells USING GIST (cell_polygon);
CREATE INDEX IF NOT EXISTS idx_model_cells_point_gist
  ON model_grid_cells USING GIST (center_point);

-- 10. Table 9: model_pm25_values
CREATE TABLE IF NOT EXISTS model_pm25_values (
  id BIGSERIAL PRIMARY KEY,
  model_run_id UUID NOT NULL REFERENCES air_quality_model_runs(id) ON DELETE CASCADE,
  grid_cell_id UUID NOT NULL REFERENCES model_grid_cells(id) ON DELETE CASCADE,
  valid_at_utc TIMESTAMPTZ NOT NULL,
  is_forecast BOOLEAN NOT NULL DEFAULT FALSE,
  pm25_ugm3 DOUBLE PRECISION NOT NULL,
  pm10_ugm3 DOUBLE PRECISION,
  us_aqi INTEGER,
  european_aqi INTEGER,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_model_cell_valid_time UNIQUE (model_run_id, grid_cell_id, valid_at_utc)
);

CREATE INDEX IF NOT EXISTS idx_model_values_valid_time
  ON model_pm25_values (valid_at_utc DESC, grid_cell_id);

-- 11. Table 10: weather_data
CREATE TABLE IF NOT EXISTS weather_data (
  id BIGSERIAL PRIMARY KEY,
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE RESTRICT,
  grid_cell_id UUID REFERENCES model_grid_cells(id) ON DELETE SET NULL,
  station_id UUID REFERENCES monitoring_stations(id) ON DELETE SET NULL,
  geom geometry(Point, 4326) NOT NULL,
  observed_at_utc TIMESTAMPTZ NOT NULL,
  is_forecast BOOLEAN NOT NULL DEFAULT FALSE,
  temperature_c DOUBLE PRECISION,
  relative_humidity_pct DOUBLE PRECISION,
  wind_speed_kmh DOUBLE PRECISION,
  wind_direction_deg DOUBLE PRECISION,
  precipitation_mm DOUBLE PRECISION,
  surface_pressure_hpa DOUBLE PRECISION,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_geom_gist
  ON weather_data USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_weather_observed_time
  ON weather_data (observed_at_utc DESC);

-- 12. Table 11: air_quality_alerts
CREATE TABLE IF NOT EXISTS air_quality_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_category VARCHAR(64) NOT NULL CHECK (
    alert_category IN (
      'PM25_CONCENTRATION',
      'AQI_THRESHOLD',
      'MODEL_FORECAST',
      'STATION_STALE',
      'DATA_ANOMALY'
    )
  ),
  severity VARCHAR(64) NOT NULL CHECK (
    severity IN (
      'GOOD',
      'MODERATE',
      'UNHEALTHY_SENSITIVE',
      'UNHEALTHY',
      'VERY_UNHEALTHY',
      'HAZARDOUS',
      'TECHNICAL_WARNING'
    )
  ),
  station_id UUID REFERENCES monitoring_stations(id) ON DELETE SET NULL,
  administrative_area_id UUID REFERENCES administrative_areas(id) ON DELETE SET NULL,
  area_name_vi VARCHAR(255) NOT NULL,
  data_origin VARCHAR(32) NOT NULL CHECK (data_origin IN ('OBSERVED', 'MODELED')),
  trigger_value DOUBLE PRECISION NOT NULL,
  threshold_value DOUBLE PRECISION NOT NULL,
  unit VARCHAR(32) NOT NULL,
  deduplication_key VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')
  ),
  title_vi TEXT NOT NULL,
  message_vi TEXT NOT NULL,
  triggered_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at_utc TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_status_triggered
  ON air_quality_alerts (status, triggered_at_utc DESC);

-- 13. Table 12: users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at_utc TIMESTAMPTZ
);

-- 14. Table 13: user_favorite_locations
CREATE TABLE IF NOT EXISTS user_favorite_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label_name VARCHAR(255) NOT NULL,
  geom geometry(Point, 4326) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  nearest_station_id UUID REFERENCES monitoring_stations(id) ON DELETE SET NULL,
  administrative_area_id UUID REFERENCES administrative_areas(id) ON DELETE SET NULL,
  custom_pm25_threshold_ugm3 DOUBLE PRECISION NOT NULL DEFAULT 35.0,
  enable_alert BOOLEAN NOT NULL DEFAULT TRUE,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fav_locations_geom_gist
  ON user_favorite_locations USING GIST (geom);

-- 15. Table 14: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(64) NOT NULL,
  target_table VARCHAR(64) NOT NULL,
  target_id VARCHAR(128) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  ip_address VARCHAR(64),
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_desc
  ON audit_logs (created_at_utc DESC);

COMMIT;
