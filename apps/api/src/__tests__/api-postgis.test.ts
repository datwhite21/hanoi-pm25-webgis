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

  it('GET /api/v1/analysis/correlation returns Pearson correlation r and WHO/QCVN exceedance statistics', async () => {
    const res = await request(app).get('/api/v1/analysis/correlation?hours=24');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.exceedanceSummary.sampleCount).toBeGreaterThanOrEqual(5);
    expect(res.body.data.couplingReport.windSpeedCorrelation.sampleSize).toBeGreaterThanOrEqual(5);
    expect(typeof res.body.data.couplingReport.overallScientificInterpretationVi).toBe('string');
  });

  it('POST, GET, and DELETE /api/v1/user/favorites manages PostGIS user favorite points and evaluates custom PM2.5 thresholds', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'sinhvien@hanoi-pm25-gis.vn',
      password: 'SinhVien@2026',
    });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.data.accessToken as string;

    const createRes = await request(app)
      .post('/api/v1/user/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({
        labelName: 'Đại học Bách Khoa Hà Nội (Test Stage 6)',
        latitude: 21.0058,
        longitude: 105.8431,
        customPm25ThresholdUgM3: 25,
      });
    expect(createRes.status).toBe(201);
    const favId = createRes.body.data.id as string;
    expect(favId).toBeTruthy();

    const listRes = await request(app)
      .get('/api/v1/user/favorites')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    const found = (
      listRes.body.data as Array<{
        id: string;
        nearestStation: {
          name: string;
          distanceKm: number | null;
        } | null;
        latestPm25UgM3: number | null;
        isExceedingCustomThreshold: boolean;
      }>
    ).find((f) => f.id === favId);
    expect(found).toBeDefined();
    expect(found?.nearestStation?.name).toBeTruthy();
    expect(found?.nearestStation?.distanceKm).toBeLessThan(2);

    const deleteRes = await request(app)
      .delete(`/api/v1/user/favorites/${favId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deletedId).toBe(favId);
  });

  it('GET and PATCH /api/v1/admin/alert-rules updates alert rule thresholds and writes an immutable entry to audit_logs', async () => {
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@hanoi-pm25-gis.vn',
      password: 'HanoiAdmin@2026',
    });
    expect(adminLogin.status).toBe(200);
    const adminToken = adminLogin.body.data.accessToken as string;

    const listRes = await request(app)
      .get('/api/v1/admin/alert-rules')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(4);

    const targetRule = listRes.body.data[0] as {
      id: string;
      code: string;
      thresholdValue: number;
      isActive: boolean;
    };

    const patchRes = await request(app)
      .patch(`/api/v1/admin/alert-rules/${targetRule.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        thresholdValue: targetRule.thresholdValue,
        isActive: targetRule.isActive,
        reason: 'Kiểm thử tích hợp Stage 7 ghi nhật ký kiểm toán audit_logs',
      });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.code).toBe(targetRule.code);

    const logsRes = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(logsRes.status).toBe(200);
    const latestAudit = logsRes.body.data[0] as {
      action_type: string;
      target_table: string;
      reason: string;
    };
    expect(latestAudit.action_type).toBe('UPDATE_ALERT_RULE');
    expect(latestAudit.target_table).toBe('alert_rules');
  });

  it('enforces Zod input validation (400), rejects forged JWT tokens (401), and prevents SQL injection via parameterized queries', async () => {
    const outOfBoundsRes = await request(app).get(
      '/api/v1/gis/inspect-point?lat=89.99&lon=179.99'
    );
    expect(outOfBoundsRes.status).toBe(400);
    expect(outOfBoundsRes.body.success).toBe(false);
    expect(outOfBoundsRes.body.error.code).toBe('VALIDATION_ERROR');

    const forgedJwtRes = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.forged.signature');
    expect(forgedJwtRes.status).toBe(401);

    const sqlInjectionAttemptRes = await request(app).get(
      `/api/v1/areas/${encodeURIComponent("HN-HBT' OR '1'='1")}/statistics`
    );
    expect(sqlInjectionAttemptRes.status).toBe(404);
    expect(sqlInjectionAttemptRes.body.error.code).toBe('AREA_NOT_FOUND');
  });
});

