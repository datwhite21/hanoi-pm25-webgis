import React, { useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Radio,
} from 'lucide-react';
import { VERIFIED_TIMELINE_SLOTS } from '../data/verifiedHanoiSnapshot.js';
import { useWebGisStore } from '../store/useWebGisStore.js';

const LEGEND_STEPS = [
  { label: '0–25 (Tốt)', color: '#10B981' },
  { label: '25–50 (TB · QCVN)', color: '#FACC15' },
  { label: '50–80 (Kém)', color: '#F97316' },
  { label: '80–150 (Xấu)', color: '#EF4444' },
  { label: '150–250 (Rất xấu)', color: '#A855F7' },
  { label: '>250 (Nguy hại)', color: '#881337' },
];

export const TimelineBar: React.FC = () => {
  const {
    timelineIndex,
    isPlayingTimeline,
    setTimelineIndex,
    stepTimeline,
    togglePlayTimeline,
  } = useWebGisStore();

  useEffect(() => {
    if (!isPlayingTimeline) return;
    const timer = window.setInterval(() => {
      stepTimeline(1);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [isPlayingTimeline, stepTimeline]);

  const currentSlot = VERIFIED_TIMELINE_SLOTS[timelineIndex] ?? VERIFIED_TIMELINE_SLOTS[6];

  return (
    <footer className="fixed bottom-3 left-14 right-3 z-20 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 pointer-events-none">
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
              {currentSlot.dayLabelVi} —{' '}
              <span className="text-emerald-300">{currentSlot.hourLabel}</span>
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              {currentSlot.isForecast ? (
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

      {/* PM2.5 Concentration Color Legend */}
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/92 border border-slate-700/80 backdrop-blur-md shadow-2xl pointer-events-auto shrink-0">
        <div className="text-[10px] font-bold text-slate-300 leading-tight pr-1 border-r border-slate-800">
          <div>PM2.5</div>
          <div className="text-slate-400 font-normal">(µg/m³)</div>
        </div>
        <div className="flex items-center gap-1">
          {LEGEND_STEPS.map((st) => (
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

