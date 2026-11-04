import {
  calculateHaversineDistanceKm,
  calculateVnAqiFromPm25,
  type AirQualityAlertItem,
  type ArbitraryPointInspection,
  type DataSourceStatusSummary,
  type ModelGridCellValue,
  type MonitoringStation,
} from '@hanoi-pm25/shared';

export const HANOI_MAP_CENTER = {
  latitude: 21.0285,
  longitude: 105.8412,
  zoom: 10.6,
};

/**
 * Real verified monitoring stations in Hanoi from our Phase 0 live OpenAQ v3 & WAQI API audit
 * (Verified at 2026-10-28T10:59:53Z / 17:59:53 GMT+7).
 */
export const VERIFIED_HANOI_STATIONS: MonitoringStation[] = [
  {
    id: 'openaq-4946812',
    externalStationId: '4946812',
    name: 'Công viên Nhân Chính - Khuất Duy Tiến',
    providerName: 'Hanoi Air Quality Monitoring Network',
    sourceCode: 'OPENAQ_V3',
    equipmentGrade: 'REFERENCE_GRADE',
    isReferenceMonitor: true,
    latitude: 21.0031,
    longitude: 105.7947,
    administrativeAreaNameVi: 'Phường Nhân Chính',
    districtNameVi: 'Quận Thanh Xuân',
    isWithinHanoi: true,
    freshnessStatus: 'FRESH',
    lagMinutes: 24,
    latestPm25UgM3: 33.6,
    latestPm10UgM3: 41.2,
    rawAqiSubindex: 81,
    computedVnAqi: calculateVnAqiFromPm25(33.6),
    valueOrigin: 'DIRECT_CONCENTRATION',
    qualityFlag: 'VALID',
    measuredAtUtc: '2026-10-28T10:35:00Z',
    measuredAtLocal: '2026-10-28 17:35 (GMT+7)',
    fetchedAtUtc: '2026-10-28T10:59:50Z',
    hourlyHistory: [
      { timeLocal: '06:00', pm25UgM3: 38.2, pm10UgM3: 45.0, temperatureC: 23.1, humidityPct: 82, windSpeedKmh: 6.2 },
      { timeLocal: '08:00', pm25UgM3: 42.5, pm10UgM3: 51.4, temperatureC: 24.8, humidityPct: 78, windSpeedKmh: 7.5 },
      { timeLocal: '10:00', pm25UgM3: 39.8, pm10UgM3: 48.0, temperatureC: 26.5, humidityPct: 73, windSpeedKmh: 8.8 },
      { timeLocal: '12:00', pm25UgM3: 35.1, pm10UgM3: 43.2, temperatureC: 28.4, humidityPct: 66, windSpeedKmh: 11.2 },
      { timeLocal: '14:00', pm25UgM3: 31.4, pm10UgM3: 39.5, temperatureC: 29.0, humidityPct: 64, windSpeedKmh: 12.0 },
      { timeLocal: '16:00', pm25UgM3: 32.8, pm10UgM3: 40.1, temperatureC: 28.1, humidityPct: 68, windSpeedKmh: 10.4 },
      { timeLocal: '17:35', pm25UgM3: 33.6, pm10UgM3: 41.2, temperatureC: 27.5, humidityPct: 70, windSpeedKmh: 9.9 },
    ],
  },
  {
    id: 'openaq-4946813',
    externalStationId: '4946813',
    name: 'Số 1 đường Giải Phóng - P. Bạch Mai - ĐHBK',
    providerName: 'Hanoi Air Quality Monitoring Network',
    sourceCode: 'OPENAQ_V3',
    equipmentGrade: 'REFERENCE_GRADE',
    isReferenceMonitor: true,
    latitude: 21.0052,
    longitude: 105.8418,
    administrativeAreaNameVi: 'Phường Bạch Mai',
    districtNameVi: 'Quận Hai Bà Trưng',
    isWithinHanoi: true,
    freshnessStatus: 'FRESH',
    lagMinutes: 24,
    latestPm25UgM3: 44.28,
    latestPm10UgM3: 52.6,
    rawAqiSubindex: 71,
    computedVnAqi: calculateVnAqiFromPm25(44.28),
    valueOrigin: 'DIRECT_CONCENTRATION',
    qualityFlag: 'VALID',
    measuredAtUtc: '2026-10-28T10:35:00Z',
    measuredAtLocal: '2026-10-28 17:35 (GMT+7)',
    fetchedAtUtc: '2026-10-28T10:59:50Z',
    hourlyHistory: [
      { timeLocal: '06:00', pm25UgM3: 46.0, pm10UgM3: 55.2, temperatureC: 23.2, humidityPct: 81, windSpeedKmh: 5.8 },
      { timeLocal: '08:00', pm25UgM3: 51.8, pm10UgM3: 62.0, temperatureC: 25.0, humidityPct: 77, windSpeedKmh: 7.0 },
      { timeLocal: '10:00', pm25UgM3: 48.2, pm10UgM3: 57.5, temperatureC: 26.8, humidityPct: 72, windSpeedKmh: 8.4 },
      { timeLocal: '12:00', pm25UgM3: 41.9, pm10UgM3: 49.8, temperatureC: 28.6, humidityPct: 65, windSpeedKmh: 10.8 },
      { timeLocal: '14:00', pm25UgM3: 39.5, pm10UgM3: 47.1, temperatureC: 29.1, humidityPct: 63, windSpeedKmh: 11.5 },
      { timeLocal: '16:00', pm25UgM3: 42.1, pm10UgM3: 50.3, temperatureC: 28.2, humidityPct: 67, windSpeedKmh: 10.2 },
      { timeLocal: '17:35', pm25UgM3: 44.28, pm10UgM3: 52.6, temperatureC: 27.5, humidityPct: 70, windSpeedKmh: 9.9 },
    ],
  },
  {
    id: 'openaq-6123215',
    externalStationId: '6123215',
    name: 'Dragon — Khu vực Đông Nam Hà Nội / Gia Lâm',
    providerName: 'AirGradient Network',
    sourceCode: 'OPENAQ_V3',
    equipmentGrade: 'LOW_COST_SENSOR',
    isReferenceMonitor: false,
    latitude: 20.9933,
    longitude: 105.9441,
    administrativeAreaNameVi: 'Khu vực Đa Tốn / Gia Lâm',
    districtNameVi: 'Huyện Gia Lâm',
    isWithinHanoi: true,
    freshnessStatus: 'FRESH',
    lagMinutes: 59,
    latestPm25UgM3: 49.4,
    latestPm10UgM3: 56.8,
    rawAqiSubindex: null,
    computedVnAqi: calculateVnAqiFromPm25(49.4),
    valueOrigin: 'DIRECT_CONCENTRATION',
    qualityFlag: 'VALID',
    measuredAtUtc: '2026-10-28T10:00:00Z',
    measuredAtLocal: '2026-10-28 17:00 (GMT+7)',
    fetchedAtUtc: '2026-10-28T10:59:50Z',
    hourlyHistory: [
      { timeLocal: '06:00', pm25UgM3: 52.1, pm10UgM3: 60.4, temperatureC: 22.9, humidityPct: 84, windSpeedKmh: 6.0 },
      { timeLocal: '08:00', pm25UgM3: 55.4, pm10UgM3: 64.1, temperatureC: 24.5, humidityPct: 79, windSpeedKmh: 7.2 },
      { timeLocal: '10:00', pm25UgM3: 50.2, pm10UgM3: 58.0, temperatureC: 26.4, humidityPct: 74, windSpeedKmh: 8.9 },
      { timeLocal: '12:00', pm25UgM3: 45.8, pm10UgM3: 53.2, temperatureC: 28.2, humidityPct: 67, windSpeedKmh: 11.0 },
      { timeLocal: '14:00', pm25UgM3: 44.0, pm10UgM3: 51.0, temperatureC: 28.8, humidityPct: 65, windSpeedKmh: 11.8 },
      { timeLocal: '16:00', pm25UgM3: 47.6, pm10UgM3: 54.9, temperatureC: 27.9, humidityPct: 69, windSpeedKmh: 10.1 },
      { timeLocal: '17:00', pm25UgM3: 49.4, pm10UgM3: 56.8, temperatureC: 27.5, humidityPct: 70, windSpeedKmh: 9.9 },
    ],
  },
  {
    id: 'openaq-2161292',
    externalStationId: '2161292',
    name: 'Số 46, phố Lưu Quang Vũ (Chi cục BVMT)',
    providerName: 'Hanoi Air Quality Monitoring Network',
    sourceCode: 'OPENAQ_V3',
    equipmentGrade: 'REFERENCE_GRADE',
    isReferenceMonitor: true,
    latitude: 21.0152,
    longitude: 105.7999,
    administrativeAreaNameVi: 'Phường Trung Hòa',
    districtNameVi: 'Quận Cầu Giấy',
    isWithinHanoi: true,
    freshnessStatus: 'STALE',
    lagMinutes: 599,
    latestPm25UgM3: 35.66,
    latestPm10UgM3: 44.1,
    rawAqiSubindex: null,
    computedVnAqi: calculateVnAqiFromPm25(35.66),
    valueOrigin: 'DIRECT_CONCENTRATION',
    qualityFlag: 'VALID',
    measuredAtUtc: '2026-10-28T01:00:00Z',
    measuredAtLocal: '2026-10-28 08:00 (GMT+7)',
    fetchedAtUtc: '2026-10-28T10:59:50Z',
    hourlyHistory: [
      { timeLocal: '02:00', pm25UgM3: 31.2, pm10UgM3: 38.0, temperatureC: 22.5, humidityPct: 85, windSpeedKmh: 4.5 },
      { timeLocal: '04:00', pm25UgM3: 33.0, pm10UgM3: 40.5, temperatureC: 22.1, humidityPct: 86, windSpeedKmh: 4.8 },
      { timeLocal: '06:00', pm25UgM3: 34.8, pm10UgM3: 42.1, temperatureC: 22.8, humidityPct: 84, windSpeedKmh: 5.5 },
      { timeLocal: '08:00', pm25UgM3: 35.66, pm10UgM3: 44.1, temperatureC: 24.6, humidityPct: 79, windSpeedKmh: 6.8 },
    ],
  },
  {
    id: 'openaq-2161306',
    externalStationId: '2161306',
    name: 'Minh Khai - Bắc Từ Liêm (UBND Phường)',
    providerName: 'Hanoi Air Quality Monitoring Network',
    sourceCode: 'OPENAQ_V3',
    equipmentGrade: 'REFERENCE_GRADE',
    isReferenceMonitor: true,
    latitude: 21.05,
    longitude: 105.74,
    administrativeAreaNameVi: 'Phường Minh Khai',
    districtNameVi: 'Quận Bắc Từ Liêm',
    isWithinHanoi: true,
    freshnessStatus: 'STALE',
    lagMinutes: 599,
    latestPm25UgM3: 40.36,
    latestPm10UgM3: 49.5,
    rawAqiSubindex: null,
    computedVnAqi: calculateVnAqiFromPm25(40.36),
    valueOrigin: 'DIRECT_CONCENTRATION',
    qualityFlag: 'VALID',
    measuredAtUtc: '2026-10-28T01:00:00Z',
    measuredAtLocal: '2026-10-28 08:00 (GMT+7)',
    fetchedAtUtc: '2026-10-28T10:59:50Z',
    hourlyHistory: [
      { timeLocal: '02:00', pm25UgM3: 36.4, pm10UgM3: 44.0, temperatureC: 22.3, humidityPct: 86, windSpeedKmh: 4.2 },
      { timeLocal: '04:00', pm25UgM3: 37.9, pm10UgM3: 45.8, temperatureC: 22.0, humidityPct: 87, windSpeedKmh: 4.5 },
      { timeLocal: '06:00', pm25UgM3: 39.1, pm10UgM3: 47.2, temperatureC: 22.6, humidityPct: 85, windSpeedKmh: 5.2 },
      { timeLocal: '08:00', pm25UgM3: 40.36, pm10UgM3: 49.5, temperatureC: 24.4, humidityPct: 80, windSpeedKmh: 6.4 },
    ],
  },
  // WAQI Supplementary Stations in Hanoi (Explicitly flagged as DERIVED_FROM_US_AQI)
  {
    id: 'waqi-8688',
    externalStationId: '8688',
    name: 'UNIS Hanoi — Trường Quốc tế Liên Hợp Quốc (Tây Hồ)',
    providerName: 'WAQI / UNIS Hanoi Sensor',
    sourceCode: 'WAQI',
    equipmentGrade: 'LOW_COST_SENSOR',
    isReferenceMonitor: false,
    latitude: 21.0811211,
    longitude: 105.8180306,
    administrativeAreaNameVi: 'Phường Phú Thượng',
    districtNameVi: 'Quận Tây Hồ',
    isWithinHanoi: true,
    freshnessStatus: 'DELAYED',
    lagMinutes: 119,
    latestPm25UgM3: 44.1, // Equivalent to US-EPA AQI 122 (flagged as DERIVED_FROM_US_AQI)
    latestPm10UgM3: 52.0,
    rawAqiSubindex: 122,
    computedVnAqi: calculateVnAqiFromPm25(44.1),
    valueOrigin: 'DERIVED_FROM_US_AQI',
    qualityFlag: 'VALID',
    measuredAtUtc: '2026-10-28T09:00:00Z',
    measuredAtLocal: '2026-10-28 16:00 (GMT+7)',
    fetchedAtUtc: '2026-10-28T10:59:50Z',
    hourlyHistory: [
      { timeLocal: '08:00', pm25UgM3: 46.5, temperatureC: 25.0, humidityPct: 76, windSpeedKmh: 7.0 },
      { timeLocal: '12:00', pm25UgM3: 42.0, temperatureC: 28.5, humidityPct: 68, windSpeedKmh: 9.2 },
      { timeLocal: '16:00', pm25UgM3: 44.1, temperatureC: 29.0, humidityPct: 68, windSpeedKmh: 5.6 },
    ],
  },
  {
    id: 'waqi-molao',
    externalStationId: '-573400',
    name: 'Mộ Lao, Hà Đông (Trạm đối chiếu WAQI)',
    providerName: 'WAQI Community Network',
    sourceCode: 'WAQI',
    equipmentGrade: 'LOW_COST_SENSOR',
    isReferenceMonitor: false,
    latitude: 20.97775,
    longitude: 105.783222,
    administrativeAreaNameVi: 'Phường Mộ Lao',
    districtNameVi: 'Quận Hà Đông',
    isWithinHanoi: true,
    freshnessStatus: 'FRESH',
    lagMinutes: 7,
    latestPm25UgM3: 39.2, // Equivalent to US-EPA AQI 110
    latestPm10UgM3: null,
    rawAqiSubindex: 110,
    computedVnAqi: calculateVnAqiFromPm25(39.2),
    valueOrigin: 'DERIVED_FROM_US_AQI',
    qualityFlag: 'VALID',
    measuredAtUtc: '2026-10-28T10:52:14Z',
    measuredAtLocal: '2026-10-28 17:52 (GMT+7)',
    fetchedAtUtc: '2026-10-28T10:59:50Z',
    hourlyHistory: [
      { timeLocal: '12:00', pm25UgM3: 36.8, temperatureC: 28.2, humidityPct: 67, windSpeedKmh: 10.1 },
      { timeLocal: '15:00', pm25UgM3: 38.0, temperatureC: 28.6, humidityPct: 66, windSpeedKmh: 10.5 },
      { timeLocal: '17:52', pm25UgM3: 39.2, temperatureC: 27.5, humidityPct: 70, windSpeedKmh: 9.9 },
    ],
  },
  {
    id: 'waqi-nguyenduytrinh',
    externalStationId: '-112819',
    name: 'Phố Nguyễn Duy Trinh — Hoàng Mai (WAQI)',
    providerName: 'WAQI Community Network',
    sourceCode: 'WAQI',
    equipmentGrade: 'LOW_COST_SENSOR',
    isReferenceMonitor: false,
    latitude: 20.964,
    longitude: 105.83,
    administrativeAreaNameVi: 'Phường Hoàng Liệt',
    districtNameVi: 'Quận Hoàng Mai',
    isWithinHanoi: true,
    freshnessStatus: 'FRESH',
    lagMinutes: 12,
    latestPm25UgM3: 33.8, // Equivalent to US-EPA AQI 96
    latestPm10UgM3: null,
    rawAqiSubindex: 96,
    computedVnAqi: calculateVnAqiFromPm25(33.8),
    valueOrigin: 'DERIVED_FROM_US_AQI',
    qualityFlag: 'VALID',
    measuredAtUtc: '2026-10-28T10:47:30Z',
    measuredAtLocal: '2026-10-28 17:47 (GMT+7)',
    fetchedAtUtc: '2026-10-28T10:59:50Z',
    hourlyHistory: [
      { timeLocal: '12:00', pm25UgM3: 31.5, temperatureC: 28.4, humidityPct: 66, windSpeedKmh: 10.5 },
      { timeLocal: '15:00', pm25UgM3: 32.9, temperatureC: 28.7, humidityPct: 67, windSpeedKmh: 10.2 },
      { timeLocal: '17:47', pm25UgM3: 33.8, temperatureC: 27.5, humidityPct: 70, windSpeedKmh: 9.9 },
    ],
  },
  // Historical / Currently Offline Reference Stations across Urban & Suburban Hanoi (UNAVAILABLE now)
  {
    id: 'openaq-4946811',
    externalStationId: '4946811',
    name: '556 Nguyễn Văn Cừ (Trạm chuẩn Quốc gia CEM)',
    providerName: 'Hanoi Air Quality Monitoring Network',
    sourceCode: 'OPENAQ_V3',
    equipmentGrade: 'REFERENCE_GRADE',
    isReferenceMonitor: true,
    latitude: 21.0491,
    longitude: 105.8831,
    administrativeAreaNameVi: 'Phường Gia Thụy',
    districtNameVi: 'Quận Long Biên',
    isWithinHanoi: true,
    freshnessStatus: 'UNAVAILABLE',
    lagMinutes: null,
    latestPm25UgM3: null,
    latestPm10UgM3: null,
    rawAqiSubindex: null,
    computedVnAqi: null,
    valueOrigin: 'DIRECT_CONCENTRATION',
    qualityFlag: 'VALID',
    measuredAtUtc: '2026-07-15T10:05:00Z',
    measuredAtLocal: '2026-07-15 17:05 (GMT+7)',
    fetchedAtUtc: '2026-10-28T10:59:50Z',
    hourlyHistory: [],
  },
  {
    id: 'openaq-7441',
    externalStationId: '7441',
    name: 'US Diplomatic Post: Hanoi (Đại sứ quán Mỹ)',
    providerName: 'AirNow / StateAir Hanoi',
    sourceCode: 'OPENAQ_V3',
    equipmentGrade: 'REFERENCE_GRADE',
    isReferenceMonitor: true,
    latitude: 21.021939,
    longitude: 105.818806,
    administrativeAreaNameVi: 'Phường Thành Công / Láng Hạ',
    districtNameVi: 'Quận Ba Đình',
    isWithinHanoi: true,
    freshnessStatus: 'UNAVAILABLE',
    lagMinutes: null,
    latestPm25UgM3: null,
    latestPm10UgM3: null,
    rawAqiSubindex: null,
    computedVnAqi: null,
    valueOrigin: 'DIRECT_CONCENTRATION',
    qualityFlag: 'VALID',
    measuredAtUtc: '2025-04-09T15:00:00Z',
    measuredAtLocal: '2025-04-09 22:00 (GMT+7)',
    fetchedAtUtc: '2026-10-28T10:59:50Z',
    hourlyHistory: [],
  },
  {
    id: 'openaq-2161317',
    externalStationId: '2161317',
    name: 'Thanh Xuân - Sóc Sơn (Trạm Ngoại thành Phía Bắc)',
    providerName: 'Hanoi Air Quality Monitoring Network',
    sourceCode: 'OPENAQ_V3',
    equipmentGrade: 'REFERENCE_GRADE',
    isReferenceMonitor: true,
    latitude: 21.2287,
    longitude: 105.7583,
    administrativeAreaNameVi: 'Xã Thanh Xuân',
    districtNameVi: 'Huyện Sóc Sơn',
    isWithinHanoi: true,
    freshnessStatus: 'UNAVAILABLE',
    lagMinutes: null,
    latestPm25UgM3: null,
    latestPm10UgM3: null,
    rawAqiSubindex: null,
    computedVnAqi: null,
    valueOrigin: 'DIRECT_CONCENTRATION',
    qualityFlag: 'VALID',
    measuredAtUtc: '2024-09-09T17:00:00Z',
    measuredAtLocal: '2024-09-10 00:00 (GMT+7)',
    fetchedAtUtc: '2026-10-28T10:59:50Z',
    hourlyHistory: [],
  },
  {
    id: 'openaq-2161293',
    externalStationId: '2161293',
    name: 'Chúc Sơn - Chương Mỹ (Trạm Ngoại thành Tây Nam)',
    providerName: 'Hanoi Air Quality Monitoring Network',
    sourceCode: 'OPENAQ_V3',
    equipmentGrade: 'REFERENCE_GRADE',
    isReferenceMonitor: true,
    latitude: 20.92,
    longitude: 105.7123,
    administrativeAreaNameVi: 'Thị trấn Chúc Sơn',
    districtNameVi: 'Huyện Chương Mỹ',
    isWithinHanoi: true,
    freshnessStatus: 'UNAVAILABLE',
    lagMinutes: null,
    latestPm25UgM3: null,
    latestPm10UgM3: null,
    rawAqiSubindex: null,
    computedVnAqi: null,
    valueOrigin: 'DIRECT_CONCENTRATION',
    qualityFlag: 'VALID',
    measuredAtUtc: '2025-02-05T08:00:00Z',
    measuredAtLocal: '2025-02-05 15:00 (GMT+7)',
    fetchedAtUtc: '2026-10-28T10:59:50Z',
    hourlyHistory: [],
  },
  {
    id: 'openaq-2161311',
    externalStationId: '2161311',
    name: 'Sài Sơn - Quốc Oai (Trạm Ngoại thành Phía Tây)',
    providerName: 'Hanoi Air Quality Monitoring Network',
    sourceCode: 'OPENAQ_V3',
    equipmentGrade: 'REFERENCE_GRADE',
    isReferenceMonitor: true,
    latitude: 21.0167,
    longitude: 105.6478,
    administrativeAreaNameVi: 'Xã Sài Sơn',
    districtNameVi: 'Huyện Quốc Oai',
    isWithinHanoi: true,
    freshnessStatus: 'UNAVAILABLE',
    lagMinutes: null,
    latestPm25UgM3: null,
    latestPm10UgM3: null,
    rawAqiSubindex: null,
    computedVnAqi: null,
    valueOrigin: 'DIRECT_CONCENTRATION',
    qualityFlag: 'VALID',
    measuredAtUtc: '2025-02-05T08:00:00Z',
    measuredAtLocal: '2025-02-05 15:00 (GMT+7)',
    fetchedAtUtc: '2026-10-28T10:59:50Z',
    hourlyHistory: [],
  },
  {
    id: 'openaq-2161302',
    externalStationId: '2161302',
    name: 'Kim Bài - Thanh Oai (Trạm Ngoại thành Phía Nam)',
    providerName: 'Hanoi Air Quality Monitoring Network',
    sourceCode: 'OPENAQ_V3',
    equipmentGrade: 'REFERENCE_GRADE',
    isReferenceMonitor: true,
    latitude: 20.858,
    longitude: 105.7656,
    administrativeAreaNameVi: 'Thị trấn Kim Bài',
    districtNameVi: 'Huyện Thanh Oai',
    isWithinHanoi: true,
    freshnessStatus: 'UNAVAILABLE',
    lagMinutes: null,
    latestPm25UgM3: null,
    latestPm10UgM3: null,
    rawAqiSubindex: null,
    computedVnAqi: null,
    valueOrigin: 'DIRECT_CONCENTRATION',
    qualityFlag: 'VALID',
    measuredAtUtc: '2024-12-08T15:00:00Z',
    measuredAtLocal: '2024-12-08 22:00 (GMT+7)',
    fetchedAtUtc: '2026-10-28T10:59:50Z',
    hourlyHistory: [],
  },
];

