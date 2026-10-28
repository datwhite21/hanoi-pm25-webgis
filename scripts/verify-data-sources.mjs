/**
 * Phase 0 — Real-Time Data Source Verification Script for Hanoi PM2.5 WebGIS
 * Automatically loads .env if present in the project root.
 * Run with: node scripts/verify-data-sources.mjs
 */

import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Auto-load .env from project root if available
const envPath = path.resolve('.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key] && val) {
        process.env[key] = val;
      }
    }
  }
}

const HANOI_CENTER = { lat: 21.0285, lon: 105.8542 };
// Bounding box covering entire Hanoi (including Ba Vi, Soc Son, My Duc, Gia Lam)
const HANOI_BBOX = {
  minLon: 105.28,
  minLat: 20.56,
  maxLon: 106.02,
  maxLat: 21.39,
};

async function safeFetch(name, url, options = {}) {
  const startedAt = Date.now();
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Hanoi-PM25-WebGIS-Thesis-Audit/1.0',
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - startedAt;
    const contentType = res.headers.get('content-type') || '';
    let bodyPreview = null;
    let jsonData = null;

    const rawText = await res.text();
    bodyPreview = rawText.slice(0, 500);
    if (contentType.includes('application/json') || rawText.trim().startsWith('{')) {
      try {
        jsonData = JSON.parse(rawText);
      } catch {
        // Not valid JSON
      }
    }

    return {
      name,
      url: url.replace(/token=[^&]+/, 'token=***'),
      reachable: true,
      status: res.status,
      ok: res.ok,
      latencyMs,
      contentType,
      jsonData,
      bodyPreview: jsonData ? undefined : bodyPreview,
    };
  } catch (err) {
    return {
      name,
      url: url.replace(/token=[^&]+/, 'token=***'),
      reachable: false,
      latencyMs: Date.now() - startedAt,
      error: err.message,
      cause: err.cause ? err.cause.message || err.cause.code || String(err.cause) : null,
    };
  }
}

