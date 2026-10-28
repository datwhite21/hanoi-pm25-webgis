-- =============================================================================
-- HANOI PM2.5 WEBGIS — ROLLBACK 001: DROP ALL 14 TABLES IN REVERSE ORDER
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS user_favorite_locations CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS air_quality_alerts CASCADE;
DROP TABLE IF EXISTS weather_data CASCADE;
DROP TABLE IF EXISTS model_pm25_values CASCADE;
DROP TABLE IF EXISTS model_grid_cells CASCADE;
DROP TABLE IF EXISTS air_quality_model_runs CASCADE;
DROP TABLE IF EXISTS pm25_observations CASCADE;
DROP TABLE IF EXISTS ingestion_jobs CASCADE;
DROP TABLE IF EXISTS sensors CASCADE;
DROP TABLE IF EXISTS monitoring_stations CASCADE;
DROP TABLE IF EXISTS administrative_areas CASCADE;
DROP TABLE IF EXISTS data_sources CASCADE;

COMMIT;