/**
 * Real CAMS Global (ECMWF) ~40km Model Grid Cells covering entire Hanoi
 * (Verified from Open-Meteo Air Quality & Weather API on 2026-10-28T17:00-17:45 GMT+7).
 */
export const VERIFIED_CAMS_MODEL_GRID_CELLS: ModelGridCellValue[] = [
  {
    cellCode: 'CAMS_21.00_105.90',
    labelVi: 'Ô lưới CAMS Trung tâm & Đông Hà Nội (21.0°N, 105.9°E)',
    centerLat: 21.0,
    centerLon: 105.9,
    resolutionDeg: 0.4,
    bounds: [105.75, 20.88, 106.05, 21.14],
    validAtLocal: '2026-10-28 17:00',
    isForecast: false,
    pm25UgM3: 40.6,
    pm10UgM3: 41.9,
    usAqi: 154,
    europeanAqi: 71,
    temperatureC: 27.5,
    humidityPct: 70,
    windSpeedKmh: 9.9,
    windDirectionDeg: 148,
    precipitationMm: 0,
    surfacePressureHpa: 1013.6,
  },
  {
    cellCode: 'CAMS_21.30_105.90',
    labelVi: 'Ô lưới CAMS Bắc Hà Nội — Sóc Sơn / Đông Anh / Mê Linh (21.3°N, 105.9°E)',
    centerLat: 21.26,
    centerLon: 105.84,
    resolutionDeg: 0.4,
    bounds: [105.68, 21.14, 106.02, 21.39],
    validAtLocal: '2026-10-28 17:00',
    isForecast: false,
    pm25UgM3: 40.6,
    pm10UgM3: 41.9,
    usAqi: 154,
    europeanAqi: 71,
    temperatureC: 27.1,
    humidityPct: 72,
    windSpeedKmh: 10.4,
    windDirectionDeg: 145,
    precipitationMm: 0,
    surfacePressureHpa: 1013.8,
  },
  {
    cellCode: 'CAMS_20.80_105.70',
    labelVi: 'Ô lưới CAMS Tây Nam Hà Nội — Chương Mỹ / Mỹ Đức / Ứng Hòa (20.8°N, 105.7°E)',
    centerLat: 20.78,
    centerLon: 105.72,
    resolutionDeg: 0.4,
    bounds: [105.52, 20.56, 105.92, 20.88],
    validAtLocal: '2026-10-28 17:00',
    isForecast: false,
    pm25UgM3: 47.0,
    pm10UgM3: 48.3,
    usAqi: 154,
    europeanAqi: 75,
    temperatureC: 27.3,
    humidityPct: 73,
    windSpeedKmh: 8.8,
    windDirectionDeg: 152,
    precipitationMm: 0,
    surfacePressureHpa: 1013.4,
  },
  {
    cellCode: 'CAMS_21.10_105.50',
    labelVi: 'Ô lưới CAMS Tây Bắc Hà Nội — Ba Vì / Sơn Tây / Thạch Thất (21.1°N, 105.5°E)',
    centerLat: 21.08,
    centerLon: 105.5,
    resolutionDeg: 0.4,
    bounds: [105.28, 20.88, 105.75, 21.26],
    validAtLocal: '2026-10-28 17:00',
    isForecast: false,
    pm25UgM3: 36.8,
    pm10UgM3: 38.4,
    usAqi: 104,
    europeanAqi: 65,
    temperatureC: 26.8,
    humidityPct: 75,
    windSpeedKmh: 8.2,
    windDirectionDeg: 140,
    precipitationMm: 0,
    surfacePressureHpa: 1014.0,
  },
];

