import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Radio,
} from 'lucide-react';
import type { ActiveMapLayer } from '@hanoi-pm25/shared';
import { VERIFIED_TIMELINE_SLOTS } from '../data/verifiedHanoiSnapshot.js';
import { useWebGisStore } from '../store/useWebGisStore.js';

const LEGEND_BY_LAYER: Record<
  ActiveMapLayer,
  {
    title: string;
    unit: string;
    steps: Array<{ label: string; color: string }>;
  }
> = {
  pm25: {
    title: 'PM2.5',
    unit: '(µg/m³)',
    steps: [
      { label: '0–18 (Rất tốt)', color: '#6EE7B7' },
      { label: '18–36 (Tốt/Nhẹ)', color: '#FDE047' },
      { label: '36–50 (TB · QCVN)', color: '#F59E0B' },
      { label: '50–80 (Kém)', color: '#F97316' },
      { label: '80–150 (Xấu)', color: '#EF4444' },
      { label: '>150 (Rất xấu)', color: '#A855F7' },
    ],
  },
  pm10: {
    title: 'PM10',
    unit: '(µg/m³)',
    steps: [
      { label: '0–35 (Thấp)', color: '#6EE7B7' },
      { label: '35–46 (Vừa)', color: '#BEF264' },
      { label: '46–54 (TB)', color: '#FACC15' },
      { label: '54–68 (Cao)', color: '#F59E0B' },
      { label: '68–100 (Kém)', color: '#EA580C' },
      { label: '>100 (Xấu)', color: '#DC2626' },
    ],
  },
  aqi: {
    title: 'VN_AQI',
    unit: '(QĐ 1459)',
    steps: [
      { label: '0–50 (Tốt)', color: '#34D399' },
      { label: '51–78 (TB thấp)', color: '#FDE047' },
      { label: '79–100 (TB cao)', color: '#F59E0B' },
      { label: '101–150 (Kém)', color: '#F97316' },
      { label: '151–200 (Xấu)', color: '#EF4444' },
      { label: '>200 (Rất xấu)', color: '#A855F7' },
    ],
  },
  wind: {
    title: 'Gió 10m',
    unit: '(km/h)',
    steps: [
      { label: '<6.5 (Lặng gió)', color: '#7DD3FC' },
      { label: '6.5–9 (Gió nhẹ)', color: '#22D3EE' },
      { label: '9–11.5 (Gió vừa)', color: '#34D399' },
      { label: '11.5–15 (Khá mạnh)', color: '#FACC15' },
      { label: '>15 (Khuếch tán mạnh)', color: '#F97316' },
    ],
  },
  temperature: {
    title: 'Nhiệt độ',
    unit: '(°C · 2m)',
    steps: [
      { label: '<24.5° (Mát)', color: '#38BDF8' },
      { label: '24.5–26.5° (Dễ chịu)', color: '#34D399' },
      { label: '26.5–27.6° (Ấm)', color: '#FDE047' },
      { label: '27.6–28.4° (Đảo nhiệt)', color: '#FB923C' },
      { label: '>28.4° (Nóng nội đô)', color: '#F43F5E' },
    ],
  },
  humidity: {
    title: 'Độ ẩm',
    unit: '(% RH)',
    steps: [
      { label: '<65% (Khô ráo)', color: '#67E8F9' },
      { label: '65–72% (Ẩm vừa)', color: '#38BDF8' },
      { label: '72–78% (Ẩm cao)', color: '#3B82F6' },
      { label: '>78% (Mù ẩm/Trương nở)', color: '#6366F1' },
    ],
  },
  precipitation: {
    title: 'Lượng mưa',
    unit: '(mm/h)',
    steps: [
      { label: '0–0.4 (Không mưa)', color: '#7DD3FC' },
      { label: '0.4–1.2 (Mưa nhỏ)', color: '#38BDF8' },
      { label: '1.2–2.2 (Rửa trôi bụi)', color: '#2563EB' },
      { label: '>2.2 (Mưa rào mạnh)', color: '#7C3AED' },
    ],
  },
};

function formatLiveTimeVi(now: Date): { dayStr: string; timeStr: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  return {
    dayStr: `Hôm nay ${map.day}/${map.month}`,
    timeStr: `${map.hour}:${map.minute}:${map.second} (HIỆN TẠI)`,
  };
}

