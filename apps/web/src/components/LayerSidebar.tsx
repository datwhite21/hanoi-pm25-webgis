import React from 'react';
import {
  CloudRain,
  Droplets,
  Eye,
  Filter,
  Flame,
  Gauge,
  Layers,
  MapPin,
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
}> = [
  {
    id: 'pm25',
    labelVi: 'Bụi mịn PM2.5',
    unit: 'µg/m³',
    isPrimary: true,
    icon: <Flame className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: 'pm10',
    labelVi: 'Bụi PM10',
    unit: 'µg/m³',
    icon: <Gauge className="w-4 h-4 text-amber-400" />,
  },
  {
    id: 'aqi',
    labelVi: 'Chỉ số VN_AQI',
    unit: 'AQI',
    icon: <Radio className="w-4 h-4 text-orange-400" />,
  },
  {
    id: 'wind',
    labelVi: 'Trường gió 10m',
    unit: 'km/h',
    icon: <Wind className="w-4 h-4 text-sky-400" />,
  },
  {
    id: 'temperature',
    labelVi: 'Nhiệt độ 2m',
    unit: '°C',
    icon: <Thermometer className="w-4 h-4 text-rose-400" />,
  },
  {
    id: 'humidity',
    labelVi: 'Độ ẩm tương đối',
    unit: '%',
    icon: <Droplets className="w-4 h-4 text-blue-400" />,
  },
  {
    id: 'precipitation',
    labelVi: 'Lượng mưa',
    unit: 'mm',
    icon: <CloudRain className="w-4 h-4 text-indigo-400" />,
  },
];

const FILTER_OPTIONS: Array<{ id: StationFilterMode; labelVi: string }> = [
  { id: 'ALL', labelVi: 'Tất cả trạm (13)' },
  { id: 'FRESH', labelVi: '● Đang đo (Fresh)' },
  { id: 'STALE', labelVi: '◐ Trễ trong ngày (Stale)' },
  { id: 'UNAVAILABLE', labelVi: '○ Trạm lịch sử (Offline)' },
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
  } = useWebGisStore();

  return (
    <aside className="pointer-events-auto w-56 md:w-60 max-h-full overflow-y-auto rounded-2xl bg-slate-900/92 border border-slate-700/75 backdrop-blur-md p-2.5 shadow-2xl text-xs">
      {/* Section 1: Primary Thematic Layer Selector */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          Lớp thông số chính
        </span>
        <span className="text-[10px] text-emerald-400 font-semibold">Windy-Style</span>
      </div>

      <div className="space-y-1">
        {LAYER_OPTIONS.map((item) => {
          const isActive = activeLayer === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveLayer(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl font-medium transition ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/25 to-sky-500/20 text-white border border-emerald-500/50 shadow'
                  : 'text-slate-300 hover:bg-slate-800/75 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2">
                {item.icon}
                <span>{item.labelVi}</span>
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  isActive
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

      {/* Section 2: GIS Overlay Toggles */}
      <div className="mt-3 pt-2.5 border-t border-slate-800">
        <div className="font-bold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1.5 mb-2 px-1">
          <Eye className="w-3.5 h-3.5 text-sky-400" />
          Bật / Tắt lớp GIS
        </div>

        <div className="space-y-1.5 px-1">
          <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Điểm trạm quan trắc
            </span>
            <input
              type="checkbox"
              checked={showStations}
              onChange={toggleStations}
              className="rounded accent-emerald-500 w-3.5 h-3.5"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
            <span className="flex flex-col">
              <span>Dải màu nồng độ (CAMS)</span>
              <span className="text-[10px] text-slate-400">Thấp màu nhạt · Cao màu đậm</span>
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
                <span>Độ đậm lớp mô hình</span>
                <span>{Math.round(modelGridOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.8}
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
      <div className="mt-3 pt-2.5 border-t border-slate-800">
        <div className="font-bold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1.5 mb-2 px-1">
          <Filter className="w-3.5 h-3.5 text-amber-400" />
          Lọc trạng thái trạm
        </div>
        <div className="grid grid-cols-1 gap-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setStationFilter(opt.id)}
              className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${
                stationFilter === opt.id
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

