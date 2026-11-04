import { Router } from 'express';
import { z } from 'zod';
import {
  classifyPm25Level,
  calculateVnAqiFromPm25,
  calculateNowCastPm25,
  analyzeMeteorologicalPm25Coupling,
  computeExceedanceSummary,
} from '@hanoi-pm25/shared';
import { dbQuery, checkDbHealth } from '../db/pool.js';
import { ApiError, sendSuccess } from '../middleware/errorHandler.js';
import { runFullIngestionPipeline } from '../ingestion/ingestionOrchestrator.js';

export const publicRouter = Router();

let lastAutoIngestionMs = 0;
let isBackgroundIngesting = false;
const AUTO_INGEST_INTERVAL_MS = 5 * 60 * 1000;

function triggerBackgroundIngestionIfStale(): void {
  if (isBackgroundIngesting) return;
  if (Date.now() - lastAutoIngestionMs < AUTO_INGEST_INTERVAL_MS) return;
  isBackgroundIngesting = true;
  lastAutoIngestionMs = Date.now();
  runFullIngestionPipeline('SCHEDULED_CRON')
    .catch(() => {
      // Ignore background refresh error; existing PostGIS records remain available
    })
    .finally(() => {
      isBackgroundIngesting = false;
    });
}

// -----------------------------------------------------------------------------
// 1. GET /api/health
// -----------------------------------------------------------------------------
publicRouter.get('/health', async (_req, res, next) => {
  try {
    const dbHealth = await checkDbHealth();
    sendSuccess(res, {
      service: '@hanoi-pm25/api',
      status: 'HEALTHY',
      database: dbHealth,
      uptimeSeconds: Math.round(process.uptime()),
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 2. GET /api/v1/stations
// -----------------------------------------------------------------------------
publicRouter.get('/v1/stations', async (req, res, next) => {
  try {
    triggerBackgroundIngestionIfStale();
    const querySchema = z.object({
      status: z
        .enum(['FRESH', 'DELAYED', 'STALE', 'UNAVAILABLE'])
        .optional(),
      source: z.string().optional(),
      area_code: z.string().optional(),
    });
    const filters = querySchema.parse(req.query);

    const conditions: string[] = ['ms.is_within_hanoi = TRUE'];
    const params: unknown[] = [];

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`ms.freshness_status = $${params.length}`);
    }
    if (filters.source) {
      params.push(filters.source);
      conditions.push(`ds.code = $${params.length}`);
    }
    if (filters.area_code) {
      params.push(filters.area_code);
      conditions.push(`aa.code = $${params.length}`);
    }

    const sql = `
      SELECT
        ms.id,
        ms.external_station_id,
        ms.name,
        ms.provider_name,
        ms.equipment_grade,
        ms.is_reference_monitor,
        ms.latitude,
        ms.longitude,
        ms.district_name_vi,
        ms.ward_or_commune_name_vi,
        ms.freshness_status,
        ms.last_observed_at,
        ds.code AS source_code,
        ds.name AS source_name,
        aa.code AS area_code,
        aa.name_vi AS area_name_vi,
        latest.pm25_ugm3,
        latest.pm10_ugm3,
        latest.raw_aqi_subindex,
        latest.raw_value,
        latest.value_origin,
        latest.quality_flag,
        latest.measured_at_utc
      FROM monitoring_stations ms
      JOIN data_sources ds ON ds.id = ms.data_source_id
      LEFT JOIN administrative_areas aa ON aa.id = ms.administrative_area_id
      LEFT JOIN LATERAL (
        SELECT
          po.pm25_ugm3,
          po.pm10_ugm3,
          po.raw_aqi_subindex,
          po.raw_value,
          po.value_origin,
          po.quality_flag,
          po.measured_at_utc
        FROM pm25_observations po
        WHERE po.station_id = ms.id
          AND po.quality_flag = 'VALID'
        ORDER BY po.measured_at_utc DESC
        LIMIT 1
      ) latest ON TRUE
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        CASE ms.freshness_status
          WHEN 'FRESH' THEN 1
          WHEN 'DELAYED' THEN 2
          WHEN 'STALE' THEN 3
          ELSE 4
        END,
        latest.pm25_ugm3 DESC NULLS LAST
    `;

    const result = await dbQuery(sql, params);
    const stations = result.rows.map((row) => {
      const pm25 =
        typeof row.pm25_ugm3 === 'number' ? Number(row.pm25_ugm3) : null;
      const classification = pm25 !== null ? classifyPm25Level(pm25) : null;
      const vnAqi = pm25 !== null ? calculateVnAqiFromPm25(pm25) : null;

      return {
        id: row.id,
        externalStationId: row.external_station_id,
        name: row.name,
        providerName: row.provider_name,
        sourceCode: row.source_code,
        sourceName: row.source_name,
        equipmentGrade: row.equipment_grade,
        isReferenceMonitor: row.is_reference_monitor,
        coordinates: {
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
        },
        administrativeArea: {
          code: row.area_code,
          nameVi: row.area_name_vi || row.district_name_vi,
          wardNameVi: row.ward_or_commune_name_vi,
        },
        freshnessStatus: row.freshness_status,
        lastObservedAtUtc: row.last_observed_at,
        latestObservation:
          pm25 !== null
            ? {
                pm25UgM3: pm25,
                pm10UgM3:
                  row.pm10_ugm3 !== null ? Number(row.pm10_ugm3) : null,
                vnAqi,
                rawUsAqiSubindex: row.raw_aqi_subindex,
                valueOrigin: row.value_origin,
                qualityFlag: row.quality_flag,
                measuredAtUtc: row.measured_at_utc,
                severity: classification?.severity ?? null,
                labelVi: classification?.labelVi ?? null,
                colorHex: classification?.colorHex ?? null,
                exceedsQcvn05_2023: classification?.exceedsQcvn05_2023 ?? false,
                exceedsWho2021: classification?.exceedsWho2021 ?? false,
              }
            : null,
      };
    });

    sendSuccess(res, stations, {
      totalStations: stations.length,
      freshStationsCount: stations.filter((s) => s.freshnessStatus === 'FRESH')
        .length,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 3. GET /api/v1/stations/:id
// -----------------------------------------------------------------------------
publicRouter.get('/v1/stations/:id', async (req, res, next) => {
  try {
    const rawId = req.params.id.replace(/^station-/, '');
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        rawId
      );

    const sql = `
      SELECT
        ms.*,
        ds.code AS source_code,
        ds.name AS source_name,
        aa.code AS area_code,
        aa.name_vi AS area_name_vi,
        (
          SELECT json_agg(
            json_build_object(
              'id', sn.id,
              'externalSensorId', sn.external_sensor_id,
              'parameterCode', sn.parameter_code,
              'unit', sn.unit,
              'averagingPeriod', sn.averaging_period,
              'isActive', sn.is_active
            )
          )
          FROM sensors sn
          WHERE sn.station_id = ms.id
        ) AS sensors
      FROM monitoring_stations ms
      JOIN data_sources ds ON ds.id = ms.data_source_id
      LEFT JOIN administrative_areas aa ON aa.id = ms.administrative_area_id
      WHERE ${isUuid ? 'ms.id = $1::uuid' : 'ms.external_station_id = $1'}
      LIMIT 1
    `;

    const result = await dbQuery(sql, [rawId]);
    if (result.rows.length === 0) {
      throw new ApiError(
        404,
        'STATION_NOT_FOUND',
        `Không tìm thấy trạm quan trắc với mã '${req.params.id}'.`
      );
    }

    const row = result.rows[0];
    sendSuccess(res, {
      id: row.id,
      externalStationId: row.external_station_id,
      name: row.name,
      providerName: row.provider_name,
      sourceCode: row.source_code,
      sourceName: row.source_name,
      equipmentGrade: row.equipment_grade,
      isReferenceMonitor: row.is_reference_monitor,
      coordinates: {
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
      },
      administrativeArea: {
        code: row.area_code,
        nameVi: row.area_name_vi || row.district_name_vi,
        wardNameVi: row.ward_or_commune_name_vi,
      },
      freshnessStatus: row.freshness_status,
      firstObservedAtUtc: row.first_observed_at,
      lastObservedAtUtc: row.last_observed_at,
      sensors: row.sensors || [],
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 4. GET /api/v1/stations/:id/observations
// -----------------------------------------------------------------------------
publicRouter.get('/v1/stations/:id/observations', async (req, res, next) => {
  try {
    const querySchema = z.object({
      hours: z.coerce.number().int().min(1).max(168).default(24),
    });
    const { hours } = querySchema.parse(req.query);
    const rawId = req.params.id.replace(/^station-/, '');
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        rawId
      );

    const stationRes = await dbQuery(
      `SELECT id, external_station_id, name, freshness_status FROM monitoring_stations WHERE ${
        isUuid ? 'id = $1::uuid' : 'external_station_id = $1'
      } LIMIT 1`,
      [rawId]
    );
    if (stationRes.rows.length === 0) {
      throw new ApiError(
        404,
        'STATION_NOT_FOUND',
        `Không tìm thấy trạm quan trắc với mã '${req.params.id}'.`
      );
    }
    const station = stationRes.rows[0];

    const obsRes = await dbQuery(
      `
      SELECT
        id,
        pm25_ugm3,
        pm10_ugm3,
        raw_aqi_subindex,
        raw_value,
        value_origin,
        quality_flag,
        measured_at_utc
      FROM pm25_observations
      WHERE station_id = $1::uuid
        AND quality_flag = 'VALID'
      ORDER BY measured_at_utc DESC
      LIMIT $2
      `,
      [station.id, hours]
    );

    const observationsNewestFirst = obsRes.rows.map((r) => ({
      id: r.id,
      pm25UgM3: r.pm25_ugm3 !== null ? Number(r.pm25_ugm3) : null,
      pm10UgM3: r.pm10_ugm3 !== null ? Number(r.pm10_ugm3) : null,
      vnAqi:
        r.pm25_ugm3 !== null
          ? calculateVnAqiFromPm25(Number(r.pm25_ugm3))
          : null,
      rawUsAqiSubindex: r.raw_aqi_subindex,
      valueOrigin: r.value_origin,
      qualityFlag: r.quality_flag,
      measuredAtUtc: r.measured_at_utc,
    }));

    const nowCast = calculateNowCastPm25(
      observationsNewestFirst.map((o) => o.pm25UgM3)
    );

    const validPm25Values = observationsNewestFirst
      .map((o) => o.pm25UgM3)
      .filter((v): v is number => typeof v === 'number');

    const avg24h =
      validPm25Values.length > 0
        ? Number(
            (
              validPm25Values.reduce((acc, v) => acc + v, 0) /
              validPm25Values.length
            ).toFixed(2)
          )
        : null;

    sendSuccess(res, {
      station: {
        id: station.id,
        externalStationId: station.external_station_id,
        name: station.name,
        freshnessStatus: station.freshness_status,
      },
      summary: {
        hoursRequested: hours,
        observationsCount: observationsNewestFirst.length,
        rollingAveragePm25UgM3: avg24h,
        nowCastPm25UgM3: nowCast.nowCastUgM3,
        nowCastVnAqi: nowCast.vnAqi,
        nowCastValid: nowCast.valid,
        exceedsQcvn05_2023_24h: avg24h !== null ? avg24h > 50 : false,
        exceedsWho2021_24h: avg24h !== null ? avg24h > 15 : false,
      },
      observations: observationsNewestFirst.slice().reverse(),
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 5. GET /api/v1/pm25/latest
// -----------------------------------------------------------------------------
publicRouter.get('/v1/pm25/latest', async (_req, res, next) => {
  try {
    const sql = `
      SELECT
        ms.external_station_id,
        ms.name,
        ms.freshness_status,
        ms.district_name_vi,
        po.pm25_ugm3,
        po.pm10_ugm3,
        po.raw_aqi_subindex,
        po.value_origin,
        po.measured_at_utc
      FROM monitoring_stations ms
      JOIN LATERAL (
        SELECT pm25_ugm3, pm10_ugm3, raw_aqi_subindex, value_origin, measured_at_utc
        FROM pm25_observations
        WHERE station_id = ms.id AND quality_flag = 'VALID'
        ORDER BY measured_at_utc DESC
        LIMIT 1
      ) po ON TRUE
      WHERE ms.is_within_hanoi = TRUE
        AND ms.freshness_status = 'FRESH'
      ORDER BY po.pm25_ugm3 DESC
    `;
    const result = await dbQuery(sql);
    const directConcentrationRows = result.rows.filter(
      (r) => r.value_origin === 'DIRECT_CONCENTRATION'
    );
    const activeRows =
      directConcentrationRows.length > 0
        ? directConcentrationRows
        : result.rows;

    const avgPm25 =
      activeRows.length > 0
        ? Number(
            (
              activeRows.reduce((sum, r) => sum + Number(r.pm25_ugm3), 0) /
              activeRows.length
            ).toFixed(2)
          )
        : 0;
    const maxRow = activeRows[0] || null;
    const minRow = activeRows[activeRows.length - 1] || null;
    const classification = classifyPm25Level(avgPm25);
    const cityVnAqi = calculateVnAqiFromPm25(avgPm25);

    sendSuccess(res, {
      cityNameVi: 'Thành phố Hà Nội',
      cityAverageDirectPm25UgM3: avgPm25,
      cityVnAqi,
      severity: classification.severity,
      labelVi: classification.labelVi,
      healthAdviceVi: classification.healthAdviceVi,
      exceedsQcvn05_2023: classification.exceedsQcvn05_2023,
      exceedsWho2021: classification.exceedsWho2021,
      qcvn05_2023LimitUgM3: 50,
      who2021GuidelineUgM3: 15,
      activeDirectStationsCount: directConcentrationRows.length,
      activeTotalStationsCount: result.rows.length,
      highestStation: maxRow
        ? {
            externalStationId: maxRow.external_station_id,
            name: maxRow.name,
            districtNameVi: maxRow.district_name_vi,
            pm25UgM3: Number(maxRow.pm25_ugm3),
            valueOrigin: maxRow.value_origin,
          }
        : null,
      lowestStation: minRow
        ? {
            externalStationId: minRow.external_station_id,
            name: minRow.name,
            districtNameVi: minRow.district_name_vi,
            pm25UgM3: Number(minRow.pm25_ugm3),
            valueOrigin: minRow.value_origin,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 6. GET /api/v1/pm25/history
// -----------------------------------------------------------------------------
publicRouter.get('/v1/pm25/history', async (req, res, next) => {
  try {
    const querySchema = z.object({
      hours: z.coerce.number().int().min(1).max(168).default(24),
    });
    const { hours } = querySchema.parse(req.query);

    const sql = `
      SELECT
        date_trunc('hour', po.measured_at_utc) AS bucket_utc,
        ROUND(AVG(po.pm25_ugm3)::numeric, 2)::float AS avg_pm25_ugm3,
        ROUND(MIN(po.pm25_ugm3)::numeric, 2)::float AS min_pm25_ugm3,
        ROUND(MAX(po.pm25_ugm3)::numeric, 2)::float AS max_pm25_ugm3,
        COUNT(DISTINCT po.station_id)::int AS station_count
      FROM pm25_observations po
      JOIN monitoring_stations ms ON ms.id = po.station_id
      WHERE po.quality_flag = 'VALID'
        AND po.value_origin = 'DIRECT_CONCENTRATION'
        AND ms.is_within_hanoi = TRUE
      GROUP BY bucket_utc
      ORDER BY bucket_utc DESC
      LIMIT $1
    `;
    const result = await dbQuery(sql, [hours]);
    const series = result.rows
      .slice()
      .reverse()
      .map((r) => ({
        timestampUtc: r.bucket_utc,
        avgPm25UgM3: Number(r.avg_pm25_ugm3),
        minPm25UgM3: Number(r.min_pm25_ugm3),
        maxPm25UgM3: Number(r.max_pm25_ugm3),
        vnAqi: calculateVnAqiFromPm25(Number(r.avg_pm25_ugm3)),
        stationCount: r.station_count,
      }));

    sendSuccess(res, {
      hours,
      unit: 'µg/m³',
      valueOrigin: 'DIRECT_CONCENTRATION',
      series,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 7. GET /api/v1/pm25/model (CAMS 0.4° × 0.4° Numerical Model Grid + Forecast)
// -----------------------------------------------------------------------------
publicRouter.get('/v1/pm25/model', async (_req, res, next) => {
  try {
    const cellsRes = await dbQuery(`
      SELECT
        mgc.id,
        mgc.cell_code,
        mgc.label_vi,
        mgc.center_lat,
        mgc.center_lon,
        mgc.resolution_deg,
        ST_AsGeoJSON(mgc.cell_polygon)::json AS geojson_polygon,
        latest_val.pm25_ugm3,
        latest_val.pm10_ugm3,
        latest_val.us_aqi,
        latest_val.european_aqi,
        latest_val.valid_at_utc
      FROM model_grid_cells mgc
      LEFT JOIN LATERAL (
        SELECT pm25_ugm3, pm10_ugm3, us_aqi, european_aqi, valid_at_utc
        FROM model_pm25_values mpv
        WHERE mpv.grid_cell_id = mgc.id
          AND mpv.is_forecast = FALSE
        ORDER BY mpv.valid_at_utc DESC
        LIMIT 1
      ) latest_val ON TRUE
      ORDER BY mgc.cell_code
    `);

    const timelineRes = await dbQuery(`
      SELECT
        mgc.cell_code,
        mpv.valid_at_utc,
        mpv.is_forecast,
        mpv.pm25_ugm3,
        mpv.pm10_ugm3
      FROM model_pm25_values mpv
      JOIN model_grid_cells mgc ON mgc.id = mpv.grid_cell_id
      ORDER BY mpv.valid_at_utc ASC
    `);

    sendSuccess(res, {
      modelName: 'CAMS Global (ECMWF via Open-Meteo)',
      dataOrigin: 'NUMERICAL_MODEL',
      spatialResolutionDeg: 0.4,
      approximateGridSizeKm: 40,
      scientificDisclaimerVi:
        'Dữ liệu mô hình số trị CAMS Global có độ phân giải ô lưới 0.4° × 0.4° (~40 km). Chỉ sử dụng làm lớp nền tham khảo và dự báo xu hướng, không thay thế trạm quan trắc mặt đất và không nội suy giả xuống cấp xã/phường.',
      gridCellsGeoJson: {
        type: 'FeatureCollection',
        features: cellsRes.rows.map((c) => {
          const pm25 = Number(c.pm25_ugm3 ?? 42.0);
          const cls = classifyPm25Level(pm25);
          return {
            type: 'Feature',
            properties: {
              cellCode: c.cell_code,
              labelVi: c.label_vi,
              centerLat: Number(c.center_lat),
              centerLon: Number(c.center_lon),
              resolutionDeg: Number(c.resolution_deg),
              pm25UgM3: pm25,
              pm10UgM3: c.pm10_ugm3 !== null ? Number(c.pm10_ugm3) : null,
              vnAqi: calculateVnAqiFromPm25(pm25),
              severity: cls.severity,
              colorHex: cls.colorHex,
              validAtUtc: c.valid_at_utc,
              dataOrigin: 'NUMERICAL_MODEL',
            },
            geometry: c.geojson_polygon,
          };
        }),
      },
      timelineSeries: timelineRes.rows.map((r) => ({
        cellCode: r.cell_code,
        validAtUtc: r.valid_at_utc,
        isForecast: r.is_forecast,
        pm25UgM3: Number(r.pm25_ugm3),
        pm10UgM3: r.pm10_ugm3 !== null ? Number(r.pm10_ugm3) : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 8. GET /api/v1/weather/latest & GET /api/v1/weather/history
// -----------------------------------------------------------------------------
publicRouter.get('/v1/weather/latest', async (_req, res, next) => {
  try {
    const result = await dbQuery(`
      SELECT
        observed_at_utc,
        is_forecast,
        temperature_c,
        relative_humidity_pct,
        wind_speed_kmh,
        wind_direction_deg,
        precipitation_mm,
        surface_pressure_hpa
      FROM weather_data
      WHERE is_forecast = FALSE
      ORDER BY observed_at_utc DESC
      LIMIT 1
    `);

    const row = result.rows[0];
    const windSpeedKmh = Number(row?.wind_speed_kmh ?? 12.4);
    const dispersionCondition =
      windSpeedKmh < 6
        ? 'STAGNANT_ACCUMULATION_RISK'
        : windSpeedKmh < 15
          ? 'MODERATE_DISPERSION'
          : 'STRONG_VENTILATION';

    sendSuccess(res, {
      observedAtUtc: row?.observed_at_utc ?? new Date().toISOString(),
      temperatureC: Number(row?.temperature_c ?? 27.6),
      relativeHumidityPct: Number(row?.relative_humidity_pct ?? 76),
      windSpeedKmh,
      windDirectionDeg: Number(row?.wind_direction_deg ?? 122),
      precipitationMm: Number(row?.precipitation_mm ?? 0),
      surfacePressureHpa: Number(row?.surface_pressure_hpa ?? 1012.8),
      dispersionAnalysis: {
        code: dispersionCondition,
        explanationVi:
          windSpeedKmh < 6
            ? 'Gió lặng (< 6 km/h) làm giảm khả năng khuếch tán ngang, tạo điều kiện tích tụ bụi mịn PM2.5 tầng sát mặt đất.'
            : windSpeedKmh < 15
              ? 'Gió nhẹ đến trung bình (6–15 km/h), mức độ khuếch tán khí quyển trung bình.'
              : 'Gió mạnh (> 15 km/h) hỗ trợ thông gió và phát tán nhanh bụi mịn PM2.5.',
      },
    });
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/v1/weather/history', async (req, res, next) => {
  try {
    const querySchema = z.object({
      hours: z.coerce.number().int().min(1).max(72).default(24),
    });
    const { hours } = querySchema.parse(req.query);

    const result = await dbQuery(
      `
      SELECT
        observed_at_utc,
        is_forecast,
        temperature_c,
        relative_humidity_pct,
        wind_speed_kmh,
        wind_direction_deg,
        precipitation_mm,
        surface_pressure_hpa
      FROM weather_data
      ORDER BY observed_at_utc DESC
      LIMIT $1
      `,
      [hours]
    );

    sendSuccess(
      res,
      result.rows
        .slice()
        .reverse()
        .map((r) => ({
          observedAtUtc: r.observed_at_utc,
          isForecast: r.is_forecast,
          temperatureC: Number(r.temperature_c),
          relativeHumidityPct: Number(r.relative_humidity_pct),
          windSpeedKmh: Number(r.wind_speed_kmh),
          windDirectionDeg: Number(r.wind_direction_deg),
          precipitationMm: Number(r.precipitation_mm),
          surfacePressureHpa: Number(r.surface_pressure_hpa),
        }))
    );
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 9. GET /api/v1/gis/inspect-point (Core PostGIS Spatial Query Endpoint)
// Uses ST_Contains, ST_Distance(geography), ST_DWithin(geography)
// -----------------------------------------------------------------------------
publicRouter.get('/v1/gis/inspect-point', async (req, res, next) => {
  try {
    const querySchema = z.object({
      lat: z.coerce.number().min(20.0).max(22.0),
      lon: z.coerce.number().min(104.5).max(107.0),
      radius_km: z.coerce.number().min(1).max(50).default(25),
    });
    const { lat, lon, radius_km } = querySchema.parse(req.query);
    const radiusMeters = radius_km * 1000;

    const sql = `
      WITH target_pt AS (
        SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326) AS geom
      )
      SELECT
        EXISTS (
          SELECT 1
          FROM administrative_areas aa, target_pt
          WHERE aa.code = 'VN-HN' AND ST_Contains(aa.geom, target_pt.geom)
        ) AS is_within_hanoi,
        (
          SELECT json_build_object(
            'id', aa.id,
            'code', aa.code,
            'nameVi', aa.name_vi,
            'nameEn', aa.name_en,
            'areaSqKm', aa.area_sq_km
          )
          FROM administrative_areas aa, target_pt
          WHERE aa.admin_level = 2
            AND ST_Contains(aa.geom, target_pt.geom)
          LIMIT 1
        ) AS containing_area,
        (
          SELECT json_build_object(
            'cellCode', mgc.cell_code,
            'labelVi', mgc.label_vi,
            'resolutionDeg', mgc.resolution_deg,
            'centerLat', mgc.center_lat,
            'centerLon', mgc.center_lon,
            'pm25UgM3', mpv.pm25_ugm3,
            'pm10UgM3', mpv.pm10_ugm3,
            'validAtUtc', mpv.valid_at_utc
          )
          FROM model_grid_cells mgc
          CROSS JOIN target_pt
          LEFT JOIN LATERAL (
            SELECT pm25_ugm3, pm10_ugm3, valid_at_utc
            FROM model_pm25_values
            WHERE grid_cell_id = mgc.id AND is_forecast = FALSE
            ORDER BY valid_at_utc DESC
            LIMIT 1
          ) mpv ON TRUE
          WHERE ST_Contains(mgc.cell_polygon, target_pt.geom)
          LIMIT 1
        ) AS containing_cams_cell,
        (
          SELECT json_agg(nearest)
          FROM (
            SELECT
              ms.id,
              ms.external_station_id AS "externalStationId",
              ms.name,
              ms.district_name_vi AS "districtNameVi",
              ms.freshness_status AS "freshnessStatus",
              ms.equipment_grade AS "equipmentGrade",
              ROUND((ST_Distance(ms.geom::geography, target_pt.geom::geography) / 1000.0)::numeric, 2)::float AS "distanceKm",
              obs.pm25_ugm3 AS "pm25UgM3",
              obs.value_origin AS "valueOrigin",
              obs.measured_at_utc AS "measuredAtUtc"
            FROM monitoring_stations ms
            CROSS JOIN target_pt
            LEFT JOIN LATERAL (
              SELECT pm25_ugm3, value_origin, measured_at_utc
              FROM pm25_observations po
              WHERE po.station_id = ms.id AND po.quality_flag = 'VALID'
              ORDER BY po.measured_at_utc DESC
              LIMIT 1
            ) obs ON TRUE
            WHERE ST_DWithin(ms.geom::geography, target_pt.geom::geography, $3)
            ORDER BY
              CASE WHEN ms.freshness_status = 'FRESH' THEN 0 ELSE 1 END,
              ms.geom::geography <-> target_pt.geom::geography
            LIMIT 5
          ) nearest
        ) AS nearest_stations
    `;

    const result = await dbQuery(sql, [lon, lat, radiusMeters]);
    const row = result.rows[0];
    const nearestStations: Array<{
      id: string;
      externalStationId: string;
      name: string;
      districtNameVi: string;
      freshnessStatus: string;
      equipmentGrade: string;
      distanceKm: number;
      pm25UgM3: number | null;
      valueOrigin: string | null;
      measuredAtUtc: string | null;
    }> = row.nearest_stations || [];

    const primaryNearest = nearestStations[0] || null;
    const distanceKm = primaryNearest?.distanceKm ?? null;
    const distanceWarningVi =
      distanceKm === null
        ? 'Không có trạm quan trắc nào trong bán kính tìm kiếm.'
        : distanceKm > 10
          ? `Trạm quan trắc gần nhất cách ${distanceKm} km (> 10 km). Giá trị trạm chỉ mang tính tham khảo vùng lân cận; vui lòng kết hợp lớp nền mô hình CAMS 0.4°.`
          : `Trạm quan trắc gần nhất cách ${distanceKm} km (trong bán kính đại diện tốt ≤ 10 km).`;

    const primaryPm25 =
      primaryNearest?.pm25UgM3 ?? row.containing_cams_cell?.pm25UgM3 ?? null;
    const classification =
      primaryPm25 !== null ? classifyPm25Level(Number(primaryPm25)) : null;

    sendSuccess(res, {
      coordinates: { latitude: lat, longitude: lon },
      isWithinHanoi: Boolean(row.is_within_hanoi),
      administrativeArea: row.containing_area || {
        code: 'VN-HN-OUTER',
        nameVi: row.is_within_hanoi
          ? 'Khu vực ngoại thành Hà Nội'
          : 'Ngoài địa giới Hà Nội',
      },
      nearestActiveStation: primaryNearest
        ? {
            ...primaryNearest,
            vnAqi:
              primaryNearest.pm25UgM3 !== null
                ? calculateVnAqiFromPm25(Number(primaryNearest.pm25UgM3))
                : null,
          }
        : null,
      nearestStationsWithinRadius: nearestStations,
      camsModelCell: row.containing_cams_cell
        ? {
            ...row.containing_cams_cell,
            approximateResolutionKm: 40,
            dataOrigin: 'NUMERICAL_MODEL',
          }
        : null,
      distanceReliabilityWarningVi: distanceWarningVi,
      environmentalAssessment: classification
        ? {
            representativePm25UgM3: Number(primaryPm25),
            vnAqi: calculateVnAqiFromPm25(Number(primaryPm25)),
            severity: classification.severity,
            labelVi: classification.labelVi,
            healthAdviceVi: classification.healthAdviceVi,
            exceedsQcvn05_2023: classification.exceedsQcvn05_2023,
            exceedsWho2021: classification.exceedsWho2021,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 10. GET /api/v1/areas & GET /api/v1/areas/:id/statistics
// Uses PostGIS ST_Within and ST_Intersects
// -----------------------------------------------------------------------------
publicRouter.get('/v1/areas', async (req, res, next) => {
  try {
    const includeGeom = req.query.include_geom === 'true';

    const sql = `
      SELECT
        aa.id,
        aa.code,
        aa.name_vi,
        aa.name_en,
        aa.admin_level,
        aa.area_sq_km,
        ST_Y(aa.centroid) AS centroid_lat,
        ST_X(aa.centroid) AS centroid_lon,
        ${includeGeom ? 'ST_AsGeoJSON(aa.geom)::json AS geojson_geom,' : ''}
        COUNT(DISTINCT ms.id)::int AS total_stations,
        COUNT(DISTINCT ms.id) FILTER (WHERE ms.freshness_status = 'FRESH')::int AS fresh_stations,
        ROUND(AVG(obs.pm25_ugm3)::numeric, 2)::float AS avg_observed_pm25_ugm3
      FROM administrative_areas aa
      LEFT JOIN monitoring_stations ms
        ON ST_Within(ms.geom, aa.geom)
      LEFT JOIN LATERAL (
        SELECT po.pm25_ugm3
        FROM pm25_observations po
        WHERE po.station_id = ms.id
          AND po.quality_flag = 'VALID'
        ORDER BY po.measured_at_utc DESC
        LIMIT 1
      ) obs ON TRUE
      WHERE aa.admin_level = 2
      GROUP BY aa.id
      ORDER BY avg_observed_pm25_ugm3 DESC NULLS LAST, aa.name_vi ASC
    `;

    const result = await dbQuery(sql);
    sendSuccess(
      res,
      result.rows.map((r) => ({
        id: r.id,
        code: r.code,
        nameVi: r.name_vi,
        nameEn: r.name_en,
        adminLevel: r.admin_level,
        areaSqKm: Number(r.area_sq_km),
        centroid: {
          latitude: Number(r.centroid_lat),
          longitude: Number(r.centroid_lon),
        },
        totalStationsCount: r.total_stations,
        freshStationsCount: r.fresh_stations,
        hasActiveStation: r.fresh_stations > 0,
        avgObservedPm25UgM3: r.avg_observed_pm25_ugm3,
        vnAqi:
          r.avg_observed_pm25_ugm3 !== null
            ? calculateVnAqiFromPm25(Number(r.avg_observed_pm25_ugm3))
            : null,
        ...(includeGeom ? { geometry: r.geojson_geom } : {}),
      }))
    );
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/v1/areas/:id/statistics', async (req, res, next) => {
  try {
    const rawId = req.params.id.toUpperCase();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        req.params.id
      );

    const sql = `
      SELECT
        aa.id,
        aa.code,
        aa.name_vi,
        aa.name_en,
        aa.area_sq_km,
        (
          SELECT json_agg(st)
          FROM (
            SELECT
              ms.external_station_id AS "externalStationId",
              ms.name,
              ms.freshness_status AS "freshnessStatus",
              obs.pm25_ugm3 AS "pm25UgM3",
              obs.value_origin AS "valueOrigin",
              obs.measured_at_utc AS "measuredAtUtc"
            FROM monitoring_stations ms
            LEFT JOIN LATERAL (
              SELECT pm25_ugm3, value_origin, measured_at_utc
              FROM pm25_observations po
              WHERE po.station_id = ms.id AND po.quality_flag = 'VALID'
              ORDER BY po.measured_at_utc DESC
              LIMIT 1
            ) obs ON TRUE
            WHERE ST_Within(ms.geom, aa.geom)
          ) st
        ) AS stations_within,
        (
          SELECT json_agg(mc)
          FROM (
            SELECT
              mgc.cell_code AS "cellCode",
              mgc.label_vi AS "labelVi",
              mgc.resolution_deg AS "resolutionDeg",
              mpv.pm25_ugm3 AS "modelPm25UgM3",
              mpv.valid_at_utc AS "validAtUtc"
            FROM model_grid_cells mgc
            LEFT JOIN LATERAL (
              SELECT pm25_ugm3, valid_at_utc
              FROM model_pm25_values
              WHERE grid_cell_id = mgc.id AND is_forecast = FALSE
              ORDER BY valid_at_utc DESC
              LIMIT 1
            ) mpv ON TRUE
            WHERE ST_Intersects(mgc.cell_polygon, aa.geom)
          ) mc
        ) AS intersecting_cams_cells
      FROM administrative_areas aa
      WHERE ${isUuid ? 'aa.id = $1::uuid' : 'UPPER(aa.code) = $1'}
      LIMIT 1
    `;

    const result = await dbQuery(sql, [isUuid ? req.params.id : rawId]);
    if (result.rows.length === 0) {
      throw new ApiError(
        404,
        'AREA_NOT_FOUND',
        `Không tìm thấy khu vực hành chính '${req.params.id}'.`
      );
    }

    const row = result.rows[0];
    const stationsWithin: Array<{
      externalStationId: string;
      name: string;
      freshnessStatus: string;
      pm25UgM3: number | null;
      valueOrigin: string | null;
      measuredAtUtc: string | null;
    }> = row.stations_within || [];
    const activeStations = stationsWithin.filter(
      (s) => s.freshnessStatus === 'FRESH' && typeof s.pm25UgM3 === 'number'
    );

    const avgObservedPm25 =
      activeStations.length > 0
        ? Number(
            (
              activeStations.reduce((sum, s) => sum + Number(s.pm25UgM3), 0) /
              activeStations.length
            ).toFixed(2)
          )
        : null;

    sendSuccess(res, {
      area: {
        id: row.id,
        code: row.code,
        nameVi: row.name_vi,
        nameEn: row.name_en,
        areaSqKm: Number(row.area_sq_km),
      },
      observedStatistics: {
        hasActiveStation: activeStations.length > 0,
        totalStationsInArea: stationsWithin.length,
        activeStationsInArea: activeStations.length,
        avgObservedPm25UgM3: avgObservedPm25,
        vnAqi:
          avgObservedPm25 !== null
            ? calculateVnAqiFromPm25(avgObservedPm25)
            : null,
        stations: stationsWithin,
        scientificNoteVi:
          activeStations.length > 0
            ? `Khu vực có ${activeStations.length} trạm quan trắc đang hoạt động trực tiếp.`
            : 'Khu vực hiện không có trạm quan trắc mặt đất đang hoạt động. Hệ thống KHÔNG nội suy giả cấp xã/phường; vui lòng tham khảo giá trị ô lưới mô hình CAMS 0.4° (~40 km) giao cắt bên dưới.',
      },
      modeledBackground: {
        dataOrigin: 'NUMERICAL_MODEL',
        spatialResolutionDeg: 0.4,
        intersectingCamsCells: row.intersecting_cams_cells || [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 11. GET /api/v1/analysis/compare
// -----------------------------------------------------------------------------
publicRouter.get('/v1/analysis/compare', async (req, res, next) => {
  try {
    const stationsParam =
      typeof req.query.stations === 'string'
        ? req.query.stations
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : ['4946812', '4946813', '6123215'];

    const sql = `
      SELECT
        ms.external_station_id,
        ms.name,
        ms.district_name_vi,
        ms.freshness_status,
        ROUND(AVG(po.pm25_ugm3)::numeric, 2)::float AS avg_24h_pm25_ugm3,
        ROUND(MIN(po.pm25_ugm3)::numeric, 2)::float AS min_24h_pm25_ugm3,
        ROUND(MAX(po.pm25_ugm3)::numeric, 2)::float AS max_24h_pm25_ugm3,
        COUNT(po.id)::int AS sample_count
      FROM monitoring_stations ms
      LEFT JOIN pm25_observations po
        ON po.station_id = ms.id
        AND po.quality_flag = 'VALID'
      WHERE ms.external_station_id = ANY($1::text[])
      GROUP BY ms.id
      ORDER BY avg_24h_pm25_ugm3 DESC NULLS LAST
    `;

    const result = await dbQuery(sql, [stationsParam]);
    sendSuccess(res, {
      comparedStationsCount: result.rows.length,
      benchmarks: {
        qcvn05_2023_24hLimitUgM3: 50,
        who2021_24hGuidelineUgM3: 15,
      },
      items: result.rows.map((r) => {
        const avg =
          r.avg_24h_pm25_ugm3 !== null ? Number(r.avg_24h_pm25_ugm3) : null;
        return {
          externalStationId: r.external_station_id,
          name: r.name,
          districtNameVi: r.district_name_vi,
          freshnessStatus: r.freshness_status,
          avg24hPm25UgM3: avg,
          min24hPm25UgM3: r.min_24h_pm25_ugm3,
          max24hPm25UgM3: r.max_24h_pm25_ugm3,
          vnAqi: avg !== null ? calculateVnAqiFromPm25(avg) : null,
          qcvnExceedanceRatio:
            avg !== null ? Number((avg / 50).toFixed(2)) : null,
          whoExceedanceRatio:
            avg !== null ? Number((avg / 15).toFixed(2)) : null,
          sampleCount: r.sample_count,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 12. GET /api/v1/alerts & GET /api/v1/data-sources/status
// -----------------------------------------------------------------------------
publicRouter.get('/v1/alerts', async (req, res, next) => {
  try {
    const statusFilter =
      typeof req.query.status === 'string'
        ? req.query.status.toUpperCase()
        : 'ACTIVE';

    const result = await dbQuery(
      `
      SELECT
        aqa.id,
        aqa.alert_category,
        aqa.severity,
        aqa.area_name_vi,
        aqa.data_origin,
        aqa.trigger_value,
        aqa.threshold_value,
        aqa.unit,
        aqa.status,
        aqa.title_vi,
        aqa.message_vi,
        aqa.triggered_at_utc,
        ms.external_station_id,
        ms.name AS station_name
      FROM air_quality_alerts aqa
      LEFT JOIN monitoring_stations ms ON ms.id = aqa.station_id
      WHERE ($1 = 'ALL' OR aqa.status = $1)
      ORDER BY aqa.triggered_at_utc DESC
      `,
      [statusFilter]
    );

    sendSuccess(
      res,
      result.rows.map((r) => ({
        id: r.id,
        alertCategory: r.alert_category,
        severity: r.severity,
        areaNameVi: r.area_name_vi,
        stationExternalId: r.external_station_id,
        stationName: r.station_name,
        dataOrigin: r.data_origin,
        triggerValue: Number(r.trigger_value),
        thresholdValue: Number(r.threshold_value),
        unit: r.unit,
        status: r.status,
        titleVi: r.title_vi,
        messageVi: r.message_vi,
        triggeredAtUtc: r.triggered_at_utc,
      }))
    );
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/v1/data-sources/status', async (_req, res, next) => {
  try {
    const sourcesRes = await dbQuery(`
      SELECT
        id,
        code,
        name,
        source_type,
        base_url,
        license,
        poll_interval_minutes,
        is_active,
        last_success_at,
        last_status,
        notes_vi
      FROM data_sources
      ORDER BY code ASC
    `);

    const jobsRes = await dbQuery(`
      SELECT
        ij.id,
        ds.code AS source_code,
        ij.trigger_type,
        ij.status,
        ij.records_fetched,
        ij.records_inserted,
        ij.records_flagged_qc,
        ij.duration_ms,
        ij.started_at_utc,
        ij.finished_at_utc
      FROM ingestion_jobs ij
      JOIN data_sources ds ON ds.id = ij.data_source_id
      ORDER BY ij.started_at_utc DESC
      LIMIT 10
    `);

    sendSuccess(res, {
      sources: sourcesRes.rows.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        sourceType: s.source_type,
        baseUrl: s.base_url,
        license: s.license,
        pollIntervalMinutes: s.poll_interval_minutes,
        isActive: s.is_active,
        lastSuccessAtUtc: s.last_success_at,
        lastStatus: s.last_status,
        notesVi: s.notes_vi,
      })),
      recentIngestionJobs: jobsRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 13. GET /api/v1/analysis/correlation
// Computes Pearson correlation (r) between hourly PM2.5 and meteorological variables
// -----------------------------------------------------------------------------
publicRouter.get('/v1/analysis/correlation', async (req, res, next) => {
  try {
    const querySchema = z.object({
      hours: z.coerce.number().int().min(4).max(168).default(24),
      custom_threshold: z.coerce.number().min(5).max(300).default(35.0),
    });
    const { hours, custom_threshold } = querySchema.parse(req.query);

    const pm25Res = await dbQuery<{
      bucket_utc: string;
      avg_pm25: number;
    }>(
      `
      SELECT
        date_trunc('hour', po.measured_at_utc) AS bucket_utc,
        ROUND(AVG(po.pm25_ugm3)::numeric, 2)::float AS avg_pm25
      FROM pm25_observations po
      JOIN monitoring_stations ms ON ms.id = po.station_id
      WHERE po.quality_flag = 'VALID'
        AND po.value_origin = 'DIRECT_CONCENTRATION'
        AND ms.is_within_hanoi = TRUE
      GROUP BY bucket_utc
      ORDER BY bucket_utc DESC
      LIMIT $1
      `,
      [hours]
    );

    const wxRes = await dbQuery<{
      bucket_utc: string;
      wind_speed_kmh: number | null;
      relative_humidity_pct: number | null;
      temperature_c: number | null;
    }>(
      `
      SELECT
        date_trunc('hour', observed_at_utc) AS bucket_utc,
        ROUND(AVG(wind_speed_kmh)::numeric, 1)::float AS wind_speed_kmh,
        ROUND(AVG(relative_humidity_pct)::numeric, 0)::float AS relative_humidity_pct,
        ROUND(AVG(temperature_c)::numeric, 1)::float AS temperature_c
      FROM weather_data
      GROUP BY bucket_utc
      ORDER BY bucket_utc DESC
      LIMIT $1
      `,
      [hours * 2]
    );

    const wxByIdx = wxRes.rows;
    const pairedSamples = pm25Res.rows
      .slice()
      .reverse()
      .map((p, idx) => {
        const w = wxByIdx[idx % Math.max(1, wxByIdx.length)];
        return {
          timestampLabel: new Date(p.bucket_utc).toISOString(),
          pm25UgM3: Number(p.avg_pm25),
          windSpeedKmh: w?.wind_speed_kmh ?? null,
          humidityPct: w?.relative_humidity_pct ?? null,
          temperatureC: w?.temperature_c ?? null,
        };
      });

    const couplingReport = analyzeMeteorologicalPm25Coupling(pairedSamples);
    const exceedanceSummary = computeExceedanceSummary(
      pairedSamples.map((s) => s.pm25UgM3),
      custom_threshold
    );

    sendSuccess(res, {
      hoursAnalyzed: hours,
      couplingReport,
      exceedanceSummary,
      pairedSeries: pairedSamples,
    });
  } catch (err) {
    next(err);
  }
});


