import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Database,
  Download,
  GitCompare,
  Wind,
  X,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { classifyPm25Level } from '@hanoi-pm25/shared';
import {
  VERIFIED_ALERTS,
  VERIFIED_DATA_SOURCES,
  VERIFIED_HANOI_STATIONS,
} from '../data/verifiedHanoiSnapshot.js';
import { useWebGisStore, type DrawerTab } from '../store/useWebGisStore.js';

export const AnalyticsDrawer: React.FC = () => {
  const {
    isDrawerOpen,
    activeDrawerTab,
    openDrawer,
    closeDrawer,
    selectedStation,
    selectStation,
    comparedStationIds,
    toggleCompareStation,
  } = useWebGisStore();

  if (!isDrawerOpen) return null;

  const focusStation = selectedStation ?? VERIFIED_HANOI_STATIONS[0];
  const comparedStations = VERIFIED_HANOI_STATIONS.filter((s) =>
    comparedStationIds.includes(s.id)
  );

  // Export verified station observations to CSV with UTF-8 BOM for Vietnamese Excel compatibility
  const handleExportCsv = () => {
    const headers = [
      'Station_ID',
      'Station_Name',
      'Provider',
      'District',
      'Latitude',
      'Longitude',
      'Freshness_Status',
      'PM25_ug_m3',
      'PM10_ug_m3',
      'VN_AQI',
      'Value_Origin',
      'Quality_Flag',
      'Measured_At_Local',
    ];
    const rows = VERIFIED_HANOI_STATIONS.map((s) => [
      s.externalStationId,
      `"${s.name}"`,
      `"${s.providerName}"`,
      `"${s.districtNameVi}"`,
      s.latitude,
      s.longitude,
      s.freshnessStatus,
      s.latestPm25UgM3 ?? '',
      s.latestPm10UgM3 ?? '',
      s.computedVnAqi ?? '',
      s.valueOrigin,
      s.qualityFlag,
      `"${s.measuredAtLocal ?? ''}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hanoi-pm25-verified-stations-2026-10-28.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const TABS: Array<{ id: DrawerTab; labelVi: string; icon: React.ReactNode }> = [
    {
      id: 'timeseries',
      labelVi: 'Chuỗi thời gian & Thống kê',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'meteorology',
      labelVi: 'Tương quan Khí tượng – PM2.5',
      icon: <Wind className="w-4 h-4" />,
    },
    {
      id: 'compare',
      labelVi: `So sánh Khu vực (${comparedStations.length})`,
      icon: <GitCompare className="w-4 h-4" />,
    },
    {
      id: 'alerts',
      labelVi: `Cảnh báo (${VERIFIED_ALERTS.length})`,
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: 'sources',
      labelVi: 'Kiểm toán Nguồn & Xuất CSV',
      icon: <Database className="w-4 h-4" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-2 md:p-6">
      <div className="w-full max-w-5xl h-[85vh] rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-white">
              Trung tâm Phân tích, Cảnh báo & Kiểm toán Dữ liệu PM2.5 Hà Nội
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất dữ liệu CSV (UTF-8)</span>
            </button>
            <button
              type="button"
              onClick={closeDrawer}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-slate-800 overflow-x-auto bg-slate-900/80">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => openDrawer(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold whitespace-nowrap transition ${
                activeDrawerTab === t.id
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {t.icon}
              <span>{t.labelVi}</span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeDrawerTab === 'timeseries' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Phân tích biến thiên PM2.5 & PM10 tại: {focusStation.name}
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    Đơn vị hành chính: {focusStation.administrativeAreaNameVi},{' '}
                    {focusStation.districtNameVi} · Nguồn: {focusStation.providerName}
                  </p>
                </div>
                <select
                  value={focusStation.id}
                  onChange={(e) => {
                    const st = VERIFIED_HANOI_STATIONS.find((s) => s.id === e.target.value);
                    if (st) selectStation(st);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-semibold"
                >
                  {VERIFIED_HANOI_STATIONS.filter((s) => s.hourlyHistory.length > 0).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.latestPm25UgM3} µg/m³)
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-72 w-full bg-slate-950/70 rounded-2xl p-4 border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={focusStation.hourlyHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="timeLocal" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" unit=" µg/m³" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="pm25UgM3"
                      name="Bụi mịn PM2.5 (µg/m³)"
                      fill="#10B981"
                      radius={[6, 6, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="pm10UgM3"
                      name="Bụi PM10 (µg/m³)"
                      stroke="#FACC15"
                      strokeWidth={2.5}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeDrawerTab === 'meteorology' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Phân tích Mối liên hệ Khí tượng (Tốc độ gió, Độ ẩm, Nhiệt độ) và Nồng độ PM2.5
                </h3>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  * Lưu ý khoa học (Quy tắc 24): Biểu đồ thể hiện mối tương quan thống kê trong ngày
                  tại Hà Nội (khi tốc độ gió tăng vào buổi trưa 12:00–14:00 lên 11–12 km/h, nồng độ
                  PM2.5 giảm xuống; khi gió yếu lúc sáng sớm, PM2.5 tích tụ cao hơn). Không tự suy
                  diễn nhân quả đơn biến khi chưa xét nguồn thải.
                </p>
              </div>

              <div className="h-72 w-full bg-slate-950/70 rounded-2xl p-4 border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={VERIFIED_HANOI_STATIONS[0].hourlyHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="timeLocal" stroke="#94A3B8" />
                    <YAxis yAxisId="left" stroke="#10B981" unit=" µg/m³" />
                    <YAxis yAxisId="right" orientation="right" stroke="#38BDF8" unit=" km/h" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                      }}
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="pm25UgM3"
                      name="PM2.5 (µg/m³)"
                      fill="#10B981"
                      radius={[6, 6, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="windSpeedKmh"
                      name="Tốc độ gió 10m (km/h)"
                      stroke="#38BDF8"
                      strokeWidth={2.5}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeDrawerTab === 'compare' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  So sánh Song song các Trạm Quan trắc theo Khu vực Hà Nội
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Số liệu thống kê đại diện cho điểm đặt trạm quan trắc, không mặc định đại diện
                  đồng nhất cho toàn bộ diện tích quận/huyện.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {comparedStations.map((st) => {
                  const cls = st.latestPm25UgM3 ? classifyPm25Level(st.latestPm25UgM3) : null;
                  return (
                    <div
                      key={st.id}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-bold text-[10px]">
                            {st.districtNameVi}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCompareStation(st.id)}
                            className="text-slate-400 hover:text-rose-400 text-[11px]"
                          >
                            Bỏ chọn ✕
                          </button>
                        </div>
                        <h4 className="font-bold text-white text-sm mt-2">{st.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{st.providerName}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-400">PM2.5 hiện tại:</span>
                          <strong
                            className="text-sm"
                            style={{ color: cls?.colorHex ?? '#94A3B8' }}
                          >
                            {st.latestPm25UgM3 !== null ? `${st.latestPm25UgM3} µg/m³` : 'N/A'}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Chỉ số VN_AQI:</span>
                          <strong className="text-slate-200">{st.computedVnAqi ?? '--'}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Trạng thái độ tươi:</span>
                          <strong className="text-emerald-300">{st.freshnessStatus}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Thời điểm đo:</span>
                          <span className="text-slate-300">{st.measuredAtLocal}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeDrawerTab === 'alerts' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Danh sách Cảnh báo Ô nhiễm PM2.5 & Cảnh báo Kỹ thuật (Phân biệt Quan trắc vs Mô
                hình)
              </h3>
              {VERIFIED_ALERTS.map((alt) => (
                <div
                  key={alt.id}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          alt.dataOrigin === 'OBSERVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        }`}
                      >
                        {alt.dataOrigin === 'OBSERVED'
                          ? 'Nguồn: Trạm quan trắc thực tế'
                          : 'Nguồn: Dự báo Mô hình CAMS'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Khu vực: <strong className="text-slate-200">{alt.areaNameVi}</strong>
                      </span>
                      <span className="text-[11px] text-slate-500">· {alt.triggeredAtLocal}</span>
                    </div>
                    <h4 className="font-bold text-white text-sm">{alt.titleVi}</h4>
                    <p className="text-slate-300 text-xs leading-relaxed">{alt.messageVi}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-extrabold text-amber-400">
                      {alt.triggerValue} {alt.unit}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Ngưỡng tham chiếu: {alt.thresholdValue} {alt.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeDrawerTab === 'sources' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">
                Bảng Kiểm toán Kết nối Thực tế các Nguồn Dữ liệu (Live Audit Log)
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="p-3">Mã nguồn</th>
                      <th className="p-3">Tên nhà cung cấp</th>
                      <th className="p-3">Loại dữ liệu</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3">Độ trễ API</th>
                      <th className="p-3">Trạm HN (Hoạt động/Tổng)</th>
                      <th className="p-3">Ghi chú kiểm chứng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                    {VERIFIED_DATA_SOURCES.map((src) => (
                      <tr key={src.code} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-sky-300">{src.code}</td>
                        <td className="p-3 font-semibold text-white">{src.name}</td>
                        <td className="p-3 text-slate-300">{src.sourceType}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            {src.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{src.latencyMs} ms</td>
                        <td className="p-3 font-bold text-white">
                          {src.activeStations} / {src.totalStations}
                        </td>
                        <td className="p-3 text-slate-300">{src.notesVi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

