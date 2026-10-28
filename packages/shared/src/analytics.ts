export interface PearsonCorrelationResult {
  r: number | null;
  sampleSize: number;
  strengthLabelVi: string;
  directionVi: 'NGHỊCH_BIẾN' | 'ĐỒNG_BIẾN' | 'KHÔNG_RÕ';
  scientificNoteVi: string;
}

export interface MeteoPm25Sample {
  timestampLabel: string;
  pm25UgM3: number;
  windSpeedKmh?: number | null;
  humidityPct?: number | null;
  temperatureC?: number | null;
}

export interface MeteoPm25CouplingReport {
  sampleCount: number;
  windSpeedCorrelation: PearsonCorrelationResult;
  humidityCorrelation: PearsonCorrelationResult;
  temperatureCorrelation: PearsonCorrelationResult;
  overallScientificInterpretationVi: string;
}

export interface Pm25ExceedanceSummary {
  sampleCount: number;
  meanUgM3: number;
  minUgM3: number;
  maxUgM3: number;
  stdDevUgM3: number;
  p90UgM3: number;
  who2021LimitUgM3: number;
  whoExceedanceCount: number;
  whoExceedancePct: number;
  qcvn05_2023LimitUgM3: number;
  qcvnExceedanceCount: number;
  qcvnExceedancePct: number;
  customThresholdUgM3: number;
  customExceedanceCount: number;
  customExceedancePct: number;
}

/**
 * Calculates the sample Pearson correlation coefficient (r) between two numeric arrays.
 */
export function calculatePearsonCorrelation(
  xValues: number[],
  yValues: number[],
  variableNameVi = 'Biến khí tượng'
): PearsonCorrelationResult {
  const n = Math.min(xValues.length, yValues.length);
  if (n < 3) {
    return {
      r: null,
      sampleSize: n,
      strengthLabelVi: 'Không đủ mẫu (n < 3)',
      directionVi: 'KHÔNG_RÕ',
      scientificNoteVi: `Cần tối thiểu 3 cặp quan trắc đồng thời để tính hệ số tương quan Pearson (r) cho ${variableNameVi}.`,
    };
  }

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xValues[i];
    sumY += yValues[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let sumSqDiffX = 0;
  let sumSqDiffY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xValues[i] - meanX;
    const dy = yValues[i] - meanY;
    numerator += dx * dy;
    sumSqDiffX += dx * dx;
    sumSqDiffY += dy * dy;
  }

  const denominator = Math.sqrt(sumSqDiffX * sumSqDiffY);
  if (denominator === 0) {
    return {
      r: 0,
      sampleSize: n,
      strengthLabelVi: 'Phương sai bằng 0 (r = 0)',
      directionVi: 'KHÔNG_RÕ',
      scientificNoteVi: `${variableNameVi} không biến thiên trong khoảng thời gian khảo sát.`,
    };
  }

  const r = Number((numerator / denominator).toFixed(3));
  const absR = Math.abs(r);

  let strengthLabelVi = 'Tương quan rất yếu / ngẫu nhiên';
  if (absR >= 0.7) {
    strengthLabelVi = 'Tương quan tuyến tính mạnh';
  } else if (absR >= 0.4) {
    strengthLabelVi = 'Tương quan tuyến tính trung bình';
  } else if (absR >= 0.2) {
    strengthLabelVi = 'Tương quan tuyến tính yếu';
  }

  const directionVi: PearsonCorrelationResult['directionVi'] =
    r <= -0.15 ? 'NGHỊCH_BIẾN' : r >= 0.15 ? 'ĐỒNG_BIẾN' : 'KHÔNG_RÕ';

  const dirText =
    directionVi === 'NGHỊCH_BIẾN'
      ? 'nghịch biến (khi biến này tăng thì PM2.5 có xu hướng giảm)'
      : directionVi === 'ĐỒNG_BIẾN'
        ? 'đồng biến (khi biến này tăng thì PM2.5 có xu hướng tăng)'
        : 'chưa thể hiện xu hướng tuyến tính rõ rệt';

  return {
    r,
    sampleSize: n,
    strengthLabelVi,
    directionVi,
    scientificNoteVi: `Hệ số r = ${r} (n = ${n}): ${strengthLabelVi}, ${dirText}.`,
  };
}

/**
 * Analyzes coupling between PM2.5 (ug/m3) and wind speed, relative humidity, and temperature.
 */
