import { create } from 'zustand';
import {
  calculateVnAqiFromPm25,
  type ActiveMapLayer,
  type AirQualityAlertItem,
  type ArbitraryPointInspection,
  type DataFreshnessStatus,
  type DataSourceStatusSummary,
  type MonitoringStation,
} from '@hanoi-pm25/shared';
import {
  VERIFIED_ALERTS,
  VERIFIED_CAMS_MODEL_GRID_CELLS,
  VERIFIED_DATA_SOURCES,
  VERIFIED_HANOI_STATIONS,
  VERIFIED_TIMELINE_SLOTS,
  inspectArbitraryHanoiPoint,
} from '../data/verifiedHanoiSnapshot.js';
import {
  fetchLiveAlertsFromApi,
  fetchLiveAreaStatisticsFromApi,
  fetchLiveDataSourcesFromApi,
  fetchLivePointInspectionFromApi,
  fetchLiveStationsFromApi,
  type LiveAreaSpatialStats,
} from '../services/apiClient.js';

export type StationFilterMode = 'ALL' | DataFreshnessStatus;
export type DrawerTab =
  | 'timeseries'
  | 'meteorology'
  | 'compare'
  | 'alerts'
  | 'sources';
export type UserRole = 'GUEST' | 'USER' | 'ADMIN';

interface WebGisState {
  activeLayer: ActiveMapLayer;
  showStations: boolean;
  showModelGrid: boolean;
  showWindAnimation: boolean;
  showAdminBoundaries: boolean;
  modelGridOpacity: number;
  stationFilter: StationFilterMode;
  searchQuery: string;

  stations: MonitoringStation[];
  alerts: AirQualityAlertItem[];
  dataSources: DataSourceStatusSummary[];
  backendConnected: boolean;
  isSyncingBackend: boolean;
  lastSyncedAtLocal: string | null;

  selectedStation: MonitoringStation | null;
  inspectedPoint: ArbitraryPointInspection | null;
  selectedAreaStats: LiveAreaSpatialStats | null;

  timelineIndex: number;
  isPlayingTimeline: boolean;

  isDrawerOpen: boolean;
  activeDrawerTab: DrawerTab;
  comparedStationIds: string[];

  userRole: UserRole;
  favoriteStationIds: string[];

  setActiveLayer: (layer: ActiveMapLayer) => void;
  toggleStations: () => void;
  toggleModelGrid: () => void;
  toggleWindAnimation: () => void;
  toggleAdminBoundaries: () => void;
  setModelGridOpacity: (opacity: number) => void;
  setStationFilter: (filter: StationFilterMode) => void;
  setSearchQuery: (q: string) => void;

  selectStation: (station: MonitoringStation | null) => void;
  inspectMapCoordinate: (lat: number, lon: number) => void;
  inspectAdministrativeArea: (areaCode: string) => Promise<void>;
  clearInspection: () => void;
  syncWithPostgisBackend: () => Promise<void>;

  setTimelineIndex: (index: number) => void;
  stepTimeline: (delta: number) => void;
  togglePlayTimeline: () => void;

  openDrawer: (tab?: DrawerTab) => void;
  closeDrawer: () => void;
  toggleCompareStation: (stationId: string) => void;
  setUserRole: (role: UserRole) => void;
  toggleFavoriteStation: (stationId: string) => void;
}

