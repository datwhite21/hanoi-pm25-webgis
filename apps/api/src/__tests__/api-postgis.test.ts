import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { dbPool } from '../db/pool.js';

const app = createApp();

afterAll(async () => {
  await dbPool.end();
});

describe('Hanoi PM2.5 WebGIS Backend API & Live PostGIS Integration Tests', () => {
  it('GET /api/health returns connected PostGIS status and counts', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.database.connected).toBe(true);
    expect(res.body.data.database.postgisVersion).toBeTruthy();
    expect(res.body.data.database.activeStationsCount).toBeGreaterThanOrEqual(7);
  });

  it('GET /api/v1/stations returns Hanoi stations and distinguishes DIRECT_CONCENTRATION from DERIVED_FROM_US_AQI', async () => {
    const res = await request(app).get('/api/v1/stations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const stations = res.body.data as Array<{
      externalStationId: string;
      freshnessStatus: string;
      latestObservation: {
        pm25UgM3: number;
        valueOrigin: string;
        rawUsAqiSubindex: number | null;
      } | null;
    }>;
    expect(stations.length).toBeGreaterThanOrEqual(10);

    const giaiPhong = stations.find((s) => s.externalStationId === '4946813');
    expect(giaiPhong).toBeDefined();
    expect(giaiPhong?.latestObservation?.valueOrigin).toBe(
      'DIRECT_CONCENTRATION'
    );
    expect(giaiPhong?.latestObservation?.pm25UgM3).toBeGreaterThan(1);
    expect(giaiPhong?.latestObservation?.pm25UgM3).toBeLessThan(500);

    const unisTayHo = stations.find(
      (s) =>
        s.externalStationId === '13026' || s.externalStationId === 'WAQI_8688'
    );
    expect(unisTayHo).toBeDefined();
    expect(unisTayHo?.latestObservation?.valueOrigin).toBe(
      'DERIVED_FROM_US_AQI'
    );
    expect(
      unisTayHo?.latestObservation?.rawUsAqiSubindex
    ).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/stations/:id/observations returns 24h series and calculates NowCast & VN_AQI', async () => {
    const res = await request(app).get(
      '/api/v1/stations/4946813/observations?hours=24'
    );
    expect(res.status).toBe(200);
    expect(res.body.data.summary.observationsCount).toBeGreaterThanOrEqual(12);
    expect(res.body.data.summary.nowCastValid).toBe(true);
    expect(res.body.data.summary.nowCastPm25UgM3).toBeGreaterThan(20);
    expect(res.body.data.summary.nowCastVnAqi).toBeGreaterThan(50);
  });

  it('GET /api/v1/gis/inspect-point executes PostGIS ST_Contains, ST_Distance, and ST_DWithin accurately', async () => {
    const res = await request(app).get(
      '/api/v1/gis/inspect-point?lat=21.0058&lon=105.8418&radius_km=15'
    );
    expect(res.status).toBe(200);
    expect(res.body.data.isWithinHanoi).toBe(true);
    expect(res.body.data.administrativeArea.code).toBe('HN-HBT');
    expect(res.body.data.camsModelCell.cellCode).toBe('CAMS_210_1058');
    expect(res.body.data.nearestActiveStation.externalStationId).toBe(
      '4946813'
    );
    expect(res.body.data.nearestActiveStation.distanceKm).toBeLessThan(0.5);
  });

  it('GET /api/v1/areas/:id/statistics separates observed station data from CAMS 0.4 deg model background without false interpolation', async () => {
    const giaLamRes = await request(app).get('/api/v1/areas/HN-GL/statistics');
    expect(giaLamRes.status).toBe(200);
    expect(giaLamRes.body.data.observedStatistics.hasActiveStation).toBe(true);
    expect(
      giaLamRes.body.data.observedStatistics.avgObservedPm25UgM3
    ).toBeGreaterThan(1);

    const socSonRes = await request(app).get('/api/v1/areas/HN-SS/statistics');
    expect(socSonRes.status).toBe(200);
    expect(socSonRes.body.data.observedStatistics.hasActiveStation).toBe(false);
    expect(socSonRes.body.data.observedStatistics.avgObservedPm25UgM3).toBeNull();
    expect(
      socSonRes.body.data.modeledBackground.intersectingCamsCells.length
    ).toBeGreaterThan(0);
  });

  it('POST /api/v1/auth/login authenticates ADMIN and enforces RBAC on /api/v1/admin/* endpoints', async () => {
    const unauthRes = await request(app).get('/api/v1/admin/audit-logs');
    expect(unauthRes.status).toBe(401);

    const studentLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'sinhvien@hanoi-pm25-gis.vn',
      password: 'SinhVien@2026',
    });
    expect(studentLogin.status).toBe(200);
    const studentToken = studentLogin.body.data.accessToken as string;

    const forbiddenRes = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(forbiddenRes.status).toBe(403);

    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@hanoi-pm25-gis.vn',
      password: 'HanoiAdmin@2026',
    });
    expect(adminLogin.status).toBe(200);
    const adminToken = adminLogin.body.data.accessToken as string;

    const adminRes = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.success).toBe(true);

    const jobsRes = await request(app)
      .get('/api/v1/admin/ingestion/jobs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(jobsRes.status).toBe(200);
    expect(Array.isArray(jobsRes.body.data)).toBe(true);
    expect(jobsRes.body.data.length).toBeGreaterThanOrEqual(4);
  });

  it('GET /api/v1/data-sources/status reports all 4 verified sources as HEALTHY after live ingestion', async () => {
    const res = await request(app).get('/api/v1/data-sources/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const sources = res.body.data.sources as Array<{
      code: string;
      lastStatus: string;
    }>;
    expect(sources.length).toBe(4);
    for (const src of sources) {
      expect(src.lastStatus).toBe('HEALTHY');
    }
  });
});

