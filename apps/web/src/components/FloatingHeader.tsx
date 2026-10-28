import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Wind,
} from 'lucide-react';
import { VERIFIED_TIMELINE_SLOTS } from '../data/verifiedHanoiSnapshot.js';
import { useWebGisStore, type UserRole } from '../store/useWebGisStore.js';

export const FloatingHeader: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    stations,
    alerts,
    dataSources,
    backendConnected,
    isSyncingBackend,
    lastSyncedAtLocal,
    syncWithPostgisBackend,
    selectStation,
    inspectMapCoordinate,
    timelineIndex,
    openDrawer,
    userRole,
    setUserRole,
    openAdminModal,
    adminAuditLogs,
  } = useWebGisStore();

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [geocodingResults, setGeocodingResults] = useState<
    Array<{ id: number; name: string; latitude: number; longitude: number; admin1?: string }>
  >([]);

  const currentSlot = VERIFIED_TIMELINE_SLOTS[timelineIndex] ?? VERIFIED_TIMELINE_SLOTS[6];
  const healthySourcesCount = dataSources.filter((s) => s.status === 'HEALTHY').length;
  const activeAlertsCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  const matchingStations = searchQuery.trim()
    ? stations.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.districtNameVi.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.administrativeAreaNameVi.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    if (value.trim().length < 2) {
      setGeocodingResults([]);
      return;
    }
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          value.trim()
        )}&count=4&language=vi&format=json`
      );
      if (res.ok) {
        const json = await res.json();
        setGeocodingResults(json.results ?? []);
      }
    } catch {
      // Ignore network errors on live geocoding fallback
    }
  };

  return (
    <header className="fixed top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
      {/* Left Brand + Search Box */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/70 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 text-slate-950 font-extrabold shadow">
            PM
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm md:text-base font-extrabold tracking-tight text-white">
                Hanoi PM2.5 GIS
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Near-Realtime
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Giám sát, Phân tích & Cảnh báo Bụi mịn PM2.5 Thành phố Hà Nội
            </p>
          </div>
        </div>

        {/* Search Input with Station + Open-Meteo Geocoding Dropdown */}
        <div className="relative w-56 sm:w-72">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/70 backdrop-blur-md shadow-xl">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 180)}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm trạm, xã/phường, quận/huyện..."
              className="w-full bg-transparent text-xs md:text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setGeocodingResults([]);
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {isSearchFocused && (matchingStations.length > 0 || geocodingResults.length > 0) && (
            <div className="absolute left-0 right-0 mt-1.5 rounded-2xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-lg shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              {matchingStations.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Trạm quan trắc tại Hà Nội
                  </div>
                  {matchingStations.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onMouseDown={() => selectStation(st)}
                      className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-800/80 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-100">{st.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {st.administrativeAreaNameVi}, {st.districtNameVi}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-emerald-300">
                        {st.latestPm25UgM3 !== null ? `${st.latestPm25UgM3} µg/m³` : 'Lịch sử'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {geocodingResults.length > 0 && (
                <div className="p-2 border-t border-slate-800">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                    Địa điểm (Open-Meteo Geocoding)
                  </div>
                  {geocodingResults.map((geo) => (
                    <button
                      key={geo.id}
                      type="button"
                      onMouseDown={() => inspectMapCoordinate(geo.latitude, geo.longitude)}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-200 font-medium">
                        {geo.name} {geo.admin1 ? `(${geo.admin1})` : ''}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {geo.latitude.toFixed(3)}, {geo.longitude.toFixed(3)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Status Pills + Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
        {/* Measurement Timestamp & Weather Quick Summary */}
        <div className="hidden xl:flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/70 backdrop-blur-md text-xs shadow-xl">
          <div className="flex items-center gap-1.5 text-slate-200">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Đo mới nhất: <strong>{currentSlot.hourLabel}</strong> ({currentSlot.dayLabelVi})
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Wind className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Gió ĐN <strong>{currentSlot.windSpeedKmh} km/h</strong> · {currentSlot.temperatureC}°C ·{' '}
              {currentSlot.humidityPct}% RH
            </span>
          </div>
        </div>

        {/* Live Supabase PostGIS Sync Button */}
        <button
          type="button"
          onClick={() => syncWithPostgisBackend()}
          disabled={isSyncingBackend}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-sky-500/40 backdrop-blur-md text-xs font-medium text-sky-200 shadow-xl transition"
          title={
            lastSyncedAtLocal
              ? `Đồng bộ PostGIS lần cuối lúc ${lastSyncedAtLocal}`
              : 'Đồng bộ trực tiếp với cơ sở dữ liệu Supabase PostGIS'
          }
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-sky-400 ${
              isSyncingBackend ? 'animate-spin' : ''
            }`}
          />
          <span className="hidden md:inline">
            {backendConnected
              ? `PostGIS Live (${stations.length} trạm)`
              : `Trạm Hà Nội (${stations.length})`}
          </span>
        </button>

        {/* Data Sources Status Button */}
        <button
          type="button"
          onClick={() => openDrawer('sources')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 backdrop-blur-md text-xs font-medium text-slate-200 shadow-xl transition"
          title="Xem trạng thái kết nối các nguồn dữ liệu thực tế"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Nguồn dữ liệu:</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
            {healthySourcesCount}/{dataSources.length} OK
          </span>
        </button>

        {/* Alerts Button */}
        <button
          type="button"
          onClick={() => openDrawer('alerts')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 backdrop-blur-md text-xs font-medium text-amber-200 shadow-xl transition"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Cảnh báo</span>
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold">
            {activeAlertsCount}
          </span>
        </button>

        {/* Analytics & Comparison Drawer Button */}
        <button
          type="button"
          onClick={() => openDrawer('timeseries')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-bold text-xs shadow-xl transition"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Phân tích & So sánh</span>
        </button>

        {/* Role Switcher (Guest / User / Admin) + Admin Control Center Trigger */}
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-700/70 backdrop-blur-md text-xs shadow-xl">
          {userRole === 'ADMIN' ? (
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400 ml-1" />
          ) : userRole === 'USER' ? (
            <UserCheck className="w-3.5 h-3.5 text-sky-400 ml-1" />
          ) : (
            <Activity className="w-3.5 h-3.5 text-slate-400 ml-1" />
          )}
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as UserRole)}
            aria-label="Chọn vai trò người dùng"
            className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1"
          >
            <option value="GUEST" className="bg-slate-900 text-slate-200">
              Vai trò: Khách
            </option>
            <option value="USER" className="bg-slate-900 text-sky-300">
              Người dùng ĐK
            </option>
            <option value="ADMIN" className="bg-slate-900 text-purple-300">
              Quản trị viên
            </option>
          </select>

          <button
            type="button"
            onClick={openAdminModal}
            className={`ml-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
              userRole === 'ADMIN'
                ? 'bg-purple-500 text-slate-950 shadow'
                : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40'
            }`}
            title="Mở Trung tâm Quản trị RBAC & Nhật ký kiểm toán (audit_logs)"
          >
            <span>Quản trị RBAC</span>
            <span className="px-1 rounded bg-slate-950/30 text-[10px]">
              {adminAuditLogs.length}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

