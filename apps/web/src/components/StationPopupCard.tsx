import React from 'react';
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  Clock,
  GitCompare,
  Heart,
  MapPin,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { classifyPm25Level } from '@hanoi-pm25/shared';
import { useWebGisStore } from '../store/useWebGisStore.js';

export const StationPopupCard: React.FC = () => {
  const {
    selectedStation,
    selectStation,
    openDrawer,
    comparedStationIds,
    toggleCompareStation,
    favoriteStationIds,
    toggleFavoriteStation,
  } = useWebGisStore();

  if (!selectedStation) return null;

  const hasPm25 = selectedStation.latestPm25UgM3 !== null;
  const classification = hasPm25
    ? classifyPm25Level(selectedStation.latestPm25UgM3 ?? 0)
    : null;

  const isCompared = comparedStationIds.includes(selectedStation.id);
  const isFavorite = favoriteStationIds.includes(selectedStation.id);

  const freshnessBadge = {
    FRESH: {
      label: 'Đang hoạt động (FRESH)',
      cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    DELAYED: {
      label: 'Trễ nhẹ (DELAYED)',
      cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    },
    STALE: {
      label: 'Dữ liệu cũ trong ngày (STALE)',
      cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    UNAVAILABLE: {
      label: 'Ngừng phát tín hiệu hiện tại (UNAVAILABLE)',
      cls: 'bg-slate-700/60 text-slate-300 border-slate-600',
    },
  }[selectedStation.freshnessStatus];

  return (
    <section
      aria-label="Thông tin chi tiết trạm quan trắc"
      className="pointer-events-auto w-[calc(100vw-1.5rem)] sm:w-88 md:w-96 max-h-full overflow-y-auto rounded-2xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-lg p-3.5 shadow-2xl text-xs"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
              {selectedStation.sourceCode === 'OPENAQ_V3'
                ? 'OpenAQ v3 (Thực đo µg/m³)'
                : 'WAQI (Đối chiếu AQI)'}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${freshnessBadge.cls}`}
            >
              {freshnessBadge.label}
            </span>
          </div>
          <h2 className="text-sm md:text-base font-bold text-white leading-snug">
            {selectedStation.name}
          </h2>
          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span>
              {selectedStation.administrativeAreaNameVi}, {selectedStation.districtNameVi} (
              {selectedStation.latitude.toFixed(4)}°N, {selectedStation.longitude.toFixed(4)}°E)
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => toggleFavoriteStation(selectedStation.id)}
            className={`p-1.5 rounded-xl border transition ${
              isFavorite
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Lưu vào địa điểm yêu thích"
          >
            <Heart className="w-4 h-4 fill-current" />
          </button>
          <button
            type="button"
            onClick={() => selectStation(null)}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300"
            title="Đóng bảng thông tin trạm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Concentration & AQI Readout */}
      {hasPm25 && classification ? (
        <div
          className="mt-3 p-3 rounded-2xl border flex items-center justify-between gap-3"
          style={{
            backgroundColor: classification.badgeBgCss,
            borderColor: classification.colorHex,
          }}
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-200">
              Nồng độ Bụi mịn PM2.5
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className="text-2xl md:text-3xl font-extrabold"
                style={{ color: classification.colorHex }}
              >
                {selectedStation.latestPm25UgM3}
              </span>
              <span className="text-xs font-bold text-slate-200">µg/m³</span>
            </div>
            {selectedStation.valueOrigin === 'DERIVED_FROM_US_AQI' && (
              <div className="text-[10px] text-amber-200 mt-0.5">
                * Quy đổi tham khảo từ chỉ số con US-EPA AQI ({selectedStation.rawAqiSubindex})
              </div>
            )}
          </div>

          <div className="text-right">
            <span
              className="inline-block px-2.5 py-1 rounded-xl text-xs font-extrabold text-slate-950 shadow"
              style={{ backgroundColor: classification.colorHex }}
            >
              {classification.shortLabelVi}
            </span>
            <div className="mt-1.5 text-[11px] text-slate-200 font-semibold">
              VN_AQI: <strong>{selectedStation.computedVnAqi ?? '--'}</strong>
              {selectedStation.rawAqiSubindex !== null && (
                <span className="text-amber-300">
                  {' '}
                  · US-AQI (WAQI): <strong>{selectedStation.rawAqiSubindex}</strong>
                </span>
              )}
              {selectedStation.latestPm10UgM3 !== null && (
                <span> · PM10: {selectedStation.latestPm10UgM3} µg/m³</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 p-3 rounded-2xl bg-slate-800/75 border border-slate-700 text-slate-300 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white">
              Trạm hiện ngừng phát dữ liệu thời gian thực (UNAVAILABLE)
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Bản tin đo cuối cùng được OpenAQ ghi nhận lúc{' '}
              <strong className="text-slate-200">{selectedStation.measuredAtLocal}</strong>. Hệ
              thống giữ nguyên lịch sử thực tế và tuyệt đối không tự tạo số đo giả.
            </p>
          </div>
        </div>
      )}

      {/* Stale Data Warning Banner */}
      {selectedStation.freshnessStatus === 'STALE' && (
        <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-start gap-2 text-[11px]">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Cảnh báo dữ liệu trễ (Stale):</strong> Phép đo này thực hiện lúc{' '}
            <strong>{selectedStation.measuredAtLocal}</strong> (cách đây{' '}
            {Math.round((selectedStation.lagMinutes ?? 0) / 60)} giờ). Không sử dụng làm số đo tức
            thời hiện tại.
          </span>
        </div>
      )}

      {/* Scientific Metadata & 5 Timestamps Verification */}
      <div className="mt-3 grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px]">
        <div>
          <span className="text-slate-400 block">Nhà cung cấp trạm:</span>
          <strong className="text-slate-200">{selectedStation.providerName}</strong>
        </div>
        <div>
          <span className="text-slate-400 block">Cấp thiết bị & QC:</span>
          <strong className="text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {selectedStation.isReferenceMonitor ? 'Trạm chuẩn' : 'Cảm biến'} ·{' '}
            {selectedStation.qualityFlag}
          </strong>
        </div>
        <div>
          <span className="text-slate-400 block">1. Thời điểm trạm đo:</span>
          <strong className="text-slate-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-400" />
            {selectedStation.measuredAtLocal ?? 'N/A'}
          </strong>
        </div>
        <div>
          <span className="text-slate-400 block">2. Độ trễ công bố:</span>
          <strong className="text-slate-200">
            {selectedStation.measuredAtUtc &&
            !Number.isNaN(Date.parse(selectedStation.measuredAtUtc)) &&
            !selectedStation.measuredAtUtc.startsWith('2026-10-') &&
            !selectedStation.measuredAtUtc.startsWith('2025-')
              ? `${Math.max(
                  1,
                  Math.round(
                    (Date.now() - Date.parse(selectedStation.measuredAtUtc)) /
                      60000
                  )
                )} phút trước`
              : selectedStation.lagMinutes !== null
                ? `${selectedStation.lagMinutes} phút trước`
                : 'Ngừng kết nối'}
          </strong>
        </div>
      </div>

      {/* Health Recommendation */}
      {classification && (
        <p className="mt-2.5 text-[11px] text-slate-300 leading-relaxed bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60">
          <strong className="text-white">Khuyến cáo sức khỏe: </strong>
          {classification.healthAdviceVi}
        </p>
      )}

      {/* Mini 24h Trend Chart */}
      {selectedStation.hourlyHistory.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1">
            <span>Diễn biến PM2.5 trong ngày (µg/m³)</span>
            <span className="text-[10px] text-slate-400">Ngưỡng QCVN: 50 µg/m³</span>
          </div>
          <div className="h-28 w-full bg-slate-950/60 rounded-xl p-2 border border-slate-800">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={selectedStation.hourlyHistory}>
                <defs>
                  <linearGradient id="pm25Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={classification?.colorHex ?? '#10B981'}
                      stopOpacity={0.55}
                    />
                    <stop
                      offset="95%"
                      stopColor={classification?.colorHex ?? '#10B981'}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="timeLocal"
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '10px',
                    fontSize: '11px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pm25UgM3"
                  name="PM2.5 (µg/m³)"
                  stroke={classification?.colorHex ?? '#10B981'}
                  strokeWidth={2}
                  fill="url(#pm25Grad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleCompareStation(selectedStation.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-semibold text-xs border transition ${
            isCompared
              ? 'bg-sky-500/20 border-sky-400 text-sky-300'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>{isCompared ? 'Đang trong danh sách so sánh' : 'Thêm vào So sánh'}</span>
        </button>
        <button
          type="button"
          onClick={() => openDrawer('timeseries')}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Phân tích sâu</span>
        </button>
      </div>
    </section>
  );
};

