import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function loadDotEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

function maskConnectionString(connStr) {
  try {
    const u = new URL(connStr);
    return `${u.protocol}//${u.username}:***@${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch {
    return '***masked-connection-string***';
  }
}

async function main() {
  loadDotEnv();
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes('YOUR_DB_PASSWORD')) {
    console.error(
      '[ERROR] DATABASE_URL is missing or still contains placeholder in .env'
    );
    process.exit(1);
  }

  console.log(
    `[PostGIS Migration] Connecting to Supabase PostgreSQL: ${maskConnectionString(connectionString)}`
  );

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    const migrationPath = path.join(
      ROOT_DIR,
      'database',
      'migrations',
      '001_init_postgis_schema.sql'
    );
    const seedPath = path.join(
      ROOT_DIR,
      'database',
      'seeds',
      '001_seed_hanoi_base.sql'
    );

    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log('[PostGIS Migration] Running 001_init_postgis_schema.sql ...');
    await pool.query(migrationSql);
    console.log('[PostGIS Migration] Schema migration completed successfully.');

    console.log('[PostGIS Migration] Running 001_seed_hanoi_base.sql ...');
    await pool.query(seedSql);
    console.log('[PostGIS Migration] Seed data applied successfully.');

    // Verification 1: PostGIS Version
    const versionRes = await pool.query(`
      SELECT PostGIS_Full_Version() AS postgis_version, version() AS pg_version
    `);
    const postgisVersion = versionRes.rows[0]?.postgis_version;
    console.log(`[PostGIS Check] ${postgisVersion}`);

    // Verification 2: Table counts across all 14 tables
    const tables = [
      'data_sources',
      'administrative_areas',
      'monitoring_stations',
      'sensors',
      'ingestion_jobs',
      'pm25_observations',
      'air_quality_model_runs',
      'model_grid_cells',
      'model_pm25_values',
      'weather_data',
      'air_quality_alerts',
      'users',
      'user_favorite_locations',
      'audit_logs',
    ];
    const tableCounts = {};
    for (const tbl of tables) {
      const countRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM ${tbl}`);
      tableCounts[tbl] = countRes.rows[0].cnt;
    }
    console.log('[PostGIS Check] Table Row Counts:', tableCounts);

    // Verification 3: Spatial Point Inspection (ST_Contains, ST_Distance, ST_DWithin)
    const testLat = 21.0058;
    const testLon = 105.8418;
    const spatialPointRes = await pool.query(
      `
      WITH target_pt AS (
        SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326) AS geom
      )
      SELECT
        (
          SELECT json_build_object(
            'code', aa.code,
            'name_vi', aa.name_vi,
            'area_sq_km', aa.area_sq_km
          )
          FROM administrative_areas aa, target_pt
          WHERE aa.admin_level = 2 AND ST_Contains(aa.geom, target_pt.geom)
          LIMIT 1
        ) AS containing_area,
        (
          SELECT json_build_object(
            'cell_code', mgc.cell_code,
            'label_vi', mgc.label_vi,
            'resolution_deg', mgc.resolution_deg
          )
          FROM model_grid_cells mgc, target_pt
          WHERE ST_Contains(mgc.cell_polygon, target_pt.geom)
          LIMIT 1
        ) AS containing_cams_cell,
        (
          SELECT json_agg(nearest)
          FROM (
            SELECT
              ms.external_station_id,
              ms.name,
              ms.freshness_status,
              ROUND((ST_Distance(ms.geom::geography, target_pt.geom::geography) / 1000.0)::numeric, 2) AS distance_km
            FROM monitoring_stations ms, target_pt
            WHERE ST_DWithin(ms.geom::geography, target_pt.geom::geography, 15000)
            ORDER BY ms.geom::geography <-> target_pt.geom::geography
            LIMIT 5
          ) nearest
        ) AS nearest_stations_15km
      `,
      [testLon, testLat]
    );

    const spatialInspectionSample = spatialPointRes.rows[0];
    console.log(
      '[PostGIS Check] Spatial Point Inspection Sample (ST_Contains + ST_DWithin + ST_Distance):',
      JSON.stringify(spatialInspectionSample, null, 2)
    );

    // Verification 4: Spatial Aggregation (ST_Within & ST_Intersects)
    const areaStatsRes = await pool.query(`
      SELECT
        aa.code,
        aa.name_vi,
        COUNT(DISTINCT ms.id)::int AS station_count,
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
      GROUP BY aa.id, aa.code, aa.name_vi
      HAVING COUNT(DISTINCT ms.id) > 0
      ORDER BY avg_observed_pm25_ugm3 DESC NULLS LAST
    `);

    const report = {
      verifiedAtUtc: new Date().toISOString(),
      connectionTarget: maskConnectionString(connectionString),
      postgisVersion,
      tableCounts,
      spatialInspectionSample,
      areaSpatialAggregation: areaStatsRes.rows,
    };

    const outPath = path.join(__dirname, 'postgis-verification-results.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`[PostGIS Check] Saved verification report to ${outPath}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[PostGIS Migration Failed]:', err.message);
  process.exit(1);
});

