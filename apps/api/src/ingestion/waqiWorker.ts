import {
  convertUsAqiToApproximatePm25UgM3,
  evaluateFreshnessStatus,
  evaluatePm25QualityFlag,
} from '@hanoi-pm25/shared';
import { env } from '../config/env.js';
import { dbQuery } from '../db/pool.js';
import type { WorkerRunMetrics } from './openaqWorker.js';

interface WaqiBoundsStation {
  lat: number;
  lon: number;
  uid: number;
  aqi: string;
  station: {
    name: string;
    time: string;
  };
}

export async function runWaqiIngestion(
  ingestionJobId: string,
  dataSourceId: string
): Promise<WorkerRunMetrics> {
  if (!env.WAQI_API_TOKEN) {
    throw new Error('WAQI_API_TOKEN is missing in environment configuration');
  }

  const url = `https://api.waqi.info/v2/map/bounds?latlng=20.56,105.28,21.39,106.02&networks=all&token=${encodeURIComponent(
    env.WAQI_API_TOKEN
  )}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`WAQI map bounds request failed with HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    status: string;
    data?: WaqiBoundsStation[];
  };
  if (json.status !== 'ok' || !Array.isArray(json.data)) {
    throw new Error(`WAQI returned unexpected status: ${json.status}`);
  }

  const items = json.data;
  let recordsFetched = items.length;
  let recordsInserted = 0;
  let recordsFlaggedQc = 0;
  let stationsSynced = 0;
  let activeStationsCount = 0;

  const now = new Date();

  for (const item of items) {
    const stationName = item.station?.name || `WAQI Station ${item.uid}`;
    const lowerName = stationName.toLowerCase();
    const isNeighboringProvinceByName =
      lowerName.includes('viet tri') ||
      lowerName.includes('việt trì') ||
      lowerName.includes('phú thọ') ||
      lowerName.includes('phu tho') ||
      lowerName.includes('bắc ninh') ||
      lowerName.includes('hưng yên') ||
      lowerName.includes('vĩnh phúc');

    const measuredAtUtc = item.station?.time
      ? new Date(item.station.time).toISOString()
      : now.toISOString();

    const freshness = evaluateFreshnessStatus(measuredAtUtc, now);
    const aqiNum = Number(item.aqi);
    const hasNumericAqi = Number.isFinite(aqiNum) && aqiNum >= 0;

    const stationUpsertRes = await dbQuery<{
      id: string;
      is_within_hanoi: boolean;
    }>(
      `
      WITH pt AS (
        SELECT ST_SetSRID(ST_MakePoint($4, $3), 4326) AS geom
      ),
      containing_area AS (
        SELECT aa.id, aa.name_vi
        FROM administrative_areas aa, pt
        WHERE aa.admin_level = 2 AND ST_Contains(aa.geom, pt.geom)
        LIMIT 1
      ),
      within_hn AS (
        SELECT (
          EXISTS (
            SELECT 1
            FROM administrative_areas aa, pt
            WHERE aa.code = 'VN-HN' AND ST_Contains(aa.geom, pt.geom)
          ) AND NOT $7::boolean
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
        last_observed_at,
        updated_at_utc
      )
      SELECT
        $1::uuid,
        $2,
        $5,
        'WAQI / AQICN Network',
        'LOW_COST_SENSOR',
        FALSE,
        pt.geom,
        $3,
        $4,
        (SELECT id FROM containing_area),
        COALESCE((SELECT name_vi FROM containing_area), 'Hà Nội'),
        (SELECT inside FROM within_hn),
        $6,
        $8::timestamptz,
        NOW()
      FROM pt
      ON CONFLICT (data_source_id, external_station_id) DO UPDATE SET
        name = EXCLUDED.name,
        geom = EXCLUDED.geom,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        administrative_area_id = COALESCE(EXCLUDED.administrative_area_id, monitoring_stations.administrative_area_id),
        is_within_hanoi = EXCLUDED.is_within_hanoi,
        freshness_status = EXCLUDED.freshness_status,
        last_observed_at = EXCLUDED.last_observed_at,
        updated_at_utc = NOW()
      RETURNING id, is_within_hanoi
      `,
      [
        dataSourceId,
        `WAQI_${item.uid}`,
        item.lat,
        item.lon,
        stationName,
        hasNumericAqi ? freshness.status : 'UNAVAILABLE',
        isNeighboringProvinceByName,
        measuredAtUtc,
      ]
    );

    const stationRow = stationUpsertRes.rows[0];
    stationsSynced++;
    if (stationRow.is_within_hanoi && freshness.status === 'FRESH' && hasNumericAqi) {
      activeStationsCount++;
    }

    const sensorRes = await dbQuery<{ id: string }>(
      `
      INSERT INTO sensors (
        station_id,
        external_sensor_id,
        parameter_code,
        unit,
        averaging_period,
        is_active
      )
      VALUES ($1::uuid, $2, 'pm25', 'US_AQI_SUBINDEX', '1h', $3)
      ON CONFLICT (station_id, external_sensor_id) DO UPDATE SET
        is_active = EXCLUDED.is_active
      RETURNING id
      `,
      [stationRow.id, `waqi-sensor-${item.uid}`, hasNumericAqi]
    );
    const sensorId = sensorRes.rows[0].id;

    if (hasNumericAqi) {
      const approxPm25UgM3 = convertUsAqiToApproximatePm25UgM3(aqiNum);
      const qcFlag = evaluatePm25QualityFlag(
        approxPm25UgM3,
        measuredAtUtc,
        stationRow.is_within_hanoi,
        now
      );

      if (qcFlag !== 'VALID') {
        recordsFlaggedQc++;
      }

      const obsRes = await dbQuery(
        `
        INSERT INTO pm25_observations (
          sensor_id,
          station_id,
          ingestion_job_id,
          pm25_ugm3,
          raw_aqi_subindex,
          raw_value,
          value_origin,
          quality_flag,
          measured_at_utc,
          published_at_utc,
          raw_payload
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4::double precision, $5::integer, $5::double precision, 'DERIVED_FROM_US_AQI', $6, $7::timestamptz, $7::timestamptz, $8::jsonb)
        ON CONFLICT (sensor_id, measured_at_utc) DO UPDATE SET
          pm25_ugm3 = EXCLUDED.pm25_ugm3,
          raw_aqi_subindex = EXCLUDED.raw_aqi_subindex,
          raw_value = EXCLUDED.raw_value,
          quality_flag = EXCLUDED.quality_flag,
          ingestion_job_id = EXCLUDED.ingestion_job_id
        `,
        [
          sensorId,
          stationRow.id,
          ingestionJobId,
          approxPm25UgM3,
          Math.round(aqiNum),
          qcFlag,
          measuredAtUtc,
          JSON.stringify(item),
        ]
      );
      recordsInserted += obsRes.rowCount ?? 0;
    }
  }

  return {
    sourceCode: 'WAQI_API',
    recordsFetched,
    recordsInserted,
    recordsFlaggedQc,
    stationsSynced,
    activeStationsCount,
  };
}
