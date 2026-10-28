import {
  evaluateFreshnessStatus,
  evaluatePm25QualityFlag,
} from '@hanoi-pm25/shared';
import { env } from '../config/env.js';
import { dbQuery } from '../db/pool.js';

interface OpenAqSensor {
  id: number;
  name: string;
  parameter: {
    id: number;
    name: string;
    units: string;
  };
}

interface OpenAqLocation {
  id: number;
  name: string;
  locality: string | null;
  isMonitor: boolean;
  provider?: {
    id: number;
    name: string;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  sensors?: OpenAqSensor[];
  datetimeFirst?: {
    utc: string;
  } | null;
  datetimeLast?: {
    utc: string;
  } | null;
}

interface OpenAqLatestItem {
  datetime?: {
    utc: string;
  };
  value: number;
  sensorsId: number;
  locationsId: number;
}

export interface WorkerRunMetrics {
  sourceCode: string;
  recordsFetched: number;
  recordsInserted: number;
  recordsFlaggedQc: number;
  stationsSynced: number;
  activeStationsCount: number;
}

export async function runOpenAqIngestion(
  ingestionJobId: string,
  dataSourceId: string
): Promise<WorkerRunMetrics> {
  if (!env.OPENAQ_API_KEY) {
    throw new Error('OPENAQ_API_KEY is missing in environment configuration');
  }

  const bboxUrl =
    'https://api.openaq.org/v3/locations?bbox=105.28,20.56,106.02,21.39&limit=100';
  const locRes = await fetch(bboxUrl, {
    headers: {
      Accept: 'application/json',
      'X-API-Key': env.OPENAQ_API_KEY,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!locRes.ok) {
    throw new Error(
      `OpenAQ v3 locations request failed with HTTP ${locRes.status}`
    );
  }

  const locJson = (await locRes.json()) as { results?: OpenAqLocation[] };
  const allLocations = locJson.results ?? [];

  const pm25Locations = allLocations.filter((loc) =>
    (loc.sensors ?? []).some((s) => s.parameter?.name === 'pm25')
  );

  let recordsFetched = pm25Locations.length;
  let recordsInserted = 0;
  let recordsFlaggedQc = 0;
  let stationsSynced = 0;
  let activeStationsCount = 0;

  const now = new Date();

  for (const loc of pm25Locations) {
    const lat = loc.coordinates?.latitude;
    const lon = loc.coordinates?.longitude;
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;

    const pm25Sensor = (loc.sensors ?? []).find(
      (s) => s.parameter?.name === 'pm25'
    );
    if (!pm25Sensor) continue;

    const lastUtc = loc.datetimeLast?.utc ?? null;
    const firstUtc = loc.datetimeFirst?.utc ?? null;
    const freshness = evaluateFreshnessStatus(lastUtc, now);
    if (freshness.status === 'FRESH') {
      activeStationsCount++;
    }

    const providerName =
      loc.provider?.name || 'Hanoi Air Quality Monitoring Network';
    const isRef = Boolean(loc.isMonitor);
    const equipmentGrade = isRef ? 'REFERENCE_GRADE' : 'LOW_COST_SENSOR';

    const stationUpsertRes = await dbQuery<{
      id: string;
      is_within_hanoi: boolean;
    }>(
      `
      WITH pt AS (
        SELECT ST_SetSRID(ST_MakePoint($6, $5), 4326) AS geom
      ),
      containing_area AS (
        SELECT aa.id, aa.name_vi
        FROM administrative_areas aa, pt
        WHERE aa.admin_level = 2 AND ST_Contains(aa.geom, pt.geom)
        LIMIT 1
      ),
      within_hn AS (
        SELECT EXISTS (
          SELECT 1
          FROM administrative_areas aa, pt
          WHERE aa.code = 'VN-HN' AND ST_Contains(aa.geom, pt.geom)
        ) AS inside
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
        administrative_area_id,
        district_name_vi,
        is_within_hanoi,
        freshness_status,
        first_observed_at,
        last_observed_at,
        updated_at_utc
      )
      SELECT
        $1::uuid,
        $2,
        $3,
        $4,
        $7,
        $8,
        pt.geom,
        $5,
        $6,
        (SELECT id FROM containing_area),
        COALESCE((SELECT name_vi FROM containing_area), $9),
        (SELECT inside FROM within_hn),
        $10,
        $11::timestamptz,
        $12::timestamptz,
        NOW()
      FROM pt
      ON CONFLICT (data_source_id, external_station_id) DO UPDATE SET
        name = EXCLUDED.name,
        provider_name = EXCLUDED.provider_name,
        geom = EXCLUDED.geom,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        administrative_area_id = COALESCE(EXCLUDED.administrative_area_id, monitoring_stations.administrative_area_id),
        freshness_status = EXCLUDED.freshness_status,
        last_observed_at = COALESCE(EXCLUDED.last_observed_at, monitoring_stations.last_observed_at),
        updated_at_utc = NOW()
      RETURNING id, is_within_hanoi
      `,
      [
        dataSourceId,
        String(loc.id),
        loc.name,
        providerName,
        lat,
        lon,
        equipmentGrade,
        isRef,
        loc.locality || 'Hà Nội',
        freshness.status,
        firstUtc,
        lastUtc,
      ]
    );

    const stationRow = stationUpsertRes.rows[0];
    stationsSynced++;

    const sensorUpsertRes = await dbQuery<{ id: string }>(
      `
      INSERT INTO sensors (
        station_id,
        external_sensor_id,
        parameter_code,
        unit,
        averaging_period,
        is_active
      )
      VALUES ($1::uuid, $2, 'pm25', $3, '1h', $4)
      ON CONFLICT (station_id, external_sensor_id) DO UPDATE SET
        unit = EXCLUDED.unit,
        is_active = EXCLUDED.is_active
      RETURNING id
      `,
      [
        stationRow.id,
        String(pm25Sensor.id),
        pm25Sensor.parameter.units || 'µg/m³',
        freshness.status !== 'UNAVAILABLE',
      ]
    );
    const sensorId = sensorUpsertRes.rows[0].id;

    // Fetch latest measurements for stations that reported within the last 7 days
    const reportedRecently =
      lastUtc !== null &&
      now.getTime() - Date.parse(lastUtc) <= 7 * 24 * 3600 * 1000;

    if (reportedRecently) {
      const latestUrl = `https://api.openaq.org/v3/locations/${loc.id}/latest`;
      const latestRes = await fetch(latestUrl, {
        headers: {
          Accept: 'application/json',
          'X-API-Key': env.OPENAQ_API_KEY,
        },
        signal: AbortSignal.timeout(12000),
      });

      if (latestRes.ok) {
        const latestJson = (await latestRes.json()) as {
          results?: OpenAqLatestItem[];
        };
        const results = latestJson.results ?? [];
        recordsFetched += results.length;

        const pm25Latest = results.find((r) => r.sensorsId === pm25Sensor.id);
        if (pm25Latest && pm25Latest.datetime?.utc) {
          const measuredAtUtc = pm25Latest.datetime.utc;
          const pm25Val = Number(pm25Latest.value.toFixed(2));
          const qcFlag = evaluatePm25QualityFlag(
            pm25Val,
            measuredAtUtc,
            stationRow.is_within_hanoi,
            now
          );

          if (qcFlag !== 'VALID') {
            recordsFlaggedQc++;
          }

          const obsInsert = await dbQuery(
            `
            INSERT INTO pm25_observations (
              sensor_id,
              station_id,
              ingestion_job_id,
              pm25_ugm3,
              raw_value,
              value_origin,
              quality_flag,
              measured_at_utc,
              published_at_utc,
              raw_payload
            )
            VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $4, 'DIRECT_CONCENTRATION', $5, $6::timestamptz, $6::timestamptz, $7::jsonb)
            ON CONFLICT (sensor_id, measured_at_utc) DO UPDATE SET
              pm25_ugm3 = EXCLUDED.pm25_ugm3,
              raw_value = EXCLUDED.raw_value,
              quality_flag = EXCLUDED.quality_flag,
              ingestion_job_id = EXCLUDED.ingestion_job_id
            `,
            [
              sensorId,
              stationRow.id,
              ingestionJobId,
              pm25Val,
              qcFlag,
              measuredAtUtc,
              JSON.stringify(pm25Latest),
            ]
          );
          recordsInserted += obsInsert.rowCount ?? 0;
        }
      }
    }
  }

  return {
    sourceCode: 'OPENAQ_V3',
    recordsFetched,
    recordsInserted,
    recordsFlaggedQc,
    stationsSynced,
    activeStationsCount,
  };
}