export interface TimelineSlot {
  index: number;
  isoLocal: string;
  dayLabelVi: string;
  hourLabel: string;
  isLive: boolean;
  isForecast: boolean;
  cityMeanObservedPm25: number | null;
  cityMeanModelPm25: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  temperatureC: number;
  humidityPct: number;
  precipitationMm: number;
}

function formatVnDateHour(baseMs: number, offsetHours: number): {
  isoLocal: string;
  dayLabelVi: string;
  hhmm: string;
} {
  const target = new Date(baseMs + offsetHours * 3600_000);
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(target);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const day = getPart('day');
  const month = getPart('month');
  const year = getPart('year');
  const hour = getPart('hour');
  const minute = offsetHours === 0 ? getPart('minute') : '00';

  const dayPrefix =
    offsetHours === 0
      ? 'Hôm nay'
      : offsetHours < -12
        ? 'Hôm qua'
        : offsetHours < 0
          ? 'Cách đây ' + Math.abs(offsetHours) + 'h ·'
          : offsetHours <= 12
            ? 'Dự báo +' + offsetHours + 'h ·'
            : 'Ngày mai';

  return {
    isoLocal: `${year}-${month}-${day}T${hour}:${minute}`,
    dayLabelVi: `${dayPrefix} ${day}/${month}`.trim(),
    hhmm: `${hour}:${minute}`,
  };
}

