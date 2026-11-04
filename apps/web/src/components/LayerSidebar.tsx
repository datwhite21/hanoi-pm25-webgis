import React from 'react';
import {
  BarChart2,
  CloudRain,
  Droplets,
  Eye,
  EyeOff,
  Filter,
  Flame,
  Gauge,
  Info,
  Layers,
  Radio,
  Thermometer,
  Wind,
} from 'lucide-react';
import type { ActiveMapLayer } from '@hanoi-pm25/shared';
import {
  useWebGisStore,
  type StationFilterMode,
} from '../store/useWebGisStore.js';

const LAYER_OPTIONS: Array<{
  id: ActiveMapLayer;
  labelVi: string;
  unit: string;
  isPrimary?: boolean;
  icon: React.ReactNode;
  insightTitleVi: string;
  insightDescVi: string;
}> = [
    {
      id: 'pm25',
      labelVi: 'Bụi mịn PM2.5',
      unit: 'µg/m³',
      isPrimary: true,
      icon: <Flame className="w-4 h-4 text-emerald-400" />,
      insightTitleVi: 'Hạt bụi mịn đường kính ≤ 2.5 µm',
      insightDescVi:
        'Đi sâu vào phế nang & mạch máu. Ngưỡng giới hạn 24h theo QCVN 05:2023/BTNMT là 50 µg/m³ (WHO khuyến nghị 15 µg/m³).',
    },
    {
      id: 'pm10',
      labelVi: 'Bụi PM10',
      unit: 'µg/m³',
      icon: <Gauge className="w-4 h-4 text-amber-400" />,
      insightTitleVi: 'Bụi tổng hợp đường kính ≤ 10 µm',
      insightDescVi:
        'Phát sinh mạnh từ hoạt động xây dựng, ma sát lốp xe và bụi đường cuốn lên tại các trục Vành đai 3, Giải Phóng, Gia Lâm.',
    },
    {
      id: 'aqi',
      labelVi: 'Chỉ số VN_AQI',
      unit: 'AQI',
      icon: <Radio className="w-4 h-4 text-orange-400" />,
      insightTitleVi: 'Chỉ số Chất lượng Không khí Việt Nam',
      insightDescVi:
        'Tính theo Quyết định 1459/QĐ-TCMT: 0–50 (Tốt), 51–100 (Trung bình), 101–150 (Kém), 151–200 (Xấu).',
    },
    {
      id: 'wind',
      labelVi: 'Trường gió 10m',
      unit: 'km/h',
      icon: <Wind className="w-4 h-4 text-sky-400" />,
      insightTitleVi: 'Cơ chế thông gió & Khuếch tán ngang',
      insightDescVi:
        'Lõi nội đô bị nhà cao tầng cản gió (lặng gió <7 km/h, màu xanh nhạt) khiến PM2.5 tích tụ; hành lang sông Hồng thoáng gió hơn giúp thổi loãng bụi.',
    },
    {
      id: 'temperature',
      labelVi: 'Nhiệt độ 2m',
      unit: '°C',
      icon: <Thermometer className="w-4 h-4 text-rose-400" />,
      insightTitleVi: 'Đảo nhiệt đô thị (UHI) & Nghịch nhiệt',
      insightDescVi:
        'Nội thành ấm hơn ngoại thành Ba Vì/Sóc Sơn ~1.5°C. Khi đêm về mặt đất lạnh nhanh tạo lớp nghịch nhiệt giữ chặt bụi PM2.5 sát mặt đất.',
    },
    {
      id: 'humidity',
      labelVi: 'Độ ẩm tương đối',
      unit: '%',
      icon: <Droplets className="w-4 h-4 text-blue-400" />,
      insightTitleVi: 'Trương nở hút ẩm (Hygroscopic Growth)',
      insightDescVi:
        'Độ ẩm cao (>75% ven sông Hồng & vùng trũng phía Nam) làm hạt muối thứ cấp ngậm nước, phình to kích thước và gây mù quang hóa dày đặc.',
    },
    {
      id: 'precipitation',
      labelVi: 'Lượng mưa',
      unit: 'mm',
      icon: <CloudRain className="w-4 h-4 text-indigo-400" />,
      insightTitleVi: 'Cơ chế rửa trôi khí quyển (Wet Scavenging)',
      insightDescVi:
        'Mưa rào (>1.5 mm/h) cuốn trôi hạt bụi lơ lửng xuống mặt đất, giúp nồng độ PM2.5 giảm nhanh 35–60% sau cơn mưa.',
    },
  ];

const FILTER_OPTIONS: Array<{ id: StationFilterMode; labelVi: string }> = [
  { id: 'ALL', labelVi: 'Tất cả trạm trên bản đồ' },
  { id: 'ACTIVE_ONLY', labelVi: '★ Chỉ hiện trạm có số đo (Ẩn N/A)' },
  { id: 'FRESH', labelVi: '● Đang đo thực tế (Fresh)' },
  { id: 'STALE', labelVi: '◐ Trễ trong ngày (Stale)' },
];

