import {
  classifyPm25Level,
  calculateVnAqiFromPm25,
} from '@hanoi-pm25/shared';
import { dbQuery } from '../db/pool.js';
import {
  runOpenAqIngestion,
  type WorkerRunMetrics,
} from './openaqWorker.js';
import { runWaqiIngestion } from './waqiWorker.js';
import {
  runOpenMeteoCamsIngestion,
  runOpenMeteoWeatherIngestion,
} from './openMeteoWorker.js';

export type IngestionTriggerType =
  | 'SCHEDULER'
  | 'CRON_WEBHOOK'
  | 'MANUAL_ADMIN'
  | 'INITIAL_SEED';

export interface PipelineExecutionReport {
  startedAtUtc: string;
  finishedAtUtc: string;
  totalDurationMs: number;
  triggerType: IngestionTriggerType;
  sources: Array<{
    sourceCode: string;
    jobId: string;
    status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
    metrics?: WorkerRunMetrics;
    errorMessage?: string;
    durationMs: number;
  }>;
  alertsEvaluatedCount: number;
}

async function runSingleSourceJob(
  sourceCode: string,
  triggerType: IngestionTriggerType,
  workerFn: (jobId: string, dataSourceId: string) => Promise<WorkerRunMetrics>
) {
  const srcRes = await dbQuery<{ id: string }>(
    `SELECT id FROM data_sources WHERE code = $1 LIMIT 1`,
    [sourceCode]
  );
  if (srcRes.rows.length === 0) {
    throw new Error(`Data source '${sourceCode}' not found in data_sources`);
  }
  const dataSourceId = srcRes.rows[0].id;

  const jobInsert = await dbQuery<{ id: string }>(
    `
    INSERT INTO ingestion_jobs (data_source_id, trigger_type, status, started_at_utc)
    VALUES ($1::uuid, $2, 'RUNNING', NOW())
    RETURNING id
    `,
    [dataSourceId, triggerType]
  );
  const jobId = jobInsert.rows[0].id;
  const startMs = Date.now();

  try {
    const metrics = await workerFn(jobId, dataSourceId);
    const durationMs = Date.now() - startMs;

    await dbQuery(
      `
      UPDATE ingestion_jobs
      SET
        status = 'SUCCESS',
        records_fetched = $1,
        records_inserted = $2,
        records_flagged_qc = $3,
        duration_ms = $4,
        finished_at_utc = NOW()
      WHERE id = $5::uuid
      `,
      [
        metrics.recordsFetched,
        metrics.recordsInserted,
        metrics.recordsFlaggedQc,
        durationMs,
        jobId,
      ]
    );

    await dbQuery(
      `
      UPDATE data_sources
      SET
        last_success_at = NOW(),
        last_status = 'HEALTHY',
        updated_at_utc = NOW()
      WHERE id = $1::uuid
      `,
      [dataSourceId]
    );

    return {
      sourceCode,
      jobId,
      status: 'SUCCESS' as const,
      metrics,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const errorMessage = err instanceof Error ? err.message : String(err);

    await dbQuery(
      `
      UPDATE ingestion_jobs
      SET
        status = 'FAILED',
        duration_ms = $1,
        error_message = $2,
        finished_at_utc = NOW()
      WHERE id = $3::uuid
      `,
      [durationMs, errorMessage, jobId]
    );

    await dbQuery(
      `
      UPDATE data_sources
      SET
        last_status = 'DEGRADED',
        updated_at_utc = NOW()
      WHERE id = $1::uuid
      `,
      [dataSourceId]
    );

    return {
      sourceCode,
      jobId,
      status: 'FAILED' as const,
      errorMessage,
      durationMs,
    };
  }
}

export async function evaluateAndUpsertAlerts(): Promise<number> {
  const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let upsertedCount = 0;

  // 1. Evaluate active station PM2.5 exceedance (> 37.5 ug/m3)
  const highStationsRes = await dbQuery<{
    station_id: string;
    external_station_id: string;
    station_name: string;
    area_id: string | null;
    area_name_vi: string;
    pm25_ugm3: number;
    value_origin: string;
  }>(`
    SELECT
      ms.id AS station_id,
      ms.external_station_id,
      ms.name AS station_name,
      ms.administrative_area_id AS area_id,
      COALESCE(aa.name_vi, ms.district_name_vi, 'Hà Nội') AS area_name_vi,
      obs.pm25_ugm3,
      obs.value_origin
    FROM monitoring_stations ms
    LEFT JOIN administrative_areas aa ON aa.id = ms.administrative_area_id
    JOIN LATERAL (
      SELECT pm25_ugm3, value_origin
      FROM pm25_observations po
      WHERE po.station_id = ms.id
        AND po.quality_flag = 'VALID'
      ORDER BY po.measured_at_utc DESC
      LIMIT 1
    ) obs ON TRUE
    WHERE ms.is_within_hanoi = TRUE
      AND ms.freshness_status = 'FRESH'
      AND obs.pm25_ugm3 > 37.5
  `);

  for (const row of highStationsRes.rows) {
    const pm25 = Number(row.pm25_ugm3);
    const cls = classifyPm25Level(pm25);
    const vnAqi = calculateVnAqiFromPm25(pm25);
    const dedupKey = `ALERT_PM25_${row.external_station_id}_${dateKey}`;
    const threshold = pm25 > 50 ? 50.0 : 37.5;

    const up = await dbQuery(
      `
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
      VALUES (
        'PM25_CONCENTRATION',
        $1,
        $2::uuid,
        $3::uuid,
        $4,
        'OBSERVED',
        $5,
        $6,
        'µg/m³',
        $7,
        'ACTIVE',
        $8,
        $9,
        NOW()
      )
      ON CONFLICT (deduplication_key) DO UPDATE SET
        trigger_value = EXCLUDED.trigger_value,
        severity = EXCLUDED.severity,
        title_vi = EXCLUDED.title_vi,
        message_vi = EXCLUDED.message_vi
      `,
      [
        cls.severity === 'MODERATE' ? 'UNHEALTHY_SENSITIVE' : cls.severity,
        row.station_id,
        row.area_id,
        row.area_name_vi,
        pm25,
        threshold,
        dedupKey,
        `Cảnh báo PM2.5 cao tại ${row.station_name} (${pm25} µg/m³)`,
        `Trạm ${row.station_name} (${row.area_name_vi}) ghi nhận PM2.5 = ${pm25} µg/m³ (VN_AQI = ${vnAqi}). ${cls.healthAdviceVi}`,
      ]
    );
    upsertedCount += up.rowCount ?? 0;
  }

  return upsertedCount;
}

export async function runFullIngestionPipeline(
  triggerType: IngestionTriggerType = 'MANUAL_ADMIN',
  selectedSources?: string[]
): Promise<PipelineExecutionReport> {
  const startedAtUtc = new Date().toISOString();
  const startTotal = Date.now();
  const allSources = selectedSources ?? [
    'OPENAQ_V3',
    'WAQI_API',
    'OPEN_METEO_CAMS',
    'OPEN_METEO_WEATHER',
  ];

  const results = [];

  if (allSources.includes('OPENAQ_V3')) {
    results.push(
      await runSingleSourceJob('OPENAQ_V3', triggerType, runOpenAqIngestion)
    );
  }
  if (allSources.includes('WAQI_API')) {
    results.push(
      await runSingleSourceJob('WAQI_API', triggerType, runWaqiIngestion)
    );
  }
  if (allSources.includes('OPEN_METEO_CAMS')) {
    results.push(
      await runSingleSourceJob(
        'OPEN_METEO_CAMS',
        triggerType,
        async (_jobId, dsId) => runOpenMeteoCamsIngestion(dsId)
      )
    );
  }
  if (allSources.includes('OPEN_METEO_WEATHER')) {
    results.push(
      await runSingleSourceJob(
        'OPEN_METEO_WEATHER',
        triggerType,
        async (_jobId, dsId) => runOpenMeteoWeatherIngestion(dsId)
      )
    );
  }

  const alertsEvaluatedCount = await evaluateAndUpsertAlerts();

  return {
    startedAtUtc,
    finishedAtUtc: new Date().toISOString(),
    totalDurationMs: Date.now() - startTotal,
    triggerType,
    sources: results,
    alertsEvaluatedCount,
  };
}