export const TimelineBar: React.FC = () => {
  const {
    activeLayer,
    timelineIndex,
    isPlayingTimeline,
    setTimelineIndex,
    stepTimeline,
    togglePlayTimeline,
  } = useWebGisStore();

  const [liveClock, setLiveClock] = useState(() => formatLiveTimeVi(new Date()));

  useEffect(() => {
    const t = window.setInterval(() => {
      setLiveClock(formatLiveTimeVi(new Date()));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isPlayingTimeline) return;
    const timer = window.setInterval(() => {
      stepTimeline(1);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [isPlayingTimeline, stepTimeline]);

  const currentSlot = VERIFIED_TIMELINE_SLOTS[timelineIndex] ?? VERIFIED_TIMELINE_SLOTS[6];
  const legendConfig = LEGEND_BY_LAYER[activeLayer] ?? LEGEND_BY_LAYER.pm25;

  return (
    <footer className="relative z-20 w-full shrink-0 pl-11 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 pointer-events-none">
      {/* Timeline Player & Scrubber */}
      <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-900/92 border border-slate-700/80 backdrop-blur-md shadow-2xl pointer-events-auto">
        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={togglePlayTimeline}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow transition"
            title={isPlayingTimeline ? 'Tạm dừng hoạt ảnh thời gian' : 'Phát hoạt ảnh thời gian'}
          >
            {isPlayingTimeline ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={() => stepTimeline(-1)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
            title="Lùi bước thời gian"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => stepTimeline(1)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
            title="Tiến bước thời gian"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setTimelineIndex(6)}
            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase flex items-center gap-1 transition ${
              currentSlot.isLive
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Nhảy về thời điểm đo thực tế mới nhất"
          >
            <Radio className="w-3 h-3" />
            <span>LIVE</span>
          </button>
        </div>

        {/* Scrubber Track */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-white truncate">
              {currentSlot.isLive ? liveClock.dayStr : currentSlot.dayLabelVi} —{' '}
              <span className="text-emerald-300">
                {currentSlot.isLive ? liveClock.timeStr : currentSlot.hourLabel}
              </span>
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              {activeLayer === 'wind' ? (
                <span>
                  Tốc độ gió 10m TB: <strong className="text-sky-300">{currentSlot.windSpeedKmh} km/h</strong> (Hướng {currentSlot.windDirectionDeg}°)
                </span>
              ) : activeLayer === 'temperature' ? (
                <span>
                  Nhiệt độ 2m TB: <strong className="text-rose-300">{currentSlot.temperatureC}°C</strong> (Đảo nhiệt nội đô +1.5°C)
                </span>
              ) : activeLayer === 'humidity' ? (
                <span>
                  Độ ẩm tương đối TB: <strong className="text-blue-300">{currentSlot.humidityPct}% RH</strong>
                </span>
              ) : activeLayer === 'precipitation' ? (
                <span>
                  Lượng mưa TB: <strong className="text-indigo-300">{currentSlot.precipitationMm} mm/h</strong>
                </span>
              ) : currentSlot.isForecast ? (
                <span className="text-amber-300 font-semibold">
                  Dự báo mô hình CAMS: ~{currentSlot.cityMeanModelPm25} µg/m³
                </span>
              ) : (
                <span>
                  TB Trạm HN: <strong>{currentSlot.cityMeanObservedPm25} µg/m³</strong> · Mô hình:{' '}
                  <strong>{currentSlot.cityMeanModelPm25} µg/m³</strong>
                </span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-11 gap-1">
            {VERIFIED_TIMELINE_SLOTS.map((slot) => {
              const active = slot.index === timelineIndex;
              return (
                <button
                  key={slot.index}
                  type="button"
                  onClick={() => setTimelineIndex(slot.index)}
                  className={`h-2 rounded-full transition-all ${
                    active
                      ? 'bg-emerald-400 ring-2 ring-emerald-400/50 scale-y-125'
                      : slot.isLive
                      ? 'bg-sky-400/80 hover:bg-sky-300'
                      : slot.isForecast
                      ? 'bg-amber-500/45 hover:bg-amber-400/75'
                      : 'bg-slate-700 hover:bg-slate-500'
                  }`}
                  title={`${slot.dayLabelVi} ${slot.hourLabel}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Dynamic Active Layer Color Legend */}
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/92 border border-slate-700/80 backdrop-blur-md shadow-2xl pointer-events-auto shrink-0">
        <div className="text-[10px] font-bold text-slate-300 leading-tight pr-1.5 border-r border-slate-800">
          <div>{legendConfig.title}</div>
          <div className="text-slate-400 font-normal">{legendConfig.unit}</div>
        </div>
        <div className="flex items-center gap-1">
          {legendConfig.steps.map((st) => (
            <div key={st.label} className="flex flex-col items-center">
              <span
                className="w-10 sm:w-14 h-2.5 rounded-sm"
                style={{ backgroundColor: st.color }}
              />
              <span className="text-[9px] text-slate-300 mt-0.5 whitespace-nowrap">
                {st.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};
