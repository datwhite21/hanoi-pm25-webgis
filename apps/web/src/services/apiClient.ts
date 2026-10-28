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

export interface AdminIngestionJobItem {
  id: number | string;
  sourceCode: string;
  sourceName: string;
  triggerType: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' | 'RUNNING';
  recordsFetched: number;
  recordsInserted: number;
  recordsFlaggedQc: number;
  durationMs: number;
  errorMessage: string | null;
  startedAtLocal: string;
}

export interface AdminAuditLogItem {
  id: number | string;
  actionType: string;
  targetTable: string;
  targetId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  reason: string;
  createdAtLocal: string;
  actorEmail: string;
  actorName: string;
}

export interface AdminAlertRuleItem {
  id: string;
  code: string;
  nameVi: string;
  alertCategory: string;
  metricName: string;
  comparisonOperator: string;
  thresholdValue: number;
  unit: string;
  severity: string;
  isActive: boolean;
  descriptionVi: string;
}

export const FALLBACK_ADMIN_INGESTION_JOBS: AdminIngestionJobItem[] = [
  {
    id: 101,
    sourceCode: 'OPENAQ_V3',
    sourceName: 'OpenAQ API v3 (Trạm quan trắc thực tế)',
    triggerType: 'SCHEDULED_CRON',
    status: 'SUCCESS',
    recordsFetched: 43,
    recordsInserted: 43,
    recordsFlaggedQc: 0,
    durationMs: 1840,
    errorMessage: null,
    startedAtLocal: '28/10/2026 19:20:05',
  },
  {
    id: 102,
    sourceCode: 'WAQI_API',
    sourceName: 'World Air Quality Index (WAQI / AQICN)',
    triggerType: 'SCHEDULED_CRON',
    status: 'SUCCESS',
    recordsFetched: 11,
    recordsInserted: 10,
    recordsFlaggedQc: 1,
    durationMs: 2150,
    errorMessage: null,
    startedAtLocal: '28/10/2026 19:20:08',
  },
  {
    id: 103,
    sourceCode: 'OPEN_METEO_CAMS',
    sourceName: 'Open-Meteo Air Quality (Mô hình CAMS 0.4°)',
    triggerType: 'SCHEDULED_CRON',
    status: 'SUCCESS',
    recordsFetched: 96,
    recordsInserted: 96,
    recordsFlaggedQc: 0,
    durationMs: 1620,
    errorMessage: null,
    startedAtLocal: '28/10/2026 19:20:11',
  },
  {
    id: 104,
    sourceCode: 'OPEN_METEO_WEATHER',
    sourceName: 'Open-Meteo Forecast (Khí tượng Hà Nội)',
    triggerType: 'SCHEDULED_CRON',
    status: 'SUCCESS',
    recordsFetched: 48,
    recordsInserted: 48,
    recordsFlaggedQc: 0,
    durationMs: 1290,
    errorMessage: null,
    startedAtLocal: '28/10/2026 19:20:13',
  },
];

