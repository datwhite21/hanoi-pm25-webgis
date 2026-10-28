import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const dbPool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

export async function dbQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return dbPool.query<T>(text, params);
}

export async function checkDbHealth(): Promise<{
  connected: boolean;
  postgisVersion: string | null;
  activeStationsCount: number;
  totalObservationsCount: number;
  latencyMs: number;
}> {
  const start = Date.now();
  const res = await dbQuery<{
    postgis_version: string;
    active_stations: number;
    total_obs: number;
  }>(`
    SELECT
      PostGIS_Lib_Version() AS postgis_version,
      (SELECT COUNT(*)::int FROM monitoring_stations WHERE freshness_status = 'FRESH') AS active_stations,
      (SELECT COUNT(*)::int FROM pm25_observations WHERE quality_flag = 'VALID') AS total_obs
  `);
  const row = res.rows[0];
  return {
    connected: true,
    postgisVersion: row?.postgis_version ?? null,
    activeStationsCount: row?.active_stations ?? 0,
    totalObservationsCount: row?.total_obs ?? 0,
    latencyMs: Date.now() - start,
  };
}