async function main() {
  const report = {
    verifiedAtUtc: new Date().toISOString(),
    verifiedAtVn: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' }),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    sources: {},
  };

  console.log('1. Checking AirHanoi (https://airhanoi.hanoi.gov.vn/)...');
  report.sources.airhanoi = await safeFetch('AirHanoi Official Portal', 'https://airhanoi.hanoi.gov.vn/');

  console.log('2. Checking MoiTruongThuDo (https://moitruongthudo.vn/)...');
  report.sources.moitruongthudo = await safeFetch('MoiTruongThuDo Portal', 'https://moitruongthudo.vn/');

  console.log('3. Checking CEM MONRE EnviInfo (https://enviinfo.cem.gov.vn/)...');
  report.sources.cem_enviinfo = await safeFetch('CEM MONRE EnviInfo', 'https://enviinfo.cem.gov.vn/');

  console.log('4. Checking OpenAQ API v3 (https://api.openaq.org/v3/locations)...');
  const openAqKey = process.env.OPENAQ_API_KEY;
  const openAqHeaders = openAqKey ? { 'X-API-Key': openAqKey } : {};
  const openAqRes = await safeFetch(
    'OpenAQ API v3 (Hanoi Radius 25km, PM2.5 parameter_id=2)',
    `https://api.openaq.org/v3/locations?coordinates=${HANOI_CENTER.lat},${HANOI_CENTER.lon}&radius=25000&parameters_id=2&limit=100`,
    { headers: openAqHeaders }
  );
  report.sources.openaq_v3 = {
    ...openAqRes,
    apiKeyProvided: Boolean(openAqKey),
    stationCountFound: openAqRes.jsonData?.results?.length ?? null,
  };

  console.log('5. Checking WAQI API (https://api.waqi.info)...');
  const waqiToken = process.env.WAQI_API_TOKEN || 'demo';
  const waqiFeedRes = await safeFetch(
    'WAQI Feed Hanoi',
    `https://api.waqi.info/feed/hanoi/?token=${waqiToken}`
  );
  const waqiBoundsRes = await safeFetch(
    'WAQI Map Bounds Hanoi',
    `https://api.waqi.info/v2/map/bounds?latlng=${HANOI_BBOX.minLat},${HANOI_BBOX.minLon},${HANOI_BBOX.maxLat},${HANOI_BBOX.maxLon}&networks=all&token=${waqiToken}`
  );
  report.sources.waqi = {
    tokenUsed: waqiToken === 'demo' ? 'demo (public test token)' : 'custom token from .env',
    feedHanoi: waqiFeedRes,
    boundsHanoi: waqiBoundsRes,
    stationCountInBounds: Array.isArray(waqiBoundsRes.jsonData?.data) ? waqiBoundsRes.jsonData.data.length : null,
  };

  console.log('6. Checking Open-Meteo Air Quality API (Hanoi Center + Multi-point Grid)...');
  const omAqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${HANOI_CENTER.lat},21.25,20.75&longitude=${HANOI_CENTER.lon},105.85,105.65&current=pm2_5,pm10,us_aqi,european_aqi&hourly=pm2_5,pm10,us_aqi&timezone=Asia%2FBangkok&past_days=2&forecast_days=3`;
  const omAqRes = await safeFetch('Open-Meteo Air Quality API', omAqUrl);
  if (omAqRes.jsonData && Array.isArray(omAqRes.jsonData)) {
    report.sources.open_meteo_air_quality = {
      reachable: true,
      status: omAqRes.status,
      latencyMs: omAqRes.latencyMs,
      gridPointsTested: omAqRes.jsonData.map((pt) => ({
        requested: { lat: pt.latitude, lon: pt.longitude },
        elevation: pt.elevation,
        current_units: pt.current_units,
        current: pt.current,
        hourlyTimeSteps: pt.hourly?.time?.length || 0,
        hourlyRange: pt.hourly?.time
          ? { start: pt.hourly.time[0], end: pt.hourly.time[pt.hourly.time.length - 1] }
          : null,
      })),
    };
  } else {
    report.sources.open_meteo_air_quality = omAqRes;
  }

  console.log('7. Checking Open-Meteo Weather Forecast API (Hanoi)...');
  const omWeatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${HANOI_CENTER.lat}&longitude=${HANOI_CENTER.lon}&current=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m&timezone=Asia%2FBangkok&past_days=2&forecast_days=3`;
  const omWeatherRes = await safeFetch('Open-Meteo Weather API', omWeatherUrl);
  if (omWeatherRes.jsonData) {
    report.sources.open_meteo_weather = {
      reachable: true,
      status: omWeatherRes.status,
      latencyMs: omWeatherRes.latencyMs,
      resolvedCoordinates: {
        latitude: omWeatherRes.jsonData.latitude,
        longitude: omWeatherRes.jsonData.longitude,
        elevation: omWeatherRes.jsonData.elevation,
      },
      current_units: omWeatherRes.jsonData.current_units,
      current: omWeatherRes.jsonData.current,
      hourlyTimeSteps: omWeatherRes.jsonData.hourly?.time?.length || 0,
    };
  } else {
    report.sources.open_meteo_weather = omWeatherRes;
  }

  console.log('8. Checking Open-Meteo Geocoding API (Hanoi search)...');
  const omGeoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=Ha+Noi&count=3&language=vi&format=json';
  const omGeoRes = await safeFetch('Open-Meteo Geocoding API', omGeoUrl);
  report.sources.open_meteo_geocoding = {
    reachable: omGeoRes.reachable,
    status: omGeoRes.status,
    latencyMs: omGeoRes.latencyMs,
    topMatch: omGeoRes.jsonData?.results?.[0] || null,
  };

  const outPath = path.resolve('scripts', 'verification-results.json');
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Verification complete! Saved detailed JSON to ${outPath}`);
}

main().catch((err) => {
  console.error('Verification script failed:', err);
  process.exit(1);
});
