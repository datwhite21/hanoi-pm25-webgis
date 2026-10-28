import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFullIngestionPipeline } from './ingestionOrchestrator.js';
import { dbPool, dbQuery } from '../db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../..');

async function main() {
  console.log(
    '[Live Ingestion] Starting full Hanoi PM2.5 real-data ingestion pipeline...'
  );
  const report = await runFullIngestionPipeline('MANUAL_ADMIN');

  for (const src of report.sources) {
    console.log(
      `[Live Ingestion] Source ${src.sourceCode} -> ${src.status} (${src.durationMs} ms)`,
      src.metrics || src.errorMessage
    );
  }

  // Verify database counts after live ingestion
  const summaryRes = await dbQuery<{
    total_stations: number;
    within_hanoi_stations: number;
    outside_hanoi_stations: number;
    fresh_stations: number;
    total_observations: number;
    valid_observations: number;
    flagged_qc_observations: number;
    total_model_values: number;
    total_weather_rows: number;
    active_alerts: number;
  }>(`
    SELECT
      (SELECT COUNT(*)::int FROM monitoring_stations) AS total_stations,
      (SELECT COUNT(*)::int FROM monitoring_stations WHERE is_within_hanoi = TRUE) AS within_hanoi_stations,
      (SELECT COUNT(*)::int FROM monitoring_stations WHERE is_within_hanoi = FALSE) AS outside_hanoi_stations,
      (SELECT COUNT(*)::int FROM monitoring_stations WHERE is_within_hanoi = TRUE AND freshness_status = 'FRESH') AS fresh_stations,
      (SELECT COUNT(*)::int FROM pm25_observations) AS total_observations,
      (SELECT COUNT(*)::int FROM pm25_observations WHERE quality_flag = 'VALID') AS valid_observations,
      (SELECT COUNT(*)::int FROM pm25_observations WHERE quality_flag <> 'VALID') AS flagged_qc_observations,
      (SELECT COUNT(*)::int FROM model_pm25_values) AS total_model_values,
      (SELECT COUNT(*)::int FROM weather_data) AS total_weather_rows,
      (SELECT COUNT(*)::int FROM air_quality_alerts WHERE status = 'ACTIVE') AS active_alerts
  `);

  const dbSummary = summaryRes.rows[0];
  console.log('[Live Ingestion] Post-Ingestion Database Summary:', dbSummary);

  const outPath = path.join(ROOT_DIR, 'scripts', 'live-ingestion-results.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify({ report, dbSummary }, null, 2),
    'utf8'
  );
  console.log(`[Live Ingestion] Saved full report to ${outPath}`);

  await dbPool.end();
}

main().catch(async (err) => {
  console.error('[Live Ingestion Failed]:', err);
  await dbPool.end();
  process.exit(1);
});

