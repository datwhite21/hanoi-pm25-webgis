import { create } from 'zustand';
import type {
  ActiveMapLayer,
  ArbitraryPointInspection,
  DataFreshnessStatus,
  MonitoringStation,
} from '@hanoi-pm25/shared';
import {
  VERIFIED_HANOI_STATIONS,
  VERIFIED_TIMELINE_SLOTS,
  inspectArbitraryHanoiPoint,
} from '../data/verifiedHanoiSnapshot.js';

export type StationFilterMode = 'ALL' | DataFreshnessStatus;
export type DrawerTab = 'timeseries' | 'meteorology' | 'compare' | 'alerts' | 'sources';
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

  selectedStation: MonitoringStation | null;
  inspectedPoint: ArbitraryPointInspection | null;

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
  clearInspection: () => void;

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

  selectedStation: VERIFIED_HANOI_STATIONS[0],
  inspectedPoint: null,

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
  toggleWindAnimation: () => set((s) => ({ showWindAnimation: !s.showWindAnimation })),
  toggleAdminBoundaries: () => set((s) => ({ showAdminBoundaries: !s.showAdminBoundaries })),
  setModelGridOpacity: (opacity) => set({ modelGridOpacity: opacity }),
  setStationFilter: (filter) => set({ stationFilter: filter }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  selectStation: (station) =>
    set({
      selectedStation: station,
      inspectedPoint: null,
    }),

  inspectMapCoordinate: (lat, lon) => {
    const inspection = inspectArbitraryHanoiPoint(lat, lon);
    set({
      inspectedPoint: inspection,
      selectedStation: null,
    });
  },

  clearInspection: () => set({ inspectedPoint: null }),

  setTimelineIndex: (index) => {
    const clamped = Math.max(0, Math.min(VERIFIED_TIMELINE_SLOTS.length - 1, index));
    set({ timelineIndex: clamped });
  },

  stepTimeline: (delta) => {
    const current = get().timelineIndex;
    const next = (current + delta + VERIFIED_TIMELINE_SLOTS.length) % VERIFIED_TIMELINE_SLOTS.length;
    set({ timelineIndex: next });
  },

  togglePlayTimeline: () => set((s) => ({ isPlayingTimeline: !s.isPlayingTimeline })),

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
        return { comparedStationIds: s.comparedStationIds.filter((id) => id !== stationId) };
      }
      if (s.comparedStationIds.length >= 4) {
        return { comparedStationIds: [...s.comparedStationIds.slice(1), stationId] };
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

