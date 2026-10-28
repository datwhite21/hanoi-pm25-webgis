import { dbQuery } from '../db/pool.js';
import type { WorkerRunMetrics } from './openaqWorker.js';

interface OpenMeteoAirQualityResponse {
  hourly?: {
    time: string[];
    pm2_5: Array<number | null>;
    pm10: Array<number | null>;
    us_aqi: Array<number | null>;
    european_aqi: Array<number | null>;
  };
}

interface OpenMeteoWeatherResponse {
  hourly?: {
    time: string[];
    temperature_2m: Array<number | null>;
    relative_humidity_2m: Array<number | null>;
    wind_speed_10m: Array<number | null>;
    wind_direction_10m: Array<number | null>;
    precipitation: Array<number | null>;
    surface_pressure: Array<number | null>;
  };
}

export async function runOpenMeteoCamsIngestion(
  dataSourceId: string
): Promise<WorkerRunMetrics> {
  const cellsRes = await dbQuery<{
    id: string;
    cell_code: string;
    center_lat: number;
    center_lon: number;
  }>(
    `SELECT id, cell_code, center_lat, center_lon FROM model_grid_cells ORDER BY cell_code`
  );

  const now = new Date();
  const runInitUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
  ).toISOString();

  const runRes = await dbQuery<{ id: string }>(
    `
    INSERT INTO air_quality_model_runs (
      data_source_id,
      model_name,
      spatial_resolution_deg,
      run_initialized_at_utc,
      forecast_horizon_hours
    )
    VALUES ($1::uuid, 'CAMS_GLOBAL_ECMWF', 0.4, $2::timestamptz, 72)
    RETURNING id
    `,
    [dataSourceId, runInitUtc]
  );
  const modelRunId = runRes.rows[0].id;

  let recordsFetched = 0;
  let recordsInserted = 0;

  for (const cell of cellsRes.rows) {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${cell.center_lat}&longitude=${cell.center_lon}&hourly=pm2_5,pm10,us_aqi,european_aqi&past_days=1&forecast_days=2&timezone=UTC`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      throw new Error(
        `Open-Meteo Air Quality API failed with HTTP ${res.status} for cell ${cell.cell_code}`
      );
    }

    const data = (await res.json()) as OpenMeteoAirQualityResponse;
    const times = data.hourly?.time ?? [];
    const pm25Arr = data.hourly?.pm2_5 ?? [];
    const pm10Arr = data.hourly?.pm10 ?? [];
    const usAqiArr = data.hourly?.us_aqi ?? [];
    const euAqiArr = data.hourly?.european_aqi ?? [];

    recordsFetched += times.length;

    const validTimes: string[] = [];
    const isForecasts: boolean[] = [];
    const pm25Vals: number[] = [];
    const pm10Vals: Array<number | null> = [];
    const usAqiVals: Array<number | null> = [];
    const euAqiVals: Array<number | null> = [];

    for (let i = 0; i < times.length; i += 3) {
      const pm25Val = pm25Arr[i];
      if (typeof pm25Val !== 'number' || !Number.isFinite(pm25Val)) continue;

      const validAtUtc = `${times[i]}:00Z`;
      validTimes.push(validAtUtc);
      isForecasts.push(Date.parse(validAtUtc) > now.getTime());
      pm25Vals.push(Number(pm25Val.toFixed(2)));
      pm10Vals.push(typeof pm10Arr[i] === 'number' ? Number(pm10Arr[i]) : null);
      usAqiVals.push(
        typeof usAqiArr[i] === 'number' ? Math.round(Number(usAqiArr[i])) : null
      );
      euAqiVals.push(
        typeof euAqiArr[i] === 'number' ? Math.round(Number(euAqiArr[i])) : null
      );
    }

    if (validTimes.length > 0) {
      const upRes = await dbQuery(
        `
        INSERT INTO model_pm25_values (
          model_run_id,
          grid_cell_id,
          valid_at_utc,
          is_forecast,
          pm25_ugm3,
          pm10_ugm3,
          us_aqi,
          european_aqi
        )
        SELECT
          $1::uuid,
          $2::uuid,
          u.valid_at_utc::timestamptz,
          u.is_forecast,
          u.pm25_ugm3,
          u.pm10_ugm3,
          u.us_aqi,
          u.european_aqi
        FROM UNNEST(
          $3::text[],
          $4::boolean[],
          $5::float8[],
          $6::float8[],
          $7::int4[],
          $8::int4[]
        ) AS u(valid_at_utc, is_forecast, pm25_ugm3, pm10_ugm3, us_aqi, european_aqi)
        ON CONFLICT (model_run_id, grid_cell_id, valid_at_utc) DO UPDATE SET
          pm25_ugm3 = EXCLUDED.pm25_ugm3,
          pm10_ugm3 = EXCLUDED.pm10_ugm3,
          us_aqi = EXCLUDED.us_aqi,
          european_aqi = EXCLUDED.european_aqi
        `,
        [
          modelRunId,
          cell.id,
          validTimes,
          isForecasts,
          pm25Vals,
          pm10Vals,
          usAqiVals,
          euAqiVals,
        ]
      );
      recordsInserted += upRes.rowCount ?? 0;
    }
  }

  return {
    sourceCode: 'OPEN_METEO_CAMS',
    recordsFetched,
    recordsInserted,
    recordsFlaggedQc: 0,
    stationsSynced: cellsRes.rows.length,
    activeStationsCount: cellsRes.rows.length,
  };
}

export async function runOpenMeteoWeatherIngestion(
  dataSourceId: string
): Promise<WorkerRunMetrics> {
  const hanoiLat = 21.0278;
  const hanoiLon = 105.8342;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${hanoiLat}&longitude=${hanoiLon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,surface_pressure&past_days=1&forecast_days=1&timezone=UTC`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Open-Meteo Weather API failed with HTTP ${res.status}`);
  }

  const data = (await res.json()) as OpenMeteoWeatherResponse;
  const times = data.hourly?.time ?? [];
  const tempArr = data.hourly?.temperature_2m ?? [];
  const humArr = data.hourly?.relative_humidity_2m ?? [];
  const windSpdArr = data.hourly?.wind_speed_10m ?? [];
  const windDirArr = data.hourly?.wind_direction_10m ?? [];
  const precipArr = data.hourly?.precipitation ?? [];
  const pressArr = data.hourly?.surface_pressure ?? [];

  const cellRes = await dbQuery<{ id: string }>(
    `SELECT id FROM model_grid_cells WHERE cell_code = 'CAMS_210_1058' LIMIT 1`
  );
  const centerCellId = cellRes.rows[0]?.id ?? null;

  await dbQuery(
    `DELETE FROM weather_data WHERE data_source_id = $1::uuid AND observed_at_utc >= NOW() - INTERVAL '48 hours'`,
    [dataSourceId]
  );

  const now = new Date();
  const observedTimes = times.map((t) => `${t}:00Z`);
  const isForecasts = observedTimes.map((t) => Date.parse(t) > now.getTime());

  let recordsInserted = 0;
  if (observedTimes.length > 0) {
    const ins = await dbQuery(
      `
      INSERT INTO weather_data (
        data_source_id,
        grid_cell_id,
        geom,
        observed_at_utc,
        is_forecast,
        temperature_c,
        relative_humidity_pct,
        wind_speed_kmh,
        wind_direction_deg,
        precipitation_mm,
        surface_pressure_hpa
      )
      SELECT
        $1::uuid,
        $2::uuid,
        ST_SetSRID(ST_MakePoint($3, $4), 4326),
        u.observed_at_utc::timestamptz,
        u.is_forecast,
        u.temp_c,
        u.hum_pct,
        u.wind_spd,
        u.wind_dir,
        u.precip_mm,
        u.press_hpa
      FROM UNNEST(
        $5::text[],
        $6::boolean[],
        $7::float8[],
        $8::float8[],
        $9::float8[],
        $10::float8[],
        $11::float8[],
        $12::float8[]
      ) AS u(observed_at_utc, is_forecast, temp_c, hum_pct, wind_spd, wind_dir, precip_mm, press_hpa)
      `,
      [
        dataSourceId,
        centerCellId,
        hanoiLon,
        hanoiLat,
        observedTimes,
        isForecasts,
        tempArr,
        humArr,
        windSpdArr,
        windDirArr,
        precipArr,
        pressArr,
      ]
    );
    recordsInserted = ins.rowCount ?? 0;
  }

  return {
    sourceCode: 'OPEN_METEO_WEATHER',
    recordsFetched: times.length,
    recordsInserted,
    recordsFlaggedQc: 0,
    stationsSynced: 1,
    activeStationsCount: 1,
  };
}
