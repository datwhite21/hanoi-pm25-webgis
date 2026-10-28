import { describe, expect, it } from 'vitest';
import {
  calculateHaversineDistanceKm,
  calculateNowCastPm25,
  calculateVnAqiFromPm25,
  classifyPm25Level,
  evaluateFreshnessStatus,
  evaluatePm25QualityFlag,
} from '../aqi.js';

describe('@hanoi-pm25/shared — Scientific AQI, NowCast & Quality Control', () => {
  it('classifies PM2.5 concentration accurately against QCVN 05:2023 (50 ug/m3) and WHO (15 ug/m3)', () => {
    const low = classifyPm25Level(12.5);
    expect(low.severity).toBe('GOOD');
    expect(low.exceedsWho2021).toBe(false);
    expect(low.exceedsQcvn05_2023).toBe(false);

    // Verified reading at Nhan Chinh station today (33.60 ug/m3)
    const nhanChinh = classifyPm25Level(33.6);
    expect(nhanChinh.severity).toBe('MODERATE');
    expect(nhanChinh.exceedsWho2021).toBe(true);
    expect(nhanChinh.exceedsQcvn05_2023).toBe(false);

    // Exceeding QCVN 05:2023 (> 50 ug/m3)
    const high = classifyPm25Level(64.2);
    expect(high.severity).toBe('UNHEALTHY_SENSITIVE');
    expect(high.exceedsQcvn05_2023).toBe(true);
  });

  it('calculates VN_AQI from PM2.5 concentration according to Decision 1459/QD-TCMT', () => {
    expect(calculateVnAqiFromPm25(0)).toBe(0);
    expect(calculateVnAqiFromPm25(25)).toBe(50);
    expect(calculateVnAqiFromPm25(50)).toBe(100);
    // 33.6 ug/m3 lies in (25, 50] -> I in [51, 100]
    const aqi336 = calculateVnAqiFromPm25(33.6);
    expect(aqi336).toBeGreaterThanOrEqual(67);
    expect(aqi336).toBeLessThanOrEqual(69);
  });

  it('enforces the 2-of-3 recent hours rule in 12-hour NowCast calculation', () => {
    const insufficient = calculateNowCastPm25([35.0, null, null, 40.0, 42.0]);
    expect(insufficient.valid).toBe(false);
    expect(insufficient.nowCastUgM3).toBeNull();
    expect(insufficient.reason).toBe('INSUFFICIENT_RECENT_HOURS_MINIMUM_2_OF_3');

    const validSeries = calculateNowCastPm25([44.28, 42.0, 39.5, 38.0, 36.0, 35.0]);
    expect(validSeries.valid).toBe(true);
    expect(validSeries.nowCastUgM3).toBeGreaterThan(39);
    expect(validSeries.vnAqi).toBeGreaterThan(75);
  });

  it('classifies station data freshness accurately (FRESH, DELAYED, STALE, UNAVAILABLE)', () => {
    const refNow = new Date('2026-10-28T11:00:00Z'); // 18:00 GMT+7

    // Nhan Chinh station measured at 10:35 UTC (25 mins ago) -> FRESH
    const fresh = evaluateFreshnessStatus('2026-10-28T10:35:00Z', refNow);
    expect(fresh.status).toBe('FRESH');
    expect(fresh.lagMinutes).toBe(25);

    // 46 Luu Quang Vu measured at 01:00 UTC (10 hours ago) -> STALE
    const stale = evaluateFreshnessStatus('2026-10-28T01:00:00Z', refNow);
    expect(stale.status).toBe('STALE');
    expect(stale.lagMinutes).toBe(600);

    // Historical station from 2025 -> UNAVAILABLE
    const unavailable = evaluateFreshnessStatus('2025-06-10T03:00:00Z', refNow);
    expect(unavailable.status).toBe('UNAVAILABLE');
  });

  it('assigns quality flags properly without altering raw values', () => {
    const refNow = new Date('2026-10-28T11:00:00Z');
    expect(evaluatePm25QualityFlag(33.6, '2026-10-28T10:35:00Z', true, refNow)).toBe('VALID');
    expect(evaluatePm25QualityFlag(-3.2, '2026-10-28T10:35:00Z', true, refNow)).toBe('INVALID_NEGATIVE');
    expect(evaluatePm25QualityFlag(1500, '2026-10-28T10:35:00Z', true, refNow)).toBe('INVALID_OUT_OF_RANGE');
    expect(evaluatePm25QualityFlag(45.0, '2026-10-28T10:35:00Z', false, refNow)).toBe('OUTSIDE_STUDY_AREA');
  });

  it('calculates Haversine distance between Hanoi coordinates accurately', () => {
    // Hoan Kiem (21.0285, 105.8542) to Nhan Chinh station (21.0031, 105.7947)
    const distKm = calculateHaversineDistanceKm(21.0285, 105.8542, 21.0031, 105.7947);
    expect(distKm).toBeGreaterThan(6.5);
    expect(distKm).toBeLessThan(7.1);
  });
});