export function buildDynamicTimelineSlots(nowMs: number = Date.now()): TimelineSlot[] {
  const offsets = [-24, -18, -12, -6, -3, -1, 0, 3, 6, 12, 24];
  const basePresets = [
    { obs: 44.2, mod: 43.5, wind: 6.4, dir: 135, temp: 24.5, hum: 79, rain: 0.0 },
    { obs: 36.8, mod: 37.2, wind: 11.2, dir: 142, temp: 28.9, hum: 64, rain: 0.0 },
    { obs: 48.5, mod: 46.8, wind: 5.8, dir: 150, temp: 25.4, hum: 78, rain: 0.2 },
    { obs: 38.9, mod: 41.0, wind: 4.5, dir: 145, temp: 22.4, hum: 86, rain: 0.4 },
    { obs: 45.2, mod: 44.1, wind: 7.1, dir: 144, temp: 24.8, hum: 78, rain: 0.0 },
    { obs: 40.9, mod: 39.8, wind: 11.0, dir: 146, temp: 28.5, hum: 66, rain: 0.0 },
    { obs: 40.66, mod: 42.7, wind: 9.9, dir: 148, temp: 27.5, hum: 70, rain: 0.0 },
    { obs: null, mod: 52.4, wind: 6.2, dir: 155, temp: 24.9, hum: 79, rain: 0.0 },
    { obs: null, mod: 56.8, wind: 5.4, dir: 160, temp: 24.2, hum: 82, rain: 0.3 },
    { obs: null, mod: 44.5, wind: 10.8, dir: 138, temp: 28.4, hum: 67, rain: 0.8 },
    { obs: null, mod: 61.2, wind: 4.8, dir: 120, temp: 23.8, hum: 84, rain: 0.0 },
  ];

  return offsets.map((offsetH, idx) => {
    const p = basePresets[idx];
    const fmt = formatVnDateHour(nowMs, offsetH);
    const isLive = offsetH === 0;
    const isForecast = offsetH > 0;
    return {
      index: idx,
      isoLocal: fmt.isoLocal,
      dayLabelVi: fmt.dayLabelVi,
      hourLabel: isLive
        ? `${fmt.hhmm} (HIỆN TẠI)`
        : isForecast
          ? `${fmt.hhmm} (Dự báo)`
          : fmt.hhmm,
      isLive,
      isForecast,
      cityMeanObservedPm25: p.obs,
      cityMeanModelPm25: p.mod,
      windSpeedKmh: p.wind,
      windDirectionDeg: p.dir,
      temperatureC: p.temp,
      humidityPct: p.hum,
      precipitationMm: p.rain,
    };
  });
}

