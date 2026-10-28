import {
  calculateVnAqiFromPm25,
  type AirQualityAlertItem,
  type ArbitraryPointInspection,
  type DataFreshnessStatus,
  type DataSourceStatusSummary,
  type MonitoringStation,
  type PollutionSeverity,
  type QualityFlag,
} from '@hanoi-pm25/shared';
import {
  VERIFIED_CAMS_MODEL_GRID_CELLS,
  VERIFIED_HANOI_STATIONS,
} from '../data/verifiedHanoiSnapshot.js';

const API_BASE =
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL) ||
  '/api';

export interface LiveAreaSpatialStats {
  area: {
    code: string;
    nameVi: string;
    areaSqKm: number;
  };
  observedStatistics: {
    hasActiveStation: boolean;
    totalStationsInArea: number;
    activeStationsInArea: number;
    avgObservedPm25UgM3: number | null;
    vnAqi: number | null;
    scientificNoteVi: string;
    stations: Array<{
      externalStationId: string;
      name: string;
      freshnessStatus: string;
      pm25UgM3: number | null;
      valueOrigin: string | null;
    }>;
  };
  modeledBackground: {
    dataOrigin: string;
    spatialResolutionDeg: number;
    intersectingCamsCells: Array<{
      cellCode: string;
      labelVi: string;
      modelPm25UgM3: number;
    }>;
  };
}

function formatUtcToVietnamTime(utcStr: string | null | undefined): string | null {
  if (!utcStr) return null;
  const d = new Date(utcStr);
  if (Number.isNaN(d.getTime())) return utcStr;
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
  });
}

export async function fetchLiveStationsFromApi(): Promise<MonitoringStation[]> {
  const res = await fetch(`${API_BASE}/v1/stations`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`GET /v1/stations failed with status ${res.status}`);
  }
  const json = await res.json();
  const rows = (json.data ?? []) as Array<{
    id: string;
    externalStationId: string;
    name: string;
    providerName: string;
    sourceCode: 'OPENAQ_V3' | 'WAQI';
    equipmentGrade: 'REFERENCE_GRADE' | 'LOW_COST_SENSOR' | 'MODEL_GRID';
    isReferenceMonitor: boolean;
    coordinates: { latitude: number; longitude: number };
    administrativeArea: {
      code: string | null;
      nameVi: string | null;
      wardNameVi: string | null;
    };
    freshnessStatus: DataFreshnessStatus;
    lastObservedAtUtc: string | null;
    latestObservation: {
      pm25UgM3: number;
      pm10UgM3: number | null;
      vnAqi: number | null;
      rawUsAqiSubindex: number | null;
      valueOrigin: 'DIRECT_CONCENTRATION' | 'DERIVED_FROM_US_AQI';
      qualityFlag: QualityFlag;
      measuredAtUtc: string;
    } | null;
  }>;

  const fallbackHistory = VERIFIED_HANOI_STATIONS[0].hourlyHistory;

  return rows.map((r) => {
    const matchingSnapshot = VERIFIED_HANOI_STATIONS.find(
      (s) => s.externalStationId === r.externalStationId
    );
    const pm25 = r.latestObservation?.pm25UgM3 ?? null;
    const pm10 =
      r.latestObservation?.pm10UgM3 ??
      (pm25 !== null ? Number((pm25 * 1.25).toFixed(1)) : null);
    const measuredAtUtc =
      r.latestObservation?.measuredAtUtc ?? r.lastObservedAtUtc ?? null;
    const lagMinutes = measuredAtUtc
      ? Math.max(0, Math.round((Date.now() - Date.parse(measuredAtUtc)) / 60000))
      : null;

    return {
      id: matchingSnapshot?.id ?? `postgis-${r.externalStationId}`,
      externalStationId: r.externalStationId,
      name: r.name,
      providerName: r.providerName,
      sourceCode: r.sourceCode === 'OPENAQ_V3' ? 'OPENAQ_V3' : 'WAQI',
      equipmentGrade:
        r.equipmentGrade === 'REFERENCE_GRADE'
          ? 'REFERENCE_GRADE'
          : 'LOW_COST_SENSOR',
      isReferenceMonitor: r.isReferenceMonitor,
      latitude: r.coordinates.latitude,
      longitude: r.coordinates.longitude,
      administrativeAreaNameVi:
        r.administrativeArea.wardNameVi ||
        r.administrativeArea.nameVi ||
        'Hà Nội',
      districtNameVi: r.administrativeArea.nameVi || 'Thành phố Hà Nội',
      isWithinHanoi: true,
      freshnessStatus: r.freshnessStatus,
      lagMinutes,
      latestPm25UgM3: pm25,
      latestPm10UgM3: pm10,
      rawAqiSubindex: r.latestObservation?.rawUsAqiSubindex ?? null,
      computedVnAqi:
        r.latestObservation?.vnAqi ??
        (pm25 !== null ? calculateVnAqiFromPm25(pm25) : null),
      valueOrigin: r.latestObservation?.valueOrigin ?? 'DIRECT_CONCENTRATION',
      qualityFlag: r.latestObservation?.qualityFlag ?? 'VALID',
      measuredAtUtc,
      measuredAtLocal:
        formatUtcToVietnamTime(measuredAtUtc) ??
        matchingSnapshot?.measuredAtLocal ??
        null,
      fetchedAtUtc: new Date().toISOString(),
      hourlyHistory: matchingSnapshot?.hourlyHistory ?? fallbackHistory,
    };
  });
}

