import type {
  DataFreshnessStatus,
  PollutionSeverity,
  QualityFlag,
} from './types.js';

export interface Pm25Classification {
  severity: PollutionSeverity;
  labelVi: string;
  shortLabelVi: string;
  colorHex: string;
  badgeBgCss: string;
  textColorHex: string;
  healthAdviceVi: string;
  exceedsQcvn05_2023: boolean; // QCVN 05:2023/BTNMT 24h limit = 50 ug/m3
  exceedsWho2021: boolean; // WHO 2021 24h guideline = 15 ug/m3
}

/**
 * Thresholds based on Decision 1459/QD-TCMT (VN_AQI breakpoints for PM2.5 in ug/m3)
 * and QCVN 05:2023/BTNMT (50 ug/m3 24-hour standard).
 */
export function classifyPm25Level(pm25UgM3: number): Pm25Classification {
  const exceedsQcvn = pm25UgM3 > 50;
  const exceedsWho = pm25UgM3 > 15;

  if (pm25UgM3 <= 25) {
    return {
      severity: 'GOOD',
      labelVi: 'Tốt (Trong ngưỡng an toàn QCVN)',
      shortLabelVi: 'Tốt',
      colorHex: '#10B981',
      badgeBgCss: 'rgba(16, 185, 129, 0.2)',
      textColorHex: '#34D399',
      healthAdviceVi:
        pm25UgM3 <= 15
          ? 'Chất lượng không khí lý tưởng (Đạt cả QCVN 05:2023 và khuyến nghị WHO 15 µg/m³).'
          : 'Chất lượng không khí tốt theo QCVN 05:2023 (≤ 50 µg/m³), nhưng cao hơn mức khuyến nghị 24h của WHO (15 µg/m³).',
      exceedsQcvn05_2023: false,
      exceedsWho2021: exceedsWho,
    };
  }

  if (pm25UgM3 <= 50) {
    return {
      severity: 'MODERATE',
      labelVi: 'Trung bình (Đạt chuẩn QCVN ≤ 50 µg/m³)',
      shortLabelVi: 'Trung bình',
      colorHex: '#FACC15',
      badgeBgCss: 'rgba(250, 204, 21, 0.2)',
      textColorHex: '#FDE047',
      healthAdviceVi:
        'Nằm trong giới hạn QCVN 05:2023/BTNMT (50 µg/m³). Nhóm rất nhạy cảm (trẻ nhỏ, người bệnh hô hấp) nên theo dõi khi vận động mạnh ngoài trời.',
      exceedsQcvn05_2023: false,
      exceedsWho2021: true,
    };
  }

  if (pm25UgM3 <= 80) {
    return {
      severity: 'UNHEALTHY_SENSITIVE',
      labelVi: 'Kém — Vượt quy chuẩn QCVN (> 50 µg/m³)',
      shortLabelVi: 'Kém',
      colorHex: '#F97316',
      badgeBgCss: 'rgba(249, 115, 22, 0.22)',
      textColorHex: '#FB923C',
      healthAdviceVi:
        'Vượt ngưỡng QCVN 05:2023/BTNMT (50 µg/m³). Người già, trẻ em và người mắc bệnh hô hấp/tim mạch nên hạn chế hoạt động ngoài trời và đeo khẩu trang chống bụi mịn.',
      exceedsQcvn05_2023: exceedsQcvn,
      exceedsWho2021: true,
    };
  }

  if (pm25UgM3 <= 150) {
    return {
      severity: 'UNHEALTHY',
      labelVi: 'Xấu — Có hại cho sức khỏe',
      shortLabelVi: 'Xấu',
      colorHex: '#EF4444',
      badgeBgCss: 'rgba(239, 68, 68, 0.25)',
      textColorHex: '#F87171',
      healthAdviceVi:
        'Ô nhiễm bụi mịn mức Xấu. Mọi người nên giảm thời gian vận động ngoài trời; bắt buộc sử dụng khẩu trang đạt chuẩn N95/KN95 khi tham gia giao thông.',
      exceedsQcvn05_2023: true,
      exceedsWho2021: true,
    };
  }

  if (pm25UgM3 <= 250) {
    return {
      severity: 'VERY_UNHEALTHY',
      labelVi: 'Rất xấu — Cảnh báo sức khỏe khẩn cấp',
      shortLabelVi: 'Rất xấu',
      colorHex: '#A855F7',
      badgeBgCss: 'rgba(168, 85, 247, 0.28)',
      textColorHex: '#C084FC',
      healthAdviceVi:
        'Ô nhiễm bụi mịn nghiêm trọng. Tránh mọi hoạt động thể lực ngoài trời, đóng kín cửa sổ và bật máy lọc không khí trong nhà.',
      exceedsQcvn05_2023: true,
      exceedsWho2021: true,
    };
  }

  return {
    severity: 'HAZARDOUS',
    labelVi: 'Nguy hại — Báo động đỏ',
    shortLabelVi: 'Nguy hại',
    colorHex: '#881337',
    badgeBgCss: 'rgba(136, 19, 55, 0.4)',
    textColorHex: '#FDA4AF',
    healthAdviceVi:
      'Mức nguy hại cực đoan cho toàn bộ dân cư. Khuyến cáo ở trong nhà, không tập thể dục ngoài trời.',
    exceedsQcvn05_2023: true,
    exceedsWho2021: true,
  };
}

interface BreakpointRow {
  bpLow: number;
  bpHigh: number;
  iLow: number;
  iHigh: number;
}