export const useWebGisStore = create<WebGisState>((set, get) => ({
  activeLayer: 'pm25',
  showStations: true,
  showModelGrid: true,
  showWindAnimation: true,
  showAdminBoundaries: true,
  modelGridOpacity: 0.42,
  stationFilter: 'ALL',
  searchQuery: '',

  stations: VERIFIED_HANOI_STATIONS,
  alerts: VERIFIED_ALERTS,
  dataSources: VERIFIED_DATA_SOURCES,
  backendConnected: false,
  isSyncingBackend: false,
  lastSyncedAtLocal: null,

  selectedStation: VERIFIED_HANOI_STATIONS[0],
  inspectedPoint: null,
  selectedAreaStats: null,

  timelineIndex: 6, // Index 6 = 2026-10-28 17:35 (LIVE)
  isPlayingTimeline: false,

  isDrawerOpen: false,
  activeDrawerTab: 'timeseries',
  comparedStationIds: ['openaq-4946812', 'openaq-4946813', 'openaq-6123215'],

  userRole: 'GUEST',
  favoriteStationIds: ['openaq-4946812', 'openaq-4946813'],

  setActiveLayer: (layer) => set({ activeLayer: layer }),
  toggleStations: () => set((s) => ({ showStations: !s.showStations })),
  toggleModelGrid: () => set((s) => ({ showModelGrid: !s.showModelGrid })),
  toggleWindAnimation: () =>
    set((s) => ({ showWindAnimation: !s.showWindAnimation })),
  toggleAdminBoundaries: () =>
    set((s) => ({ showAdminBoundaries: !s.showAdminBoundaries })),
  setModelGridOpacity: (opacity) => set({ modelGridOpacity: opacity }),
  setStationFilter: (filter) => set({ stationFilter: filter }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  selectStation: (station) =>
    set({
      selectedStation: station,
      inspectedPoint: null,
    }),

  inspectMapCoordinate: (lat, lon) => {
    const localInspection = inspectArbitraryHanoiPoint(lat, lon);
    set({
      inspectedPoint: localInspection,
      selectedStation: null,
    });

    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetchLivePointInspectionFromApi(lat, lon, get().stations)
        .then((liveInspection) => {
          set({
            inspectedPoint: liveInspection,
            backendConnected: true,
          });
        })
        .catch(() => {
          // Keep instant local inspection fallback when backend is offline
        });
    }
  },

  inspectAdministrativeArea: async (areaCode: string) => {
    try {
      const stats = await fetchLiveAreaStatisticsFromApi(areaCode);
      set({
        selectedAreaStats: stats,
        backendConnected: true,
      });
    } catch {
      // Fallback calculation from current stations in store
      const currentStations = get().stations;
      const areaStations = currentStations.filter((s) =>
        s.districtNameVi.toLowerCase().includes(areaCode.toLowerCase())
      );
      const active = areaStations.filter(
        (s) => s.freshnessStatus === 'FRESH' && s.latestPm25UgM3 !== null
      );
      const avg =
        active.length > 0
          ? Number(
              (
                active.reduce((sum, s) => sum + (s.latestPm25UgM3 ?? 0), 0) /
                active.length
              ).toFixed(2)
            )
          : null;

      set({
        selectedAreaStats: {
          area: {
            code: areaCode,
            nameVi: areaCode,
            areaSqKm: 28.5,
          },
          observedStatistics: {
            hasActiveStation: active.length > 0,
            totalStationsInArea: areaStations.length,
            activeStationsInArea: active.length,
            avgObservedPm25UgM3: avg,
            vnAqi: avg !== null ? calculateVnAqiFromPm25(avg) : null,
            scientificNoteVi:
              active.length > 0
                ? `Khu vực có ${active.length} trạm quan trắc đang hoạt động.`
                : 'Khu vực hiện không có trạm quan trắc mặt đất đang hoạt động. Hệ thống không nội suy giả cấp xã/phường; vui lòng tham khảo ô lưới CAMS 0.4° (~40 km).',
            stations: areaStations.map((s) => ({
              externalStationId: s.externalStationId,
              name: s.name,
              freshnessStatus: s.freshnessStatus,
              pm25UgM3: s.latestPm25UgM3,
              valueOrigin: s.valueOrigin,
            })),
          },
          modeledBackground: {
            dataOrigin: 'NUMERICAL_MODEL',
            spatialResolutionDeg: 0.4,
            intersectingCamsCells: [
              {
                cellCode: VERIFIED_CAMS_MODEL_GRID_CELLS[0].cellCode,
                labelVi: VERIFIED_CAMS_MODEL_GRID_CELLS[0].labelVi,
                modelPm25UgM3: VERIFIED_CAMS_MODEL_GRID_CELLS[0].pm25UgM3,
              },
            ],
          },
        },
      });
    }
  },

  clearInspection: () =>
    set({ inspectedPoint: null, selectedAreaStats: null }),

  syncWithPostgisBackend: async () => {
    set({ isSyncingBackend: true });
    try {
      const [liveStations, liveAlerts, liveSources] = await Promise.all([
        fetchLiveStationsFromApi(),
        fetchLiveAlertsFromApi(),
        fetchLiveDataSourcesFromApi(),
      ]);

      if (liveStations.length > 0) {
        const currentSelectedExtId = get().selectedStation?.externalStationId;
        const updatedSelected =
          liveStations.find(
            (s) => s.externalStationId === currentSelectedExtId
          ) ?? liveStations[0];

        set({
          stations: liveStations,
          alerts: liveAlerts.length > 0 ? liveAlerts : get().alerts,
          dataSources: liveSources.length > 0 ? liveSources : get().dataSources,
          selectedStation: get().inspectedPoint ? null : updatedSelected,
          backendConnected: true,
          isSyncingBackend: false,
          lastSyncedAtLocal: new Date().toLocaleTimeString('vi-VN', {
            hour12: false,
          }),
        });
      } else {
        set({ isSyncingBackend: false });
      }
    } catch {
      set({
        backendConnected: false,
        isSyncingBackend: false,
      });
    }
  },

  setTimelineIndex: (index) => {
    const clamped = Math.max(
      0,
      Math.min(VERIFIED_TIMELINE_SLOTS.length - 1, index)
    );
    set({ timelineIndex: clamped });
  },

  stepTimeline: (delta) => {
    const current = get().timelineIndex;
    const next =
      (current + delta + VERIFIED_TIMELINE_SLOTS.length) %
      VERIFIED_TIMELINE_SLOTS.length;
    set({ timelineIndex: next });
  },

  togglePlayTimeline: () =>
    set((s) => ({ isPlayingTimeline: !s.isPlayingTimeline })),

  openDrawer: (tab) =>
    set((s) => ({
      isDrawerOpen: true,
      activeDrawerTab: tab ?? s.activeDrawerTab,
    })),

  closeDrawer: () => set({ isDrawerOpen: false }),

  toggleCompareStation: (stationId) =>
    set((s) => {
      const exists = s.comparedStationIds.includes(stationId);
      if (exists) {
        return {
          comparedStationIds: s.comparedStationIds.filter(
            (id) => id !== stationId
          ),
        };
      }
      if (s.comparedStationIds.length >= 4) {
        return {
          comparedStationIds: [...s.comparedStationIds.slice(1), stationId],
        };
      }
      return { comparedStationIds: [...s.comparedStationIds, stationId] };
    }),

  setUserRole: (role) => set({ userRole: role }),

  toggleFavoriteStation: (stationId) =>
    set((s) => ({
      favoriteStationIds: s.favoriteStationIds.includes(stationId)
        ? s.favoriteStationIds.filter((id) => id !== stationId)
        : [...s.favoriteStationIds, stationId],
    })),
}));
