import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadDotEnv() {
  const envPath = path.join(rootDir, '.env');
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

loadDotEnv();

const { Pool } = pg;

async function runPostgisBenchmark() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL in .env');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('==================================================================');
    console.log('HANOI PM2.5 WEBGIS — STAGE 8 POSTGIS SPATIAL BENCHMARK (EXPLAIN ANALYZE)');
    console.log('==================================================================');

    const benchmarks = [
      {
        code: 'SPATIAL_QUERY_1_POINT_IN_POLYGON',
        descriptionVi:
          'Kiểm tra điểm (21.0058°N, 105.8418°E - ĐHBK Hà Nội) nằm trong đơn vị hành chính bằng ST_Contains + GIST Index',
        sql: `
          EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
          SELECT id, code, name_vi, area_sq_km
          FROM administrative_areas
          WHERE admin_level = 2
            AND ST_Contains(geom, ST_SetSRID(ST_MakePoint(105.8418, 21.0058), 4326))
          LIMIT 1
        `,
      },
      {
        code: 'SPATIAL_QUERY_2_KNN_NEAREST_STATIONS',
        descriptionVi:
          'Tìm 5 trạm quan trắc gần nhất trong bán kính 15 km bằng ST_DWithin(geography) + toán tử khoảng cách KNN <->',
        sql: `
          EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
          SELECT
            external_station_id,
            name,
            freshness_status,
            ROUND((ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(105.8418, 21.0058), 4326)::geography) / 1000.0)::numeric, 2) AS distance_km
          FROM monitoring_stations
          WHERE is_within_hanoi = TRUE
            AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(105.8418, 21.0058), 4326)::geography, 15000)
          ORDER BY
            CASE WHEN freshness_status = 'FRESH' THEN 0 ELSE 1 END,
            geom::geography <-> ST_SetSRID(ST_MakePoint(105.8418, 21.0058), 4326)::geography
          LIMIT 5
        `,
      },
      {
        code: 'SPATIAL_QUERY_3_STATION_WITHIN_DISTRICT_AGGREGATION',
        descriptionVi:
          'Tổng hợp nồng độ PM2.5 trung bình theo từng quận/huyện Hà Nội bằng ST_Within(ms.geom, aa.geom)',
        sql: `
          EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
          SELECT
            aa.code,
            aa.name_vi,
            COUNT(DISTINCT ms.id)::int AS station_count,
            ROUND(AVG(po.pm25_ugm3)::numeric, 2) AS avg_pm25
          FROM administrative_areas aa
          LEFT JOIN monitoring_stations ms ON ST_Within(ms.geom, aa.geom)
          LEFT JOIN LATERAL (
            SELECT pm25_ugm3
            FROM pm25_observations
            WHERE station_id = ms.id AND quality_flag = 'VALID'
            ORDER BY measured_at_utc DESC
            LIMIT 1
          ) po ON TRUE
          WHERE aa.admin_level = 2
          GROUP BY aa.id
          ORDER BY avg_pm25 DESC NULLS LAST
        `,
      },
      {
        code: 'SPATIAL_QUERY_4_CAMS_GRID_INTERSECTION',
        descriptionVi:
          'Xác định các ô lưới mô hình CAMS 0.4° (~40 km) giao cắt với địa giới hành chính Sóc Sơn bằng ST_Intersects',
        sql: `
          EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
          SELECT
            mgc.cell_code,
            mgc.label_vi,
            mgc.resolution_deg
          FROM model_grid_cells mgc
          JOIN administrative_areas aa ON aa.code = 'HN-SS'
          WHERE ST_Intersects(mgc.cell_polygon, aa.geom)
        `,
      },
    ];

    const results = [];

    for (const b of benchmarks) {
      const t0 = performance.now();
      const res = await pool.query(b.sql);
      const networkRoundTripMs = Number((performance.now() - t0).toFixed(2));
      const explainPlan = res.rows[0]['QUERY PLAN'][0];
      const planningTimeMs = explainPlan['Planning Time'];
      const executionTimeMs = explainPlan['Execution Time'];

      console.log(
        `[PASS] ${b.code}: DB Execution = ${executionTimeMs} ms | Planning = ${planningTimeMs} ms | Round-trip = ${networkRoundTripMs} ms`
      );

      results.push({
        code: b.code,
        descriptionVi: b.descriptionVi,
        planningTimeMs,
        executionTimeMs,
        networkRoundTripMs,
        rootNodeType: explainPlan.Plan['Node Type'],
      });
    }

    // Verify all GIST spatial indexes exist in pg_indexes
    const gistRes = await pool.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexdef ILIKE '%USING gist%'
      ORDER BY tablename, indexname
    `);

    const report = {
      executedAtUtc: new Date().toISOString(),
      spatialGistIndexesCount: gistRes.rows.length,
      spatialGistIndexes: gistRes.rows,
      queryBenchmarks: results,
    };

    const outputPath = path.join(__dirname, 'postgis-benchmark-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`Saved PostGIS benchmark report to ${outputPath}`);
  } finally {
    await pool.end();
  }
}

runPostgisBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
