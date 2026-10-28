export type DataFreshnessStatus = 'FRESH' | 'DELAYED' | 'STALE' | 'UNAVAILABLE';

export type QualityFlag =
  | 'VALID'
  | 'HIGH_EXTREME'
  | 'SUSPECT_SPIKE'
  | 'INVALID_NEGATIVE'
  | 'INVALID_OUT_OF_RANGE'
  | 'INVALID_TIMESTAMP'
  | 'OUTSIDE_STUDY_AREA';

export type DataSourceCode =
  | 'OPENAQ_V3'
  | 'WAQI'
  | 'OPEN_METEO_CAMS'
  | 'OPEN_METEO_WX'
  | 'ADMIN_IMPORT';

export type EquipmentGrade =
  | 'REFERENCE_GRADE'
  | 'LOW_COST_SENSOR'
  | 'NUMERICAL_MODEL';

export type ValueOrigin = 'DIRECT_CONCENTRATION' | 'DERIVED_FROM_US_AQI' | 'NUMERICAL_MODEL';

export type PollutionSeverity =
  | 'GOOD'
  | 'MODERATE'
  | 'UNHEALTHY_SENSITIVE'
  | 'UNHEALTHY'
  | 'VERY_UNHEALTHY'
  | 'HAZARDOUS';

export type ActiveMapLayer =
  | 'pm25'
  | 'pm10'
  | 'aqi'
  | 'temperature'
  | 'humidity'
  | 'wind'
  | 'precipitation';

export interface MonitoringStation {
  id: string;
  externalStationId: string;
  name: string;
  providerName: string;
  sourceCode: DataSourceCode;
  equipmentGrade: EquipmentGrade;
  isReferenceMonitor: boolean;
  latitude: number;
  longitude: number;
  administrativeAreaNameVi: string;
  districtNameVi: string;
  isWithinHanoi: boolean;
  freshnessStatus: DataFreshnessStatus;
  lagMinutes: number | null;
  latestPm25UgM3: number | null;
  latestPm10UgM3: number | null;
  rawAqiSubindex: number | null;
  computedVnAqi: number | null;
  valueOrigin: ValueOrigin;
  qualityFlag: QualityFlag;
  measuredAtUtc: string | null;
  measuredAtLocal: string | null;
  fetchedAtUtc: string;
  hourlyHistory: Array<{
    timeLocal: string;
    pm25UgM3: number | null;
    pm10UgM3?: number | null;
    temperatureC?: number | null;
    humidityPct?: number | null;
    windSpeedKmh?: number | null;
  }>;
}

export interface ModelGridCellValue {
  cellCode: string;
  labelVi: string;
  centerLat: number;
  centerLon: number;
  resolutionDeg: number; // 0.4 degrees (~40 km) for CAMS Global
  bounds: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  validAtLocal: string;
  isForecast: boolean;
  pm25UgM3: number;
  pm10UgM3: number;
  usAqi: number;
  europeanAqi: number;
  temperatureC: number;
  humidityPct: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  precipitationMm: number;
  surfacePressureHpa: number;
}

export interface ArbitraryPointInspection {
  latitude: number;
  longitude: number;
  isWithinHanoi: boolean;
  communeOrWardNameVi: string;
  districtNameVi: string;
  nearestActiveStation: {
    station: MonitoringStation;
    distanceKm: number;
  } | null;
  nearestAnyStation: {
    station: MonitoringStation;
    distanceKm: number;
  } | null;
  modelGridCell: ModelGridCellValue | null;
  scientificDisclaimerVi: string;
}

export interface AirQualityAlertItem {
  id: string;
  category:
    | 'PM25_CONCENTRATION'
    | 'AQI_THRESHOLD'
    | 'MODEL_FORECAST'
    | 'STATION_STALE'
    | 'DATA_ANOMALY';
  severity: PollutionSeverity | 'TECHNICAL_WARNING';
  dataOrigin: 'OBSERVED' | 'MODELED';
  stationId?: string;
  stationName?: string;
  areaNameVi: string;
  triggerValue: number;
  thresholdValue: number;
  unit: string;
  titleVi: string;
  messageVi: string;
  triggeredAtLocal: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export interface DataSourceStatusSummary {
  code: DataSourceCode;
  name: string;
  sourceType: 'OBSERVATION' | 'AQI_INDEX' | 'NUMERICAL_MODEL' | 'WEATHER';
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  lastSuccessLocal: string;
  latencyMs: number;
  totalStations: number;
  activeStations: number;
  notesVi: string;
}