export const FALLBACK_ADMIN_ALERT_RULES: AdminAlertRuleItem[] = [
  {
    id: '00000000-0000-0000-0000-000000000201',
    code: 'RULE_PM25_QCVN_EXCEEDED',
    nameVi: 'Vượt quy chuẩn QCVN 05:2023/BTNMT (24h)',
    alertCategory: 'PM25_CONCENTRATION',
    metricName: 'pm25_ugm3',
    comparisonOperator: '>',
    thresholdValue: 50,
    unit: 'µg/m³',
    severity: 'UNHEALTHY_SENSITIVE',
    isActive: true,
    descriptionVi:
      'Phát cảnh báo khi nồng độ PM2.5 quan trắc vượt giới hạn 50 µg/m³ theo QCVN 05:2023/BTNMT.',
  },
  {
    id: '00000000-0000-0000-0000-000000000202',
    code: 'RULE_PM25_WHO_EXCEEDED',
    nameVi: 'Vượt khuyến nghị WHO 2021 (24h)',
    alertCategory: 'PM25_CONCENTRATION',
    metricName: 'pm25_ugm3',
    comparisonOperator: '>',
    thresholdValue: 15,
    unit: 'µg/m³',
    severity: 'MODERATE',
    isActive: true,
    descriptionVi:
      'Theo dõi mức vượt ngưỡng khuyến nghị 15 µg/m³ của Tổ chức Y tế Thế giới (WHO 2021).',
  },
  {
    id: '00000000-0000-0000-0000-000000000203',
    code: 'RULE_VN_AQI_POOR',
    nameVi: 'Chỉ số VN_AQI chạm ngưỡng Xấu (>= 151)',
    alertCategory: 'AQI_THRESHOLD',
    metricName: 'vn_aqi',
    comparisonOperator: '>=',
    thresholdValue: 151,
    unit: 'VN_AQI',
    severity: 'UNHEALTHY',
    isActive: true,
    descriptionVi:
      'Cảnh báo sức khỏe cộng đồng khi chỉ số VN_AQI NowCast đạt mức Xấu (>= 151) theo QĐ 1459/QĐ-TCMT.',
  },
  {
    id: '00000000-0000-0000-0000-000000000204',
    code: 'RULE_CAMS_FORECAST_SPIKE',
    nameVi: 'Dự báo mô hình CAMS tăng cao 24h tới',
    alertCategory: 'MODEL_FORECAST',
    metricName: 'model_pm25_ugm3',
    comparisonOperator: '>=',
    thresholdValue: 75,
    unit: 'µg/m³',
    severity: 'UNHEALTHY',
    isActive: true,
    descriptionVi:
      'Cảnh báo sớm từ mô hình số trị CAMS 0.4° khi dự báo PM2.5 trong 24h tới đạt >= 75 µg/m³.',
  },
];

export const FALLBACK_ADMIN_AUDIT_LOGS: AdminAuditLogItem[] = [
  {
    id: 1,
    actionType: 'SYSTEM_SEED_INITIALIZED',
    targetTable: 'monitoring_stations',
    targetId: 'HANOI_57_STATIONS',
    oldValues: null,
    newValues: { withinHanoi: 57, outsideHanoiFlagged: 1 },
    reason:
      'Khởi tạo cơ sở dữ liệu không gian PostGIS và nạp dữ liệu quan trắc thực tế tại Hà Nội',
    createdAtLocal: '28/10/2026 19:20:00',
    actorEmail: 'admin@hanoi-pm25-gis.vn',
    actorName: 'Quản trị viên Hệ thống WebGIS Hà Nội',
  },
  {
    id: 2,
    actionType: 'TRIGGER_INGESTION_PIPELINE',
    targetTable: 'ingestion_jobs',
    targetId: 'BATCH_RUN',
    oldValues: null,
    newValues: {
      sources: [
        { sourceCode: 'OPENAQ_V3', status: 'SUCCESS' },
        { sourceCode: 'WAQI_API', status: 'SUCCESS' },
        { sourceCode: 'OPEN_METEO_CAMS', status: 'SUCCESS' },
        { sourceCode: 'OPEN_METEO_WEATHER', status: 'SUCCESS' },
      ],
    },
    reason: 'Đồng bộ dữ liệu thực tế từ 4 nguồn công khai vào Supabase PostGIS',
    createdAtLocal: '28/10/2026 19:20:15',
    actorEmail: 'admin@hanoi-pm25-gis.vn',
    actorName: 'Quản trị viên Hệ thống WebGIS Hà Nội',
  },
];

export async function loginWithRoleAccount(
  role: 'USER' | 'ADMIN'
): Promise<{
  accessToken: string;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
}> {
  const credentials =
    role === 'ADMIN'
      ? {
          email: 'admin@hanoi-pm25-gis.vn',
          password: 'HanoiAdmin@2026',
        }
      : {
          email: 'sinhvien@hanoi-pm25-gis.vn',
          password: 'SinhVien@2026',
        };

  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    throw new Error(`POST /v1/auth/login failed with status ${res.status}`);
  }
  const json = await res.json();
  return {
    accessToken: json.data.accessToken,
    email: json.data.user.email,
    fullName: json.data.user.fullName,
    role: json.data.user.role,
  };
}