export const LayerSidebar: React.FC = () => {
  const {
    activeLayer,
    setActiveLayer,
    showStations,
    toggleStations,
    showModelGrid,
    toggleModelGrid,
    showWindAnimation,
    toggleWindAnimation,
    showAdminBoundaries,
    toggleAdminBoundaries,
    modelGridOpacity,
    setModelGridOpacity,
    stationFilter,
    setStationFilter,
    openDrawer,
  } = useWebGisStore();

  const currentLayerMeta =
    LAYER_OPTIONS.find((l) => l.id === activeLayer) ?? LAYER_OPTIONS[0];

  return (
    <aside className="pointer-events-auto w-58 md:w-64 max-h-full overflow-y-auto rounded-2xl bg-slate-900/92 border border-slate-700/75 backdrop-blur-md p-2.5 shadow-2xl text-xs">
      {/* Section 1: Primary Thematic Layer Selector */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          Lớp thông số chính
        </span>
        <span className="text-[10px] text-emerald-400 font-semibold">7 Lớp GIS</span>
      </div>

      <div className="space-y-1">
        {LAYER_OPTIONS.map((item) => {
          const isActive = activeLayer === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveLayer(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-medium transition ${isActive
                  ? 'bg-gradient-to-r from-emerald-500/25 to-sky-500/20 text-white border border-emerald-500/50 shadow'
                  : 'text-slate-300 hover:bg-slate-800/75 border border-transparent'
                }`}
            >
              <span className="flex items-center gap-2">
                {item.icon}
                <span>{item.labelVi}</span>
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${isActive
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400'
                  }`}
              >
                {item.unit}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Scientific Layer Explanation Card */}
      <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-sky-500/30 text-[11px] leading-relaxed">
        <div className="flex items-center gap-1.5 font-bold text-sky-300 mb-1">
          <Info className="w-3.5 h-3.5 shrink-0 text-sky-400" />
          <span>{currentLayerMeta.insightTitleVi}</span>
        </div>
        <p className="text-slate-300 text-[10.5px]">{currentLayerMeta.insightDescVi}</p>
        <button
          type="button"
          onClick={() =>
            openDrawer(
              activeLayer === 'pm25' || activeLayer === 'pm10' || activeLayer === 'aqi'
                ? 'timeseries'
                : 'meteorology'
            )
          }
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-semibold text-[10px] transition"
        >
          <BarChart2 className="w-3 h-3" />
          <span>Xem biểu đồ tương quan lớp này</span>
        </button>
      </div>

      {/* Section 2: GIS Overlay Toggles */}
      <div className="mt-2.5 pt-2.5 border-t border-slate-800">
        <div className="font-bold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1.5 mb-2 px-1">
          <Eye className="w-3.5 h-3.5 text-sky-400" />
          Bật / Tắt lớp GIS
        </div>

        {/* Prominent 1-Click Button for Hiding/Showing Station Markers */}
        <button
          type="button"
          onClick={toggleStations}
          className={`w-full mb-2 flex items-center justify-between px-2.5 py-1.5 rounded-xl font-semibold text-xs border transition ${showStations
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25'
              : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
        >
          <span className="flex items-center gap-1.5">
            {showStations ? (
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{showStations ? 'Đang hiện các trạm' : 'Đã ẩn toàn bộ trạm'}</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-950/60 text-[10px]">
            {showStations ? 'Ẩn đi' : 'Hiện lên'}
          </span>
        </button>

        <div className="space-y-1.5 px-1">
          <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
            <span className="flex flex-col">
              <span>Dải màu không gian ({currentLayerMeta.unit})</span>
              <span className="text-[10px] text-slate-400">Giữ nguyên màu khi Phóng to/Thu nhỏ</span>
            </span>
            <input
              type="checkbox"
              checked={showModelGrid}
              onChange={toggleModelGrid}
              className="rounded accent-sky-500 w-3.5 h-3.5"
            />
          </label>

          {showModelGrid && (
            <div className="pt-1 pb-1.5">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Độ đậm dải màu nền</span>
                <span>{Math.round(modelGridOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.15}
                max={0.85}
                step={0.05}
                value={modelGridOpacity}
                onChange={(e) => setModelGridOpacity(Number(e.target.value))}
                className="w-full accent-sky-400 h-1 bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>
          )}

          <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
            <span>Hạt gió chuyển động</span>
            <input
              type="checkbox"
              checked={showWindAnimation}
              onChange={toggleWindAnimation}
              className="rounded accent-sky-500 w-3.5 h-3.5"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
            <span>Ranh giới hành chính HN</span>
            <input
              type="checkbox"
              checked={showAdminBoundaries}
              onChange={toggleAdminBoundaries}
              className="rounded accent-sky-500 w-3.5 h-3.5"
            />
          </label>
        </div>
      </div>

      {/* Section 3: Station Freshness Filter */}
      <div className="mt-2.5 pt-2.5 border-t border-slate-800">
        <div className="font-bold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1.5 mb-1.5 px-1">
          <Filter className="w-3.5 h-3.5 text-amber-400" />
          Lọc hiển thị trạm
        </div>
        <div className="grid grid-cols-1 gap-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setStationFilter(opt.id)}
              className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${stationFilter === opt.id
                  ? 'bg-slate-800 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
            >
              {opt.labelVi}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
