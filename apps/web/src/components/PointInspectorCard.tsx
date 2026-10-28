import React from 'react';
import {
  Compass,
  Grid,
  Info,
  Navigation,
  Wind,
  X,
} from 'lucide-react';
import { classifyPm25Level } from '@hanoi-pm25/shared';
import { useWebGisStore } from '../store/useWebGisStore.js';

export const PointInspectorCard: React.FC = () => {
  const {
    inspectedPoint,
    selectedAreaStats,
    inspectAdministrativeArea,
    clearInspection,
    selectStation,
  } = useWebGisStore();

  if (!inspectedPoint) return null;

  const nearestActive = inspectedPoint.nearestActiveStation;
  const modelCell = inspectedPoint.modelGridCell;
  const modelClass = modelCell ? classifyPm25Level(modelCell.pm25UgM3) : null;

  const QUICK_AREAS = [
    { code: 'HN-HBT', nameVi: 'Hai Bà Trưng' },
    { code: 'HN-TX', nameVi: 'Thanh Xuân' },
    { code: 'HN-GL', nameVi: 'Gia Lâm' },
    { code: 'HN-TH', nameVi: 'Tây Hồ' },
    { code: 'HN-HD', nameVi: 'Hà Đông' },
    { code: 'HN-SS', nameVi: 'Sóc Sơn (0 trạm)' },
  ];

  return (
    <section
      aria-label="Truy vấn không gian tại vị trí bất kỳ"
      className="fixed left-3 bottom-24 md:bottom-auto md:top-20 z-20 w-[calc(100vw-1.5rem)] sm:w-96 rounded-2xl bg-slate-900/95 border border-sky-500/60 backdrop-blur-lg p-4 shadow-2xl text-xs max-h-[68vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40">
            <Compass className="w-3 h-3" />
            Truy vấn Vị trí Bất kỳ (PostGIS Spatial Inspector)
          </span>
          <h2 className="text-sm font-bold text-white mt-1.5">
            {inspectedPoint.districtNameVi}
          </h2>
          <p className="text-[11px] text-slate-400">
            {inspectedPoint.communeOrWardNameVi} · Tọa độ:{' '}
            <code className="text-sky-300">
              {inspectedPoint.latitude.toFixed(4)}°N, {inspectedPoint.longitude.toFixed(4)}°E
            </code>
          </p>
        </div>
        <button
          type="button"
          onClick={clearInspection}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scientific Honesty Disclaimer */}
      <div className="mt-3 p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-[11px] text-sky-200 flex items-start gap-2">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <span>{inspectedPoint.scientificDisclaimerVi}</span>
      </div>

      {/* 1. Nearest Active Monitoring Station (ST_Distance) */}
      {nearestActive && (
        <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <Navigation className="w-3.5 h-3.5" />
              1. Trạm quan trắc đang hoạt động gần nhất
            </span>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold">
              Cách {nearestActive.distanceKm} km
            </span>
          </div>

          <div className="font-bold text-slate-100 text-xs">
            {nearestActive.station.name}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {nearestActive.station.administrativeAreaNameVi},{' '}
            {nearestActive.station.districtNameVi}
          </div>

          <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-slate-400 text-[11px]">Số đo tại trạm đó: </span>
              <strong className="text-emerald-300 text-sm">
                {nearestActive.station.latestPm25UgM3} µg/m³
              </strong>
              <span className="text-[10px] text-slate-400 ml-1">
                ({nearestActive.station.measuredAtLocal})
              </span>
            </div>
            <button
              type="button"
              onClick={() => selectStation(nearestActive.station)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-[11px]"
            >
              Xem trạm →
            </button>
          </div>
        </div>
      )}

      {/* 2. CAMS Global (~40 km) Model Grid Estimate at Selected Coordinate */}
      {modelCell && modelClass && (
        <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-semibold text-amber-300">
              <Grid className="w-3.5 h-3.5" />
              2. Dữ liệu Ô lưới Mô hình CAMS (~40 km)
            </span>
            <span className="text-[10px] text-slate-400">Open-Meteo ECMWF</span>
          </div>

          <div className="text-[11px] text-slate-300">{modelCell.labelVi}</div>

          <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-slate-400 text-[10px] block">PM2.5 mô hình nền:</span>
              <strong className="text-sm" style={{ color: modelClass.colorHex }}>
                {modelCell.pm25UgM3} µg/m³
              </strong>
              <span className="text-[10px] text-slate-400 ml-1">
                ({modelClass.shortLabelVi})
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">PM10 mô hình nền:</span>
              <strong className="text-sm text-slate-200">{modelCell.pm10UgM3} µg/m³</strong>
            </div>
            <div className="col-span-2 flex items-center gap-2 text-[11px] text-slate-300 pt-1">
              <Wind className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>
                Khí tượng ô lưới: <strong>{modelCell.temperatureC}°C</strong> · Độ ẩm{' '}
                <strong>{modelCell.humidityPct}%</strong> · Gió{' '}
                <strong>{modelCell.windSpeedKmh} km/h</strong> ({modelCell.windDirectionDeg}°)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. PostGIS Administrative Area Statistics (ST_Within & ST_Intersects) */}
      <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
        <div className="text-[11px] font-semibold text-purple-300 mb-1.5">
          3. Truy vấn Thống kê Không gian theo Khu vực (PostGIS ST_Within)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_AREAS.map((area) => (
            <button
              key={area.code}
              type="button"
              onClick={() => inspectAdministrativeArea(area.code)}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition ${
                selectedAreaStats?.area.code === area.code
                  ? 'bg-purple-500/30 border-purple-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {area.nameVi}
            </button>
          ))}
        </div>

        {selectedAreaStats && (
          <div className="mt-2.5 pt-2 border-t border-slate-800 text-[11px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">
                {selectedAreaStats.area.nameVi} ({selectedAreaStats.area.code})
              </span>
              <span className="text-slate-400">
                Diện tích: {selectedAreaStats.area.areaSqKm} km²
              </span>
            </div>
            <div className="text-slate-300">
              Trạm hoạt động trong vùng:{' '}
              <strong className="text-emerald-300">
                {selectedAreaStats.observedStatistics.activeStationsInArea}/
                {selectedAreaStats.observedStatistics.totalStationsInArea} trạm
              </strong>
              {selectedAreaStats.observedStatistics.avgObservedPm25UgM3 !==
                null && (
                <span>
                  {' '}
                  · Trung bình đo thực tế:{' '}
                  <strong className="text-amber-300">
                    {selectedAreaStats.observedStatistics.avgObservedPm25UgM3} µg/m³
                  </strong>
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 italic">
              {selectedAreaStats.observedStatistics.scientificNoteVi}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