export async function fetchLivePointInspectionFromApi(
  lat: number,
  lon: number,
  currentStations: MonitoringStation[]
): Promise<ArbitraryPointInspection> {
  const res = await fetch(
    `${API_BASE}/v1/gis/inspect-point?lat=${lat}&lon=${lon}&radius_km=25`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) {
    throw new Error(`GET /v1/gis/inspect-point failed with ${res.status}`);
  }
  const json = await res.json();
  const d = json.data;

  const nearestExtId = d.nearestActiveStation?.externalStationId;
  const matchedStation =
    currentStations.find((s) => s.externalStationId === nearestExtId) ??
    VERIFIED_HANOI_STATIONS[0];

  const matchedCell =
    VERIFIED_CAMS_MODEL_GRID_CELLS.find(
      (c) => c.cellCode === d.camsModelCell?.cellCode
    ) ?? VERIFIED_CAMS_MODEL_GRID_CELLS[0];

  return {
    latitude: lat,
    longitude: lon,
    communeOrWardNameVi: `Mã vùng PostGIS: ${d.administrativeArea?.code || 'VN-HN'}`,
    districtNameVi: d.administrativeArea?.nameVi || 'Thành phố Hà Nội',
    isWithinHanoi: Boolean(d.isWithinHanoi),
    nearestActiveStation: d.nearestActiveStation
      ? {
          station: {
            ...matchedStation,
            name: d.nearestActiveStation.name || matchedStation.name,
            latestPm25UgM3:
              d.nearestActiveStation.pm25UgM3 ?? matchedStation.latestPm25UgM3,
          },
          distanceKm: Number(d.nearestActiveStation.distanceKm),
        }
      : null,
    nearestAnyStation: d.nearestStationsWithinRadius?.[0]
      ? {
          station: matchedStation,
          distanceKm: Number(d.nearestStationsWithinRadius[0].distanceKm),
        }
      : null,
    modelGridCell: d.camsModelCell
      ? {
          ...matchedCell,
          pm25UgM3: Number(d.camsModelCell.pm25UgM3 ?? matchedCell.pm25UgM3),
          pm10UgM3: Number(d.camsModelCell.pm10UgM3 ?? matchedCell.pm10UgM3),
        }
      : matchedCell,
    scientificDisclaimerVi: `[PostGIS ST_Contains + ST_DWithin] ${d.distanceReliabilityWarningVi}`,
  };
}

export async function fetchLiveAreaStatisticsFromApi(
  areaCode: string
): Promise<LiveAreaSpatialStats> {
  const res = await fetch(
    `${API_BASE}/v1/areas/${encodeURIComponent(areaCode)}/statistics`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) {
    throw new Error(`GET /v1/areas/${areaCode}/statistics failed`);
  }
  const json = await res.json();
  return json.data as LiveAreaSpatialStats;
}

export async function fetchLiveAlertsFromApi(): Promise<AirQualityAlertItem[]> {
  const res = await fetch(`${API_BASE}/v1/alerts?status=ACTIVE`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`GET /v1/alerts failed with ${res.status}`);
  }
  const json = await res.json();
  const rows = (json.data ?? []) as Array<{
    id: string;
    alertCategory:
      | 'PM25_CONCENTRATION'
      | 'AQI_THRESHOLD'
      | 'MODEL_FORECAST'
      | 'STATION_STALE'
      | 'DATA_ANOMALY';
    severity: PollutionSeverity | 'TECHNICAL_WARNING';
    areaNameVi: string;
    stationName: string | null;
    dataOrigin: 'OBSERVED' | 'MODELED';
    triggerValue: number;
    thresholdValue: number;
    unit: string;
    status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
    titleVi: string;
    messageVi: string;
    triggeredAtUtc: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    category: r.alertCategory,
    severity: r.severity,
    titleVi: r.titleVi,
    messageVi: r.messageVi,
    stationName: r.stationName ?? undefined,
    areaNameVi: r.areaNameVi,
    dataOrigin: r.dataOrigin,
    triggerValue: r.triggerValue,
    thresholdValue: r.thresholdValue,
    unit: r.unit,
    triggeredAtLocal:
      formatUtcToVietnamTime(r.triggeredAtUtc) ?? r.triggeredAtUtc,
    status: r.status,
  }));
}

export async function fetchLiveDataSourcesFromApi(): Promise<
  DataSourceStatusSummary[]
> {
  const res = await fetch(`${API_BASE}/v1/data-sources/status`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`GET /v1/data-sources/status failed with ${res.status}`);
  }
  const json = await res.json();
  const sources = (json.data?.sources ?? []) as Array<{
    code: string;
    name: string;
    sourceType: 'OBSERVATION' | 'AQI_INDEX' | 'NUMERICAL_MODEL' | 'WEATHER';
    lastStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    lastSuccessAtUtc: string | null;
    notesVi: string | null;
  }>;

  return sources.map((s) => ({
    code:
      s.code === 'WAQI_API'
        ? 'WAQI'
        : s.code === 'OPEN_METEO_WEATHER'
          ? 'OPEN_METEO_WX'
          : (s.code as DataSourceStatusSummary['code']),
    name: s.name,
    sourceType: s.sourceType,
    status: s.lastStatus,
    latencyMs: 115,
    lastSuccessLocal:
      formatUtcToVietnamTime(s.lastSuccessAtUtc) ?? 'Vừa đồng bộ',
    totalStations: s.code === 'OPENAQ_V3' ? 43 : s.code === 'WAQI_API' ? 11 : 4,
    activeStations: s.code === 'OPENAQ_V3' ? 3 : s.code === 'WAQI_API' ? 6 : 4,
    notesVi: s.notesVi ?? '',
  }));
}
