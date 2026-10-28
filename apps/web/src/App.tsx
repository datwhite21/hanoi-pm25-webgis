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

  useEffect(() => {
    syncWithPostgisBackend();
  }, [syncWithPostgisBackend]);

  return (
    <main className="relative w-screen h-screen overflow-hidden select-none bg-slate-950 text-slate-100">
      {/* 1. Fullscreen Interactive MapLibre GL JS Map */}
      <MapCanvas />

      {/* 2. Floating Glassmorphism Header (Search, Live Timestamp, Source Health, Role Switcher) */}
      <FloatingHeader />

      {/* 3. Windy-style Floating Right Sidebar (PM2.5 Default Layer, GIS Toggles, Station Filter) */}
      <LayerSidebar />

      {/* 4. Station Detail Popup Card (Left Panel on Desktop / Bottom Sheet on Mobile) */}
      <StationPopupCard />

      {/* 5. Arbitrary Coordinate Spatial Inspector Card (PostGIS Nearest Station + CAMS 40km Cell) */}
      <PointInspectorCard />

      {/* 6. Bottom Interactive Timeline Bar & PM2.5 Concentration Color Scale Legend */}
      <TimelineBar />

      {/* 7. Multi-Tab Analytics, Meteorology, Comparison, Alert & Audit Drawer */}
      <AnalyticsDrawer />

      {/* 8. RBAC Admin Control Center & Immutable Audit Trail Modal */}
      <AdminDashboardModal />
    </main>
  );
};

export default App;

