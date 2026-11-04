import React, { useEffect } from 'react';
import { AdminDashboardModal } from './components/AdminDashboardModal.js';
import { AnalyticsDrawer } from './components/AnalyticsDrawer.js';
import { FloatingHeader } from './components/FloatingHeader.js';
import { LayerSidebar } from './components/LayerSidebar.js';
import { MapCanvas } from './components/MapCanvas.js';
import { PointInspectorCard } from './components/PointInspectorCard.js';
import { StationPopupCard } from './components/StationPopupCard.js';
import { TimelineBar } from './components/TimelineBar.js';
import { useWebGisStore } from './store/useWebGisStore.js';

export const App: React.FC = () => {
  const syncWithPostgisBackend = useWebGisStore(
    (s) => s.syncWithPostgisBackend
  );
  const showModelGrid = useWebGisStore((s) => s.showModelGrid);

  useEffect(() => {
    syncWithPostgisBackend();
  }, [syncWithPostgisBackend]);

  return (
    <main className="relative w-screen h-screen overflow-hidden select-none bg-slate-950 text-slate-100">
      {/* 1. Fullscreen Interactive MapLibre GL JS Map (Background Layer z-0) */}
      <MapCanvas />

      {/* 2. Non-Overlapping 3-Row Flex HUD Overlay (Header -> Workspace Docks -> Timeline) */}
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2.5 gap-2 overflow-hidden">
        {/* Row 1: Top Floating Glassmorphism Header */}
        <FloatingHeader />

        {/* Row 2: Middle Workspace (Left Inspector/Station Dock + Center CAMS Pill + Right Layer Dock) */}
        <div className="flex-1 min-h-0 flex items-start justify-between gap-2.5 overflow-hidden">
          {/* Left Dock */}
          <div className="max-h-full flex flex-col overflow-hidden shrink-0">
            <StationPopupCard />
            <PointInspectorCard />
          </div>

          {/* Center-Top Scientific Honesty Pill (Only shown on large screens when space permits) */}
          {showModelGrid && (
            <div className="pointer-events-none hidden 2xl:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/85 border border-slate-700/70 backdrop-blur-md text-[11px] text-slate-300 shadow-lg mx-auto shrink-0">
              <span className="inline-block w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>
                <strong>Lớp nền:</strong> Mô hình CAMS Global{' '}
                <code className="text-sky-300">0.4° (~40 km)</code> · Điểm tròn là{' '}
                <strong className="text-emerald-300">Trạm quan trắc thực tế</strong>
              </span>
            </div>
          )}

          {/* Right Dock */}
          <div className="max-h-full flex flex-col overflow-hidden shrink-0 ml-auto">
            <LayerSidebar />
          </div>
        </div>

        {/* Row 3: Bottom Interactive Timeline Bar & PM2.5 Concentration Color Scale Legend */}
        <TimelineBar />
      </div>

      {/* 3. Multi-Tab Analytics, Meteorology, Comparison, Alert & Audit Drawer */}
      <AnalyticsDrawer />

      {/* 4. RBAC Admin Control Center & Immutable Audit Trail Modal */}
      <AdminDashboardModal />
    </main>
  );
};

export default App;