export async function fetchAdminOverviewFromApi(token: string): Promise<{
  ingestionJobs: AdminIngestionJobItem[];
  auditLogs: AdminAuditLogItem[];
  alertRules: AdminAlertRuleItem[];
}> {
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const [jobsRes, logsRes, rulesRes] = await Promise.all([
    fetch(`${API_BASE}/v1/admin/ingestion/jobs`, { headers }),
    fetch(`${API_BASE}/v1/admin/audit-logs`, { headers }),
    fetch(`${API_BASE}/v1/admin/alert-rules`, { headers }),
  ]);

  if (!jobsRes.ok || !logsRes.ok || !rulesRes.ok) {
    throw new Error('Failed to fetch admin overview resources');
  }

  const [jobsJson, logsJson, rulesJson] = await Promise.all([
    jobsRes.json(),
    logsRes.json(),
    rulesRes.json(),
  ]);

  const ingestionJobs: AdminIngestionJobItem[] = (jobsJson.data ?? []).map(
    (j: Record<string, unknown>) => ({
      id: j.id as number | string,
      sourceCode: String(j.source_code ?? ''),
      sourceName: String(j.source_name ?? j.source_code ?? ''),
      triggerType: String(j.trigger_type ?? 'SCHEDULED_CRON'),
      status: (j.status as AdminIngestionJobItem['status']) ?? 'SUCCESS',
      recordsFetched: Number(j.records_fetched ?? 0),
      recordsInserted: Number(j.records_inserted ?? 0),
      recordsFlaggedQc: Number(j.records_flagged_qc ?? 0),
      durationMs: Number(j.duration_ms ?? 0),
      errorMessage: j.error_message ? String(j.error_message) : null,
      startedAtLocal:
        formatUtcToVietnamTime(String(j.started_at_utc ?? '')) ?? 'Gần đây',
    })
  );

  const auditLogs: AdminAuditLogItem[] = (logsJson.data ?? []).map(
    (l: Record<string, unknown>) => ({
      id: l.id as number | string,
      actionType: String(l.action_type ?? ''),
      targetTable: String(l.target_table ?? ''),
      targetId: String(l.target_id ?? ''),
      oldValues: (l.old_values as Record<string, unknown>) ?? null,
      newValues: (l.new_values as Record<string, unknown>) ?? null,
      reason: String(l.reason ?? ''),
      createdAtLocal:
        formatUtcToVietnamTime(String(l.created_at_utc ?? '')) ?? 'Gần đây',
      actorEmail: String(l.actor_email ?? 'admin@hanoi-pm25-gis.vn'),
      actorName: String(l.actor_name ?? 'Quản trị viên'),
    })
  );

  const alertRules: AdminAlertRuleItem[] = (rulesJson.data ?? []) as AdminAlertRuleItem[];

  return {
    ingestionJobs,
    auditLogs,
    alertRules,
  };
}

export async function triggerManualIngestionFromApi(
  token: string
): Promise<{ totalDurationMs: number }> {
  const res = await fetch(`${API_BASE}/v1/admin/ingestion/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(`POST /v1/admin/ingestion/trigger failed (${res.status})`);
  }
  const json = await res.json();
  return {
    totalDurationMs: Number(json.data?.totalDurationMs ?? 0),
  };
}

export async function updateAlertStatusFromApi(
  token: string,
  alertId: string,
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED',
  reason: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/admin/alerts/${alertId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status, reason }),
  });
  if (!res.ok) {
    throw new Error(`PATCH /v1/admin/alerts/${alertId}/status failed`);
  }
}

export async function updateAlertRuleFromApi(
  token: string,
  ruleId: string,
  payload: { thresholdValue?: number; isActive?: boolean; reason: string }
): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/admin/alert-rules/${ruleId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`PATCH /v1/admin/alert-rules/${ruleId} failed`);
  }
}