const VN_AQI_PM25_BREAKPOINTS: BreakpointRow[] = [
  { bpLow: 0, bpHigh: 25, iLow: 0, iHigh: 50 },
  { bpLow: 25, bpHigh: 50, iLow: 51, iHigh: 100 },
  { bpLow: 50, bpHigh: 80, iLow: 101, iHigh: 150 },
  { bpLow: 80, bpHigh: 150, iLow: 151, iHigh: 200 },
  { bpLow: 150, bpHigh: 250, iLow: 201, iHigh: 300 },
  { bpLow: 250, bpHigh: 350, iLow: 301, iHigh: 400 },
  { bpLow: 350, bpHigh: 500, iLow: 401, iHigh: 500 },
];

/**
 * Calculates VN_AQI sub-index for PM2.5 per Decision 1459/QD-TCMT (MONRE Vietnam).
 */
export function calculateVnAqiFromPm25(concentrationUgM3: number): number {
  if (!Number.isFinite(concentrationUgM3) || concentrationUgM3 < 0) {
    throw new Error('PM2.5 concentration must be a non-negative number');
  }
  if (concentrationUgM3 === 0) return 0;
  if (concentrationUgM3 >= 500) return 500;

  for (const row of VN_AQI_PM25_BREAKPOINTS) {
    if (concentrationUgM3 <= row.bpHigh) {
      const aqi =
        ((row.iHigh - row.iLow) / (row.bpHigh - row.bpLow)) *
          (concentrationUgM3 - row.bpLow) +
        row.iLow;
      return Math.round(aqi);
    }
  }
  return 500;
}

/**
 * Calculates 12-hour NowCast PM2.5 value per Decision 1459/QD-TCMT.
 * @param hourlyValuesNewestFirst Array of up to 12 hourly concentrations [c1 (latest), c2, ..., c12]
 */
export function calculateNowCastPm25(
  hourlyValuesNewestFirst: Array<number | null | undefined>
): {
  valid: boolean;
  nowCastUgM3: number | null;
  vnAqi: number | null;
  reason?: string;
} {
  const slice12 = hourlyValuesNewestFirst.slice(0, 12);
  const recent3 = slice12.slice(0, 3);
  const validRecent3Count = recent3.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
  ).length;

  if (validRecent3Count < 2) {
    return {
      valid: false,
      nowCastUgM3: null,
      vnAqi: null,
      reason: 'INSUFFICIENT_RECENT_HOURS_MINIMUM_2_OF_3',
    };
  }

  const validAll = slice12.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
  );
  const cMin = Math.min(...validAll);
  const cMax = Math.max(...validAll);

  if (cMax === 0) {
    return { valid: true, nowCastUgM3: 0, vnAqi: 0 };
  }

  const wStar = cMin / cMax;
  const weightFactor = wStar <= 0.5 ? 0.5 : wStar;

  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = 0; i < slice12.length; i++) {
    const val = slice12[i];
    if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
      const w = Math.pow(weightFactor, i);
      weightedSum += val * w;
      weightTotal += w;
    }
  }

  const nowCastUgM3 = Number((weightedSum / weightTotal).toFixed(2));
  return {
    valid: true,
    nowCastUgM3,
    vnAqi: calculateVnAqiFromPm25(nowCastUgM3),
  };
}

/**
 * Evaluates station data freshness based on measurement timestamp.
 */
export function evaluateFreshnessStatus(
  measuredAtUtc: string | null | undefined,
  referenceNow: Date = new Date()
): { status: DataFreshnessStatus; lagMinutes: number | null } {
  if (!measuredAtUtc) {
    return { status: 'UNAVAILABLE', lagMinutes: null };
  }
  const measuredMs = Date.parse(measuredAtUtc);
  if (Number.isNaN(measuredMs)) {
    return { status: 'UNAVAILABLE', lagMinutes: null };
  }

  const lagMinutes = Math.max(0, Math.round((referenceNow.getTime() - measuredMs) / 60000));

  if (lagMinutes <= 90) {
    return { status: 'FRESH', lagMinutes };
  }
  if (lagMinutes <= 180) {
    return { status: 'DELAYED', lagMinutes };
  }
  if (lagMinutes <= 1440) {
    return { status: 'STALE', lagMinutes };
  }
  return { status: 'UNAVAILABLE', lagMinutes };
}

/**
 * Evaluates scientific quality flag for a PM2.5 reading.
 */
export function evaluatePm25QualityFlag(
  pm25UgM3: number | null | undefined,
  measuredAtUtc: string | null | undefined,
  isWithinHanoi = true,
  referenceNow: Date = new Date()
): QualityFlag {
  if (!isWithinHanoi) return 'OUTSIDE_STUDY_AREA';
  if (!measuredAtUtc || Number.isNaN(Date.parse(measuredAtUtc))) {
    return 'INVALID_TIMESTAMP';
  }
  if (Date.parse(measuredAtUtc) > referenceNow.getTime() + 5 * 60 * 1000) {
    return 'INVALID_TIMESTAMP';
  }
  if (pm25UgM3 === null || pm25UgM3 === undefined || Number.isNaN(pm25UgM3)) {
    return 'INVALID_OUT_OF_RANGE';
  }
  if (pm25UgM3 < 0) return 'INVALID_NEGATIVE';
  if (pm25UgM3 > 1000) return 'INVALID_OUT_OF_RANGE';
  if (pm25UgM3 > 500) return 'HIGH_EXTREME';
  return 'VALID';
}

/**
 * Calculates great-circle distance in kilometers between two WGS84 coordinates.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}
