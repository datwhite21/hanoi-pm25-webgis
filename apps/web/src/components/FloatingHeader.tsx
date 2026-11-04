import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Wind,
} from 'lucide-react';
import { VERIFIED_TIMELINE_SLOTS } from '../data/verifiedHanoiSnapshot.js';
import { useWebGisStore, type UserRole } from '../store/useWebGisStore.js';

function formatVietnamNow(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  return `${map.hour}:${map.minute}:${map.second} (${map.day}/${map.month})`;
}

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
    showStations,
    toggleStations,
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

  // Real-time ticking Vietnam clock (Asia/Ho_Chi_Minh)
  const [liveClockText, setLiveClockText] = useState<string>(() =>
    formatVietnamNow(new Date())
  );

  // Live Open-Meteo Hanoi weather state
  const [liveWeather, setLiveWeather] = useState<{
    windSpeedKmh: number;
    temperatureC: number;
    humidityPct: number;
  } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveClockText(formatVietnamNow(new Date()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchLiveHanoiWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=Asia%2FHo_Chi_Minh'
        );
        if (!res.ok) return;
        const json = await res.json();
        if (mounted && json?.current) {
          setLiveWeather({
            windSpeedKmh: Number(
              (json.current.wind_speed_10m ?? 9.9).toFixed(1)
            ),
            temperatureC: Number(
              (json.current.temperature_2m ?? 27.5).toFixed(1)
            ),
            humidityPct: Math.round(json.current.relative_humidity_2m ?? 70),
          });
        }
      } catch {
        // Keep verified snapshot weather on offline fallback
      }
    };
    void fetchLiveHanoiWeather();
    const wxTimer = window.setInterval(fetchLiveHanoiWeather, 5 * 60 * 1000);
    return () => {
      mounted = false;
      window.clearInterval(wxTimer);
    };
  }, []);

  const currentSlot = VERIFIED_TIMELINE_SLOTS[timelineIndex] ?? VERIFIED_TIMELINE_SLOTS[6];
  const healthySourcesCount = dataSources.filter((s) => s.status === 'HEALTHY').length;
  const activeAlertsCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  const displayWindKmh =
    currentSlot.isLive && liveWeather ? liveWeather.windSpeedKmh : currentSlot.windSpeedKmh;
  const displayTempC =
    currentSlot.isLive && liveWeather ? liveWeather.temperatureC : currentSlot.temperatureC;
  const displayHumidityPct =
    currentSlot.isLive && liveWeather ? liveWeather.humidityPct : currentSlot.humidityPct;

  const matchingStations = searchQuery.trim()
    ? stations
        .filter(
          (s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.districtNameVi.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.administrativeAreaNameVi.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 6)
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
    <header className="relative z-30 w-full shrink-0 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
      {/* Left Brand + Search Box */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/92 border border-slate-700/75 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 text-slate-950 font-extrabold text-xs shadow">
            PM
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs md:text-sm font-extrabold tracking-tight text-white whitespace-nowrap">
                Hanoi PM2.5 GIS
              </h1>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                Near-Realtime
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden 2xl:block whitespace-nowrap">
              Giám sát, Phân tích & Cảnh báo Bụi mịn PM2.5 Thành phố Hà Nội
            </p>
          </div>
        </div>

        {/* Search Input with Station + Open-Meteo Geocoding Dropdown */}
        <div className="relative w-44 sm:w-52 lg:w-60">
          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-2xl bg-slate-900/92 border border-slate-700/75 backdrop-blur-md shadow-xl">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 180)}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm trạm, xã/phường, quận/huyện..."
              className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-400 focus:outline-none"
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
      <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
        {/* Exact Live Vietnam Clock & Real-Time Weather Quick Summary */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/92 border border-slate-700/75 backdrop-blur-md text-[11px] shadow-xl whitespace-nowrap">
          <div className="flex items-center gap-1 text-slate-200">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              <strong>
                {currentSlot.isLive
                  ? `${liveClockText} · HIỆN TẠI`
                  : `${currentSlot.dayLabelVi} ${currentSlot.hourLabel}`}
              </strong>
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1 text-slate-300">
            <Wind className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Gió <strong>{displayWindKmh} km/h</strong> · {displayTempC}°C · {displayHumidityPct}% RH
            </span>
          </div>
        </div>

        {/* 1-Click Show / Hide Stations Button */}
        <button
          type="button"
          onClick={toggleStations}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border backdrop-blur-md text-xs font-semibold shadow-xl transition whitespace-nowrap ${
            showStations
              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/50 text-emerald-200'
              : 'bg-slate-900/92 hover:bg-slate-800 border-slate-700/75 text-slate-300'
          }`}
          title={
            showStations
              ? 'Nhấn để ẩn toàn bộ các trạm quan trắc trên bản đồ (chỉ xem dải màu nền)'
              : 'Nhấn để hiển thị lại các trạm quan trắc trên bản đồ'
          }
        >
          {showStations ? (
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>{showStations ? 'Ẩn trạm' : 'Hiện trạm'}</span>
        </button>

        {/* Live Supabase PostGIS Sync Button */}
        <button
          type="button"
          onClick={() => syncWithPostgisBackend()}
          disabled={isSyncingBackend}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-slate-900/92 hover:bg-slate-800 border border-sky-500/40 backdrop-blur-md text-xs font-medium text-sky-200 shadow-xl transition whitespace-nowrap"
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
              ? `PostGIS (${stations.length})`
              : `Trạm HN (${stations.length})`}
          </span>
        </button>

        {/* Data Sources Status Button */}
        <button
          type="button"
          onClick={() => openDrawer('sources')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-slate-900/92 hover:bg-slate-800 border border-slate-700/75 backdrop-blur-md text-xs font-medium text-slate-200 shadow-xl transition whitespace-nowrap"
          title="Xem trạng thái kết nối các nguồn dữ liệu thực tế"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden xl:inline">Nguồn:</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[11px]">
            {healthySourcesCount}/{dataSources.length} OK
          </span>
        </button>

        {/* Alerts Button */}
        <button
          type="button"
          onClick={() => openDrawer('alerts')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-slate-900/92 hover:bg-slate-800 border border-amber-500/40 backdrop-blur-md text-xs font-medium text-amber-200 shadow-xl transition whitespace-nowrap"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Cảnh báo</span>
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[11px]">
            {activeAlertsCount}
          </span>
        </button>

        {/* Analytics & Comparison Drawer Button */}
        <button
          type="button"
          onClick={() => openDrawer('timeseries')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-bold text-xs shadow-xl transition whitespace-nowrap"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Phân tích & So sánh</span>
        </button>

        {/* Role Switcher (Guest / User / Admin) + Admin Control Center Trigger */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-2xl bg-slate-900/92 border border-slate-700/75 backdrop-blur-md text-xs shadow-xl whitespace-nowrap">
          {userRole === 'ADMIN' ? (
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400 ml-0.5" />
          ) : userRole === 'USER' ? (
            <UserCheck className="w-3.5 h-3.5 text-sky-400 ml-0.5" />
          ) : (
            <Activity className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          )}
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as UserRole)}
            aria-label="Chọn vai trò người dùng"
            className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-0.5"
          >
            <option value="GUEST" className="bg-slate-900 text-slate-200">
              Khách
            </option>
            <option value="USER" className="bg-slate-900 text-sky-300">
              Người dùng
            </option>
            <option value="ADMIN" className="bg-slate-900 text-purple-300">
              Quản trị
            </option>
          </select>

          <button
            type="button"
            onClick={openAdminModal}
            className={`ml-0.5 px-2 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
              userRole === 'ADMIN'
                ? 'bg-purple-500 text-slate-950 shadow'
                : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40'
            }`}
            title="Mở Trung tâm Quản trị RBAC & Nhật ký kiểm toán (audit_logs)"
          >
            <span>RBAC</span>
            <span className="px-1 rounded bg-slate-950/30 text-[10px]">
              {adminAuditLogs.length}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
