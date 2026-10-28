import { describe, expect, it } from 'vitest';
import {
  VERIFIED_CAMS_MODEL_GRID_CELLS,
  VERIFIED_HANOI_STATIONS,
  inspectArbitraryHanoiPoint,
} from '../data/verifiedHanoiSnapshot.js';
import { useWebGisStore } from '../store/useWebGisStore.js';

describe('Hanoi WebGIS Snapshot & Spatial Point Inspector', () => {
  it('contains real verified OpenAQ v3 and WAQI stations within Hanoi', () => {
    expect(VERIFIED_HANOI_STATIONS.length).toBeGreaterThanOrEqual(13);
    const freshStations = VERIFIED_HANOI_STATIONS.filter((s) => s.freshnessStatus === 'FRESH');
    expect(freshStations.length).toBeGreaterThanOrEqual(5);

    const nhanChinh = VERIFIED_HANOI_STATIONS.find((s) => s.externalStationId === '4946812');
    expect(nhanChinh).toBeDefined();
    expect(nhanChinh?.latestPm25UgM3).toBe(33.6);
    expect(nhanChinh?.valueOrigin).toBe('DIRECT_CONCENTRATION');

    const unisWaqi = VERIFIED_HANOI_STATIONS.find((s) => s.externalStationId === '8688');
    expect(unisWaqi).toBeDefined();
    expect(unisWaqi?.valueOrigin).toBe('DERIVED_FROM_US_AQI');
  });

  it('inspects an arbitrary suburban point in Soc Son and returns nearest active station + CAMS 40km grid cell with disclaimer', () => {
    // Soc Son coordinate (21.25, 105.85)
    const inspection = inspectArbitraryHanoiPoint(21.25, 105.85);
    expect(inspection.isWithinHanoi).toBe(true);
    expect(inspection.nearestActiveStation).not.toBeNull();
    expect(inspection.nearestActiveStation!.distanceKm).toBeGreaterThan(15);
    expect(inspection.modelGridCell).not.toBeNull();
    expect(inspection.modelGridCell?.resolutionDeg).toBe(0.4);
    expect(inspection.scientificDisclaimerVi).toContain('LƯU Ý KHOA HỌC');
  });

  it('covers Hanoi with 0.4-degree (~40 km) CAMS Global model grid cells', () => {
    expect(VERIFIED_CAMS_MODEL_GRID_CELLS.length).toBe(4);
    for (const cell of VERIFIED_CAMS_MODEL_GRID_CELLS) {
      expect(cell.resolutionDeg).toBe(0.4);
      expect(cell.pm25UgM3).toBeGreaterThan(0);
    }
  });

  it('updates useWebGisStore state when inspecting arbitrary coordinates and administrative areas', async () => {
    const store = useWebGisStore.getState();
    store.inspectMapCoordinate(21.0058, 105.8418);
    const afterInspect = useWebGisStore.getState();
    expect(afterInspect.inspectedPoint).not.toBeNull();
    expect(afterInspect.inspectedPoint?.isWithinHanoi).toBe(true);

    await store.inspectAdministrativeArea('Thanh Xuân');
    const afterArea = useWebGisStore.getState();
    expect(afterArea.selectedAreaStats).not.toBeNull();
    expect(
      afterArea.selectedAreaStats?.modeledBackground.spatialResolutionDeg
    ).toBe(0.4);
  });

  it('manages RBAC roles, alert acknowledgments, rule updates, and audit logs in useWebGisStore', async () => {
    const store = useWebGisStore.getState();
    const initialLogsCount = store.adminAuditLogs.length;

    store.setUserRole('ADMIN');
    expect(useWebGisStore.getState().userRole).toBe('ADMIN');
    expect(useWebGisStore.getState().authUserEmail).toBe(
      'admin@hanoi-pm25-gis.vn'
    );

    const firstRule = useWebGisStore.getState().adminAlertRules[0];
    await useWebGisStore
      .getState()
      .toggleOrUpdateAlertRule(firstRule.id, {
        thresholdValue: 55,
        reason: 'Kiểm thử cập nhật quy tắc Giai đoạn 7',
      });

    const updatedState = useWebGisStore.getState();
    expect(updatedState.adminAlertRules[0].thresholdValue).toBe(55);
    expect(updatedState.adminAuditLogs.length).toBeGreaterThan(initialLogsCount);
    expect(updatedState.adminAuditLogs[0].actionType).toBe('UPDATE_ALERT_RULE');
  });
});