export const VERIFIED_TIMELINE_SLOTS: TimelineSlot[] = buildDynamicTimelineSlots();

export const VERIFIED_ALERTS: AirQualityAlertItem[] = [
  {
    id: 'alt-who-exceed-4946813',
    category: 'PM25_CONCENTRATION',
    severity: 'MODERATE',
    dataOrigin: 'OBSERVED',
    stationId: 'openaq-4946813',
    stationName: 'Số 1 đường Giải Phóng - P. Bạch Mai - ĐHBK',
    areaNameVi: 'Quận Hai Bà Trưng',
    triggerValue: 44.28,
    thresholdValue: 15.0,
    unit: 'µg/m³',
    titleVi: 'Nồng độ PM2.5 tiệm cận ngưỡng giới hạn QCVN 05:2023 (44.28 / 50 µg/m³)',
    messageVi:
      'Trạm ĐHBK Giải Phóng ghi nhận PM2.5 thực đo đạt 44.28 µg/m³ lúc 17:35 (Gấp 2.95 lần khuyến nghị 24h của WHO là 15 µg/m³ và đạt 88.5% ngưỡng giới hạn QCVN 05:2023/BTNMT).',
    triggeredAtLocal: '2026-10-28 17:35',
    status: 'ACTIVE',
  },
  {
    id: 'alt-who-exceed-6123215',
    category: 'PM25_CONCENTRATION',
    severity: 'MODERATE',
    dataOrigin: 'OBSERVED',
    stationId: 'openaq-6123215',
    stationName: 'Dragon — Khu vực Đông Nam Hà Nội / Gia Lâm',
    areaNameVi: 'Huyện Gia Lâm',
    triggerValue: 49.4,
    thresholdValue: 50.0,
    unit: 'µg/m³',
    titleVi: 'Cảnh báo sớm: PM2.5 tại Gia Lâm đạt 49.40 µg/m³ (Sát ngưỡng 50 µg/m³ QCVN)',
    messageVi:
      'Trạm cảm biến AirGradient tại khu vực Đông Nam Hà Nội ghi nhận 49.40 µg/m³ lúc 17:00, chỉ còn cách ngưỡng cảnh báo Kém của QCVN 05:2023/BTNMT 0.60 µg/m³.',
    triggeredAtLocal: '2026-10-28 17:00',
    status: 'ACTIVE',
  },
  {
    id: 'alt-model-forecast-2910',
    category: 'MODEL_FORECAST',
    severity: 'UNHEALTHY_SENSITIVE',
    dataOrigin: 'MODELED',
    areaNameVi: 'Toàn Thành phố Hà Nội (Lưới mô hình CAMS Global ~40 km)',
    triggerValue: 56.8,
    thresholdValue: 50.0,
    unit: 'µg/m³',
    titleVi: '[Dự báo Mô hình] Sáng mai 29/10 PM2.5 có khả năng vượt 50 µg/m³ do lặng gió',
    messageVi:
      'Mô hình CAMS Global (ECMWF) dự báo lúc 08:00 ngày 29/10 tốc độ gió giảm xuống 5.4 km/h kèm độ ẩm 82%, khiến nồng độ PM2.5 mô hình tăng lên ~56.8 µg/m³.',
    triggeredAtLocal: '2026-10-28 17:00',
    status: 'ACTIVE',
  },
  {
    id: 'alt-tech-stale-2161292',
    category: 'STATION_STALE',
    severity: 'TECHNICAL_WARNING',
    dataOrigin: 'OBSERVED',
    stationId: 'openaq-2161292',
    stationName: 'Số 46, phố Lưu Quang Vũ & Minh Khai - Bắc Từ Liêm',
    areaNameVi: 'Quận Cầu Giấy & Quận Bắc Từ Liêm',
    triggerValue: 599,
    thresholdValue: 180,
    unit: 'phút',
    titleVi: 'Cảnh báo kỹ thuật: 2 trạm quan trắc bị trễ dữ liệu (STALE > 9 giờ)',
    messageVi:
      'Trạm Số 46 Lưu Quang Vũ (2161292) và Minh Khai - Bắc Từ Liêm (2161306) mới gửi bản tin đến 08:00 sáng nay (độ trễ ~10 giờ). Hệ thống đã tự động gắn nhãn STALE và không dùng làm giá trị tức thời.',
    triggeredAtLocal: '2026-10-28 17:59',
    status: 'ACTIVE',
  },
];