export function analyzeMeteorologicalPm25Coupling(
  samples: MeteoPm25Sample[]
): MeteoPm25CouplingReport {
  const windPairs = samples.filter(
    (s) =>
      Number.isFinite(s.pm25UgM3) &&
      typeof s.windSpeedKmh === 'number' &&
      Number.isFinite(s.windSpeedKmh)
  );
  const humPairs = samples.filter(
    (s) =>
      Number.isFinite(s.pm25UgM3) &&
      typeof s.humidityPct === 'number' &&
      Number.isFinite(s.humidityPct)
  );
  const tempPairs = samples.filter(
    (s) =>
      Number.isFinite(s.pm25UgM3) &&
      typeof s.temperatureC === 'number' &&
      Number.isFinite(s.temperatureC)
  );

  const windSpeedCorrelation = calculatePearsonCorrelation(
    windPairs.map((s) => s.pm25UgM3),
    windPairs.map((s) => s.windSpeedKmh as number),
    'Tốc độ gió 10m (km/h)'
  );

  const humidityCorrelation = calculatePearsonCorrelation(
    humPairs.map((s) => s.pm25UgM3),
    humPairs.map((s) => s.humidityPct as number),
    'Độ ẩm tương đối (%)'
  );

  const temperatureCorrelation = calculatePearsonCorrelation(
    tempPairs.map((s) => s.pm25UgM3),
    tempPairs.map((s) => s.temperatureC as number),
    'Nhiệt độ không khí (°C)'
  );

  return {
    sampleCount: samples.length,
    windSpeedCorrelation,
    humidityCorrelation,
    temperatureCorrelation,
    overallScientificInterpretationVi:
      'Ý nghĩa khoa học: Tại Hà Nội, tốc độ gió thường có tương quan âm (r < 0) với nồng độ PM2.5 do gió mạnh thúc đẩy thông gió ngang và khuếch tán bụi mịn, trong khi gió lặng làm bụi tích tụ sát mặt đất. Tuy nhiên, hệ số tương quan Pearson (r) chỉ phản ánh mức độ liên hệ thống kê tuyến tính trong chuỗi giờ khảo sát, không khẳng định nhân quả đơn biến nếu tách rời nguồn phát thải nội đô và hiện tượng nghịch nhiệt.',
  };
}

/**
 * Computes statistical distribution and exceedance ratios against WHO (15 ug/m3),
 * QCVN 05:2023/BTNMT (50 ug/m3), and a user-defined threshold.
 */
export function computeExceedanceSummary(
  pm25Values: number[],
  customThresholdUgM3 = 35.0
): Pm25ExceedanceSummary {
  const valid = pm25Values.filter((v) => Number.isFinite(v) && v >= 0);
  const n = valid.length;
  if (n === 0) {
    return {
      sampleCount: 0,
      meanUgM3: 0,
      minUgM3: 0,
      maxUgM3: 0,
      stdDevUgM3: 0,
      p90UgM3: 0,
      who2021LimitUgM3: 15,
      whoExceedanceCount: 0,
      whoExceedancePct: 0,
      qcvn05_2023LimitUgM3: 50,
      qcvnExceedanceCount: 0,
      qcvnExceedancePct: 0,
      customThresholdUgM3,
      customExceedanceCount: 0,
      customExceedancePct: 0,
    };
  }

  const sorted = [...valid].sort((a, b) => a - b);
  const sum = valid.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;
  const variance =
    valid.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / n;
  const stdDev = Math.sqrt(variance);
  const p90Idx = Math.min(n - 1, Math.floor(0.9 * n));

  const whoCount = valid.filter((v) => v > 15).length;
  const qcvnCount = valid.filter((v) => v > 50).length;
  const customCount = valid.filter((v) => v > customThresholdUgM3).length;

  return {
    sampleCount: n,
    meanUgM3: Number(mean.toFixed(2)),
    minUgM3: Number(sorted[0].toFixed(2)),
    maxUgM3: Number(sorted[n - 1].toFixed(2)),
    stdDevUgM3: Number(stdDev.toFixed(2)),
    p90UgM3: Number(sorted[p90Idx].toFixed(2)),
    who2021LimitUgM3: 15,
    whoExceedanceCount: whoCount,
    whoExceedancePct: Number(((whoCount / n) * 100).toFixed(1)),
    qcvn05_2023LimitUgM3: 50,
    qcvnExceedanceCount: qcvnCount,
    qcvnExceedancePct: Number(((qcvnCount / n) * 100).toFixed(1)),
    customThresholdUgM3,
    customExceedanceCount: customCount,
    customExceedancePct: Number(((customCount / n) * 100).toFixed(1)),
  };
}