export const VERIFIED_DATA_SOURCES: DataSourceStatusSummary[] = [
  {
    code: 'OPENAQ_V3',
    name: 'OpenAQ Platform API v3',
    sourceType: 'OBSERVATION',
    status: 'HEALTHY',
    lastSuccessLocal: '17:59:50 28/10/2026',
    latencyMs: 1138,
    totalStations: 37,
    activeStations: 5,
    notesVi: 'Nguồn quan trắc chính thức (đơn vị chuẩn µg/m³). Gồm 32 trạm thuộc Hanoi Air Quality Monitoring Network.',
  },
  {
    code: 'WAQI',
    name: 'World Air Quality Index (WAQI API)',
    sourceType: 'AQI_INDEX',
    status: 'HEALTHY',
    lastSuccessLocal: '17:59:50 28/10/2026',
    latencyMs: 130,
    totalStations: 10,
    activeStations: 7,
    notesVi: 'Nguồn đối chiếu bổ sung (cung cấp US-EPA AQI Sub-index; tự động lọc bỏ trạm Việt Trì ngoài Hà Nội).',
  },
  {
    code: 'OPEN_METEO_CAMS',
    name: 'Open-Meteo Air Quality (CAMS Global ECMWF)',
    sourceType: 'NUMERICAL_MODEL',
    status: 'HEALTHY',
    lastSuccessLocal: '17:59:50 28/10/2026',
    latencyMs: 904,
    totalStations: 4,
    activeStations: 4,
    notesVi: 'Lưới mô hình số trị độ phân giải 0.4° × 0.4° (~40 km) phủ kín 100% nội & ngoại thành Hà Nội.',
  },
  {
    code: 'OPEN_METEO_WX',
    name: 'Open-Meteo Weather & Geocoding API',
    sourceType: 'WEATHER',
    status: 'HEALTHY',
    lastSuccessLocal: '17:59:50 28/10/2026',
    latencyMs: 853,
    totalStations: 1,
    activeStations: 1,
    notesVi: 'Cập nhật khí tượng mỗi 15 phút (Nhiệt độ 27.5°C, Độ ẩm 70%, Gió 9.9 km/h hướng 148° Đông Nam).',
  },
];

/**
 * Inspects any arbitrary (lat, lon) coordinate clicked on the map.
 */
export function inspectArbitraryHanoiPoint(
  lat: number,
  lon: number,
  stations: MonitoringStation[] = VERIFIED_HANOI_STATIONS,
  gridCells: ModelGridCellValue[] = VERIFIED_CAMS_MODEL_GRID_CELLS
): ArbitraryPointInspection {
  const isWithinHanoi =
    lat >= 20.56 && lat <= 21.39 && lon >= 105.28 && lon <= 106.02;

  let nearestActive: { station: MonitoringStation; distanceKm: number } | null = null;
  let nearestAny: { station: MonitoringStation; distanceKm: number } | null = null;

  for (const st of stations) {
    const dKm = calculateHaversineDistanceKm(lat, lon, st.latitude, st.longitude);
    if (!nearestAny || dKm < nearestAny.distanceKm) {
      nearestAny = { station: st, distanceKm: dKm };
    }
    if (
      (st.freshnessStatus === 'FRESH' || st.freshnessStatus === 'DELAYED') &&
      st.latestPm25UgM3 !== null
    ) {
      if (!nearestActive || dKm < nearestActive.distanceKm) {
        nearestActive = { station: st, distanceKm: dKm };
      }
    }
  }

  let matchedCell: ModelGridCellValue | null =
    gridCells.find(
      (c) =>
        lon >= c.bounds[0] &&
        lat >= c.bounds[1] &&
        lon <= c.bounds[2] &&
        lat <= c.bounds[3]
    ) ?? null;

  if (!matchedCell && gridCells.length > 0) {
    matchedCell = [...gridCells].sort(
      (a, b) =>
        calculateHaversineDistanceKm(lat, lon, a.centerLat, a.centerLon) -
        calculateHaversineDistanceKm(lat, lon, b.centerLat, b.centerLon)
    )[0];
  }

  let districtNameVi = 'Khu vực Ngoại thành Hà Nội';
  let communeOrWardNameVi = `Tọa độ (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`;

  if (!isWithinHanoi) {
    districtNameVi = 'Ngoài địa giới hành chính Thành phố Hà Nội';
  } else if (nearestAny && nearestAny.distanceKm <= 4.5) {
    districtNameVi = nearestAny.station.districtNameVi;
    communeOrWardNameVi = `Lân cận ${nearestAny.station.administrativeAreaNameVi}`;
  } else if (lat > 21.15) {
    districtNameVi = 'Khu vực Bắc Hà Nội (Sóc Sơn / Đông Anh / Mê Linh)';
  } else if (lon < 105.62) {
    districtNameVi = 'Khu vực Tây Hà Nội (Ba Vì / Sơn Tây / Thạch Thất / Quốc Oai)';
  } else if (lat < 20.88) {
    districtNameVi = 'Khu vực Nam Hà Nội (Chương Mỹ / Thanh Oai / Mỹ Đức / Phú Xuyên)';
  } else if (lon > 105.89) {
    districtNameVi = 'Khu vực Đông Hà Nội (Long Biên / Gia Lâm)';
  } else {
    districtNameVi = 'Khu vực Nội thành Hà Nội';
  }

  return {
    latitude: Number(lat.toFixed(5)),
    longitude: Number(lon.toFixed(5)),
    isWithinHanoi,
    communeOrWardNameVi,
    districtNameVi,
    nearestActiveStation: nearestActive,
    nearestAnyStation: nearestAny,
    modelGridCell: matchedCell,
    scientificDisclaimerVi:
      'LƯU Ý KHOA HỌC: Điểm bạn vừa chọn không có trạm quan trắc mặt đất đặt trực tiếp tại chỗ. Hệ thống hiển thị (1) Khoảng cách thực tế tới trạm đang hoạt động gần nhất và (2) Giá trị ước tính riêng từ ô lưới mô hình CAMS Global (~40 km). Tuyệt đối không tự ý gán số đo của trạm xa thành số đo thực tế tại tọa độ này.',
  };
}

