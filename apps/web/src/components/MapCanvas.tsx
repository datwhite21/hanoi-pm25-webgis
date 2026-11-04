import React, { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  calculateVnAqiFromPm25,
  type ActiveMapLayer,
} from '@hanoi-pm25/shared';
import {
  HANOI_MAP_CENTER,
  VERIFIED_CAMS_MODEL_GRID_CELLS,
  VERIFIED_TIMELINE_SLOTS,
  type TimelineSlot,
} from '../data/verifiedHanoiSnapshot.js';
import { HANOI_ADMIN_BOUNDARIES_GEOJSON } from '../data/hanoiAdminBoundariesGeoJson.js';
import { useWebGisStore } from '../store/useWebGisStore.js';
import { WindParticleOverlay } from './WindParticleOverlay.js';

export interface LayerVisualStyle {
  value: number;
  badgeText: string;
  bgColor: string;
  textColor: string;
  glowColor: string;
  fillOpacity: number;
}

function getWindArrow(deg: number): string {
  // Meteorological wind direction is where wind blows FROM; arrow shows where air moves TO
  const toDeg = (deg + 180) % 360;
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  return arrows[Math.round(toDeg / 45) % 8];
}

/**
 * Computes the continuous value, color, opacity, and badge label for ANY of the 7 layers
 * at a given coordinate (lat, lon) so that:
 * 1) Low values are soft/light and high values are vivid/deep,
 * 2) Color is 100% value-driven and zoom-invariant (never turns uniformly green when zooming in),
 * 3) All 7 layer buttons (PM2.5, PM10, VN_AQI, Wind, Temperature, Humidity, Precipitation)
 *    dynamically transform both the map surface and the station badges.
 */
export function computeLayerStyleAtCoordinate(
  layer: ActiveMapLayer,
  lat: number,
  lon: number,
  localPm25: number,
  slot: TimelineSlot,
  explicitPm10?: number | null,
  explicitVnAqi?: number | null
): LayerVisualStyle {
  // Distance from Hanoi inner-city core (Hoan Kiem / Ba Dinh ~ 21.0285, 105.8412)
  const dLat = lat - 21.0285;
  const dLon = lon - 105.8412;
  const distFromCoreDeg = Math.sqrt(dLat * dLat + dLon * dLon);
  const urbanCoreFactor = Math.max(0, 1 - distFromCoreDeg / 0.28); // 1 in inner city, 0 in outer rural
  const riverCorridorFactor = Math.exp(-Math.pow((lon - 105.87 - (21.03 - lat) * 0.45) / 0.08, 2));

  if (layer === 'pm25') {
    const v = Math.max(0, Number(localPm25.toFixed(1)));
    if (v <= 18) {
      return {
        value: v,
        badgeText: `${v}`,
        bgColor: '#6EE7B7',
        textColor: '#064E3B',
        glowColor: 'rgba(110, 231, 183, 0.45)',
        fillOpacity: 0.24,
      };
    }
    if (v <= 26) {
      return {
        value: v,
        badgeText: `${v}`,
        bgColor: '#34D399',
        textColor: '#064E3B',
        glowColor: 'rgba(52, 211, 153, 0.5)',
        fillOpacity: 0.30,
      };
    }
    if (v <= 36) {
      return {
        value: v,
        badgeText: `${v}`,
        bgColor: '#FDE047',
        textColor: '#1E293B',
        glowColor: 'rgba(253, 224, 71, 0.52)',
        fillOpacity: 0.38,
      };
    }
    if (v <= 43) {
      return {
        value: v,
        badgeText: `${v}`,
        bgColor: '#FACC15',
        textColor: '#0F172A',
        glowColor: 'rgba(250, 204, 21, 0.6)',
        fillOpacity: 0.46,
      };
    }
    if (v <= 50) {
      return {
        value: v,
        badgeText: `${v}`,
        bgColor: '#F59E0B',
        textColor: '#0F172A',
        glowColor: 'rgba(245, 158, 11, 0.68)',
        fillOpacity: 0.55,
      };
    }
    if (v <= 80) {
      return {
        value: v,
        badgeText: `${v}`,
        bgColor: '#F97316',
        textColor: '#FFFFFF',
        glowColor: 'rgba(249, 115, 22, 0.75)',
        fillOpacity: 0.64,
      };
    }
    if (v <= 150) {
      return {
        value: v,
        badgeText: `${v}`,
        bgColor: '#EF4444',
        textColor: '#FFFFFF',
        glowColor: 'rgba(239, 68, 68, 0.82)',
        fillOpacity: 0.72,
      };
    }
    return {
      value: v,
      badgeText: `${v}`,
      bgColor: '#A855F7',
      textColor: '#FFFFFF',
      glowColor: 'rgba(168, 85, 247, 0.85)',
      fillOpacity: 0.78,
    };
  }

  if (layer === 'pm10') {
    const pm10Val =
      explicitPm10 !== undefined && explicitPm10 !== null
        ? Number(explicitPm10.toFixed(1))
        : Number((localPm25 * 1.19 + urbanCoreFactor * 3.2).toFixed(1));
    if (pm10Val <= 35) {
      return {
        value: pm10Val,
        badgeText: `${Math.round(pm10Val)}`,
        bgColor: '#6EE7B7',
        textColor: '#064E3B',
        glowColor: 'rgba(110, 231, 183, 0.45)',
        fillOpacity: 0.26,
      };
    }
    if (pm10Val <= 46) {
      return {
        value: pm10Val,
        badgeText: `${Math.round(pm10Val)}`,
        bgColor: '#BEF264',
        textColor: '#1E293B',
        glowColor: 'rgba(190, 242, 100, 0.52)',
        fillOpacity: 0.36,
      };
    }
    if (pm10Val <= 54) {
      return {
        value: pm10Val,
        badgeText: `${Math.round(pm10Val)}`,
        bgColor: '#FACC15',
        textColor: '#0F172A',
        glowColor: 'rgba(250, 204, 21, 0.6)',
        fillOpacity: 0.46,
      };
    }
    if (pm10Val <= 68) {
      return {
        value: pm10Val,
        badgeText: `${Math.round(pm10Val)}`,
        bgColor: '#F59E0B',
        textColor: '#0F172A',
        glowColor: 'rgba(245, 158, 11, 0.68)',
        fillOpacity: 0.56,
      };
    }
    return {
      value: pm10Val,
      badgeText: `${Math.round(pm10Val)}`,
      bgColor: '#EA580C',
      textColor: '#FFFFFF',
      glowColor: 'rgba(234, 88, 12, 0.78)',
      fillOpacity: 0.66,
    };
  }

  if (layer === 'aqi') {
    const aqiVal =
      explicitVnAqi !== undefined && explicitVnAqi !== null
        ? Math.round(explicitVnAqi)
        : calculateVnAqiFromPm25(localPm25);
    if (aqiVal <= 50) {
      return {
        value: aqiVal,
        badgeText: `${aqiVal}`,
        bgColor: '#34D399',
        textColor: '#064E3B',
        glowColor: 'rgba(52, 211, 153, 0.5)',
        fillOpacity: 0.30,
      };
    }
    if (aqiVal <= 78) {
      return {
        value: aqiVal,
        badgeText: `${aqiVal}`,
        bgColor: '#FDE047',
        textColor: '#0F172A',
        glowColor: 'rgba(253, 224, 71, 0.55)',
        fillOpacity: 0.42,
      };
    }
    if (aqiVal <= 100) {
      return {
        value: aqiVal,
        badgeText: `${aqiVal}`,
        bgColor: '#F59E0B',
        textColor: '#0F172A',
        glowColor: 'rgba(245, 158, 11, 0.65)',
        fillOpacity: 0.54,
      };
    }
    if (aqiVal <= 150) {
      return {
        value: aqiVal,
        badgeText: `${aqiVal}`,
        bgColor: '#F97316',
        textColor: '#FFFFFF',
        glowColor: 'rgba(249, 115, 22, 0.75)',
        fillOpacity: 0.64,
      };
    }
    return {
      value: aqiVal,
      badgeText: `${aqiVal}`,
      bgColor: '#EF4444',
      textColor: '#FFFFFF',
      glowColor: 'rgba(239, 68, 68, 0.82)',
      fillOpacity: 0.74,
    };
  }

  if (layer === 'wind') {
    // Urban canopy slows down surface wind in dense core; Red River & open plains channel stronger wind
    const windFactor = 1.0 - urbanCoreFactor * 0.24 + riverCorridorFactor * 0.22 + (lat - 21.0) * 0.18;
    const localWind = Math.max(2.2, Number((slot.windSpeedKmh * windFactor).toFixed(1)));
    const arrow = getWindArrow(slot.windDirectionDeg);
    if (localWind <= 6.5) {
      return {
        value: localWind,
        badgeText: `${localWind}${arrow}`,
        bgColor: '#7DD3FC', // Calm air (low dispersion)
        textColor: '#082F49',
        glowColor: 'rgba(125, 211, 252, 0.5)',
        fillOpacity: 0.28,
      };
    }
    if (localWind <= 9.0) {
      return {
        value: localWind,
        badgeText: `${localWind}${arrow}`,
        bgColor: '#22D3EE', // Gentle breeze
        textColor: '#083344',
        glowColor: 'rgba(34, 211, 238, 0.55)',
        fillOpacity: 0.40,
      };
    }
    if (localWind <= 11.5) {
      return {
        value: localWind,
        badgeText: `${localWind}${arrow}`,
        bgColor: '#34D399', // Moderate ventilation corridor
        textColor: '#064E3B',
        glowColor: 'rgba(52, 211, 153, 0.6)',
        fillOpacity: 0.50,
      };
    }
    return {
      value: localWind,
      badgeText: `${localWind}${arrow}`,
      bgColor: '#FACC15', // Strong dispersing wind
      textColor: '#0F172A',
      glowColor: 'rgba(250, 204, 21, 0.68)',
      fillOpacity: 0.60,
    };
  }

  if (layer === 'temperature') {
    // Urban Heat Island (UHI): inner Hanoi is +1.5°C warmer than Ba Vi / Soc Son mountains
    const uhiDelta = urbanCoreFactor * 1.45 - Math.max(0, 105.62 - lon) * 2.2 - Math.max(0, lat - 21.18) * 1.6;
    const localTemp = Number((slot.temperatureC + uhiDelta).toFixed(1));
    if (localTemp <= 24.5) {
      return {
        value: localTemp,
        badgeText: `${localTemp}°`,
        bgColor: '#38BDF8',
        textColor: '#082F49',
        glowColor: 'rgba(56, 189, 248, 0.5)',
        fillOpacity: 0.30,
      };
    }
    if (localTemp <= 26.5) {
      return {
        value: localTemp,
        badgeText: `${localTemp}°`,
        bgColor: '#34D399',
        textColor: '#064E3B',
        glowColor: 'rgba(52, 211, 153, 0.52)',
        fillOpacity: 0.38,
      };
    }
    if (localTemp <= 27.6) {
      return {
        value: localTemp,
        badgeText: `${localTemp}°`,
        bgColor: '#FDE047',
        textColor: '#0F172A',
        glowColor: 'rgba(253, 224, 71, 0.58)',
        fillOpacity: 0.46,
      };
    }
    if (localTemp <= 28.4) {
      return {
        value: localTemp,
        badgeText: `${localTemp}°`,
        bgColor: '#FB923C',
        textColor: '#0F172A',
        glowColor: 'rgba(251, 146, 60, 0.65)',
        fillOpacity: 0.55,
      };
    }
    return {
      value: localTemp,
      badgeText: `${localTemp}°`,
      bgColor: '#F43F5E',
      textColor: '#FFFFFF',
      glowColor: 'rgba(244, 63, 94, 0.75)',
      fillOpacity: 0.64,
    };
  }

  if (layer === 'humidity') {
    // Higher relative humidity along Red River, lakes, and southern lowlands; drier in concrete core
    const humDelta = riverCorridorFactor * 5.5 - urbanCoreFactor * 3.2 + (21.0 - lat) * 6.5;
    const localHum = Math.min(96, Math.max(45, Math.round(slot.humidityPct + humDelta)));
    if (localHum <= 65) {
      return {
        value: localHum,
        badgeText: `${localHum}%`,
        bgColor: '#67E8F9',
        textColor: '#083344',
        glowColor: 'rgba(103, 232, 249, 0.48)',
        fillOpacity: 0.28,
      };
    }
    if (localHum <= 72) {
      return {
        value: localHum,
        badgeText: `${localHum}%`,
        bgColor: '#38BDF8',
        textColor: '#082F49',
        glowColor: 'rgba(56, 189, 248, 0.55)',
        fillOpacity: 0.40,
      };
    }
    if (localHum <= 78) {
      return {
        value: localHum,
        badgeText: `${localHum}%`,
        bgColor: '#3B82F6',
        textColor: '#FFFFFF',
        glowColor: 'rgba(59, 130, 246, 0.65)',
        fillOpacity: 0.52,
      };
    }
    return {
      value: localHum,
      badgeText: `${localHum}%`,
      bgColor: '#6366F1',
      textColor: '#FFFFFF',
      glowColor: 'rgba(99, 102, 241, 0.75)',
      fillOpacity: 0.64,
    };
  }

  // layer === 'precipitation' (Wet scavenging potential & localized rain bands)
  const baseRain = slot.precipitationMm ?? 0;
  const orographicWave =
    Math.max(0, Math.sin((lat - 20.65) * 9.5) * Math.cos((lon - 105.55) * 8.0)) * 1.4 +
    riverCorridorFactor * 0.65;
  const localRain = Number(Math.max(0, baseRain + orographicWave).toFixed(1));
  if (localRain <= 0.4) {
    return {
      value: localRain,
      badgeText: `${localRain}mm`,
      bgColor: '#7DD3FC',
      textColor: '#082F49',
      glowColor: 'rgba(125, 211, 252, 0.42)',
      fillOpacity: 0.22,
    };
  }
  if (localRain <= 1.2) {
    return {
      value: localRain,
      badgeText: `${localRain}mm`,
      bgColor: '#38BDF8',
      textColor: '#082F49',
      glowColor: 'rgba(56, 189, 248, 0.55)',
      fillOpacity: 0.38,
    };
  }
  if (localRain <= 2.2) {
    return {
      value: localRain,
      badgeText: `${localRain}mm`,
      bgColor: '#2563EB',
      textColor: '#FFFFFF',
      glowColor: 'rgba(37, 99, 235, 0.68)',
      fillOpacity: 0.52,
    };
  }
  return {
    value: localRain,
    badgeText: `${localRain}mm`,
    bgColor: '#7C3AED',
    textColor: '#FFFFFF',
    glowColor: 'rgba(124, 58, 237, 0.78)',
    fillOpacity: 0.65,
  };
}

// Outer polygon of Hanoi (from HANOI_ADMIN_BOUNDARIES_GEOJSON level 1) for point-in-polygon check
const HANOI_OUTER_RING: Array<[number, number]> = [
  [105.28, 21.08],
  [105.36, 21.25],
  [105.72, 21.38],
  [105.91, 21.35],
  [106.02, 21.05],
  [105.94, 20.82],
  [105.8, 20.56],
  [105.62, 20.6],
  [105.42, 20.82],
  [105.28, 21.08],
];

function isPointInsidePolygon(lon: number, lat: number, ring: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export const MapCanvas: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const inspectMarkerRef = useRef<maplibregl.Marker | null>(null);

  const {
    activeLayer,
    showStations,
    showModelGrid,
    showWindAnimation,
    showAdminBoundaries,
    modelGridOpacity,
    stationFilter,
    searchQuery,
    stations,
    selectedStation,
    inspectedPoint,
    timelineIndex,
    selectStation,
    inspectMapCoordinate,
  } = useWebGisStore();

  const currentSlot = VERIFIED_TIMELINE_SLOTS[timelineIndex] ?? VERIFIED_TIMELINE_SLOTS[6];
  const timelineRatio = currentSlot.cityMeanModelPm25 / 42.7;

  const filteredStations = useMemo(() => {
    return stations.filter((st) => {
      if (stationFilter === 'ACTIVE_ONLY') {
        if (st.freshnessStatus === 'UNAVAILABLE' || st.latestPm25UgM3 === null) {
          return false;
        }
      } else if (stationFilter !== 'ALL' && st.freshnessStatus !== stationFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          st.name.toLowerCase().includes(q) ||
          st.districtNameVi.toLowerCase().includes(q) ||
          st.administrativeAreaNameVi.toLowerCase().includes(q) ||
          st.providerName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stations, stationFilter, searchQuery]);

  /**
   * Build a zoom-invariant, value-driven continuous spatial gradient field across Hanoi.
   * Unlike MapLibre's `heatmap` (which computes color from screen-space point density and turns
   * uniformly green when zooming in), each node here carries its exact physical `fillColor` and
   * `fillOpacity` for the active layer (`pm25`, `pm10`, `aqi`, `wind`, `temperature`, `humidity`, `precipitation`)
   * and is rendered with an exponential base-2 geographic radius + `circle-blur: 0.92`.
   */
  const gradientFieldGeoJson = useMemo(() => {
    const features: Array<{
      type: 'Feature';
      properties: {
        fillColor: string;
        fillOpacity: number;
        layerValue: number;
      };
      geometry: { type: 'Point'; coordinates: [number, number] };
    }> = [];

    const activeStationsWithVal = stations.filter(
      (s) => s.latestPm25UgM3 !== null && s.freshnessStatus !== 'UNAVAILABLE'
    );

    // Generate a dense smooth lattice of points inside Hanoi's boundary (~4.5 km spacing)
    for (let lat = 20.58; lat <= 21.37; lat += 0.042) {
      for (let lon = 105.30; lon <= 106.01; lon += 0.042) {
        if (!isPointInsidePolygon(lon, lat, HANOI_OUTER_RING)) {
          continue;
        }

        // Inverse-distance blend of CAMS background cells + nearby real stations
        let num = 0;
        let den = 0;

        for (const cell of VERIFIED_CAMS_MODEL_GRID_CELLS) {
          const d2 =
            (lat - cell.centerLat) * (lat - cell.centerLat) +
            (lon - cell.centerLon) * (lon - cell.centerLon) +
            0.008;
          const w = 1 / d2;
          num += cell.pm25UgM3 * timelineRatio * w;
          den += w;
        }

        for (const st of activeStationsWithVal) {
          const d2 =
            (lat - st.latitude) * (lat - st.latitude) +
            (lon - st.longitude) * (lon - st.longitude) +
            0.0022;
          const w = 2.1 / d2;
          num += (st.latestPm25UgM3 ?? 38) * timelineRatio * w;
          den += w;
        }

        const localPm25 = den > 0 ? num / den : 36 * timelineRatio;
        const style = computeLayerStyleAtCoordinate(
          activeLayer,
          lat,
          lon,
          localPm25,
          currentSlot
        );

        features.push({
          type: 'Feature',
          properties: {
            fillColor: style.bgColor,
            fillOpacity: Number((style.fillOpacity * 0.52).toFixed(3)),
            layerValue: style.value,
          },
          geometry: {
            type: 'Point',
            coordinates: [Number(lon.toFixed(4)), Number(lat.toFixed(4))],
          },
        });
      }
    }

    // Add real station hotspots directly so local peaks glow with their exact station color at all zoom levels
    for (const st of activeStationsWithVal) {
      const stPm25 = (st.latestPm25UgM3 ?? 38) * timelineRatio;
      const style = computeLayerStyleAtCoordinate(
        activeLayer,
        st.latitude,
        st.longitude,
        stPm25,
        currentSlot,
        st.latestPm10UgM3,
        st.computedVnAqi
      );
      features.push({
        type: 'Feature',
        properties: {
          fillColor: style.bgColor,
          fillOpacity: Number((style.fillOpacity * 0.65).toFixed(3)),
          layerValue: style.value,
        },
        geometry: {
          type: 'Point',
          coordinates: [st.longitude, st.latitude],
        },
      });
    }

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [stations, timelineRatio, activeLayer, currentSlot]);

  // Initialize MapLibre GL JS Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [HANOI_MAP_CENTER.longitude, HANOI_MAP_CENTER.latitude],
      zoom: HANOI_MAP_CENTER.zoom,
      minZoom: 7.5,
      maxZoom: 17,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-left');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'Hanoi PM2.5 GIS | OpenAQ v3 | Open-Meteo CAMS (~40km) | PostGIS',
      }),
      'bottom-left'
    );

    map.on('load', () => {
      // 1. Zoom-Invariant, Value-Driven Continuous Color Field (Never turns uniformly green on zoom!)
      map.addSource('cams-gradient-field', {
        type: 'geojson',
        data: gradientFieldGeoJson,
      });

      map.addLayer({
        id: 'pollution-gradient-surface',
        type: 'circle',
        source: 'cams-gradient-field',
        paint: {
          'circle-color': ['get', 'fillColor'],
          'circle-blur': 0.92,
          // Base-2 exponential interpolation keeps geographic radius (~4.8 km) 100% constant across all zoom levels!
          'circle-radius': [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            7,
            13,
            8,
            26,
            9,
            52,
            10,
            104,
            11,
            208,
            12,
            416,
            13,
            832,
            14,
            1664,
            15,
            2800,
          ],
          'circle-opacity': [
            '*',
            ['get', 'fillOpacity'],
            Math.min(1.35, Math.max(0.25, modelGridOpacity * 1.65)),
          ],
        },
      });

      // 2. Hanoi Administrative Boundaries Source & Subtle Glow Layers
      map.addSource('hanoi-admin-boundaries', {
        type: 'geojson',
        data: HANOI_ADMIN_BOUNDARIES_GEOJSON,
      });

      map.addLayer({
        id: 'hanoi-admin-glow',
        type: 'line',
        source: 'hanoi-admin-boundaries',
        paint: {
          'line-color': '#38BDF8',
          'line-width': ['case', ['==', ['get', 'adminLevel'], 1], 5, 1.5],
          'line-blur': 3,
          'line-opacity': ['case', ['==', ['get', 'adminLevel'], 1], 0.35, 0.12],
        },
      });

      map.addLayer({
        id: 'hanoi-admin-line',
        type: 'line',
        source: 'hanoi-admin-boundaries',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'adminLevel'], 1],
            '#38BDF8',
            '#94A3B8',
          ],
          'line-width': [
            'case',
            ['==', ['get', 'adminLevel'], 1],
            1.8,
            0.8,
          ],
          'line-dasharray': [2, 2],
          'line-opacity': 0.65,
        },
      });

      // 3. Nearest Station Connection Line for Arbitrary Point Inspector
      map.addSource('inspector-nearest-line', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      map.addLayer({
        id: 'inspector-nearest-line-layer',
        type: 'line',
        source: 'inspector-nearest-line',
        paint: {
          'line-color': '#38BDF8',
          'line-width': 2.5,
          'line-dasharray': [2, 2],
        },
      });
    });

    // Click on map canvas to inspect arbitrary location
    map.on('click', (e) => {
      const target = e.originalEvent.target as HTMLElement | null;
      if (target && target.closest('.station-marker-btn')) {
        return;
      }
      inspectMapCoordinate(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Continuous Gradient Field & Opacity when layer/timeline changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const src = map.getSource('cams-gradient-field') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(gradientFieldGeoJson);
    }
    if (map.getLayer('pollution-gradient-surface')) {
      map.setLayoutProperty(
        'pollution-gradient-surface',
        'visibility',
        showModelGrid ? 'visible' : 'none'
      );
      map.setPaintProperty('pollution-gradient-surface', 'circle-opacity', [
        '*',
        ['get', 'fillOpacity'],
        Math.min(1.35, Math.max(0.25, modelGridOpacity * 1.65)),
      ]);
    }
  }, [gradientFieldGeoJson, showModelGrid, modelGridOpacity]);

  // Update Administrative Boundaries visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const vis = showAdminBoundaries ? 'visible' : 'none';
    if (map.getLayer('hanoi-admin-line')) {
      map.setLayoutProperty('hanoi-admin-line', 'visibility', vis);
    }
    if (map.getLayer('hanoi-admin-glow')) {
      map.setLayoutProperty('hanoi-admin-glow', 'visibility', vis);
    }
  }, [showAdminBoundaries]);

  // Render Station Markers with Active Layer Value & Continuous Color Intensity
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const m of markersRef.current) {
      m.remove();
    }
    markersRef.current = [];

    if (!showStations) return;

    const isWeatherLayer =
      activeLayer === 'wind' ||
      activeLayer === 'temperature' ||
      activeLayer === 'humidity' ||
      activeLayer === 'precipitation';

    for (const st of filteredStations) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className =
        'station-marker-btn group flex items-center justify-center w-9 h-9 focus:outline-none cursor-pointer';

      const isSelected = selectedStation?.id === st.id;
      const hasPollutionValue = st.latestPm25UgM3 !== null && !currentSlot.isForecast;
      const displayPm25 = hasPollutionValue
        ? Number(((st.latestPm25UgM3 ?? 0) * (currentSlot.isLive ? 1 : timelineRatio)).toFixed(1))
        : null;

      let badgeValueText = 'N/A';
      let bgColor = 'rgba(30, 41, 59, 0.72)';
      let textColor = '#94A3B8';
      let borderColor = 'rgba(100, 116, 139, 0.55)';
      let glowCss = 'none';

      // Weather layers can be evaluated at every station coordinate; pollution layers require valid station PM2.5
      if (displayPm25 !== null || isWeatherLayer) {
        const layerStyle = computeLayerStyleAtCoordinate(
          activeLayer,
          st.latitude,
          st.longitude,
          displayPm25 ?? 38.0,
          currentSlot,
          st.latestPm10UgM3,
          st.computedVnAqi ?? st.rawAqiSubindex
        );
        badgeValueText = layerStyle.badgeText;
        bgColor = layerStyle.bgColor;
        textColor = layerStyle.textColor;
        borderColor = isSelected ? '#FFFFFF' : 'rgba(15, 23, 42, 0.85)';
        glowCss = `0 0 16px ${layerStyle.glowColor}`;
      }

      const isFresh = st.freshnessStatus === 'FRESH';
      const isStaleOrDelayed =
        st.freshnessStatus === 'STALE' || st.freshnessStatus === 'DELAYED';
      const isOffline = st.freshnessStatus === 'UNAVAILABLE' && !isWeatherLayer;

      el.innerHTML = `
        <div class="relative flex items-center justify-center w-9 h-9">
          ${
            (isFresh && displayPm25 !== null) || isWeatherLayer
              ? `<span class="animate-ping absolute inline-flex h-8 w-8 rounded-full opacity-30" style="background-color: ${bgColor}"></span>`
              : ''
          }
          <div
            class="relative z-10 flex items-center justify-center ${
              isOffline ? 'w-7 h-7 text-[10px]' : 'min-w-[36px] h-8 px-1.5 text-[11px]'
            } rounded-full font-extrabold transition-all duration-150 group-hover:scale-115 ${
              isSelected ? 'scale-125 ring-2 ring-sky-300 z-30' : ''
            }"
            style="
              background-color: ${bgColor};
              color: ${textColor};
              border: ${isOffline ? '1px' : '2px'} ${
                isStaleOrDelayed ? 'dashed #F59E0B' : `solid ${borderColor}`
              };
              box-shadow: ${glowCss};
              opacity: ${isOffline ? '0.48' : '0.96'};
            "
            title="${st.name} (${st.freshnessStatus})"
          >
            ${badgeValueText}
          </div>
          <span class="pointer-events-none absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-950/92 border border-slate-700/80 text-[10px] font-semibold text-slate-100 whitespace-nowrap shadow-xl transition-opacity duration-150 ${
            isSelected ? 'opacity-100 z-30' : 'opacity-0 group-hover:opacity-100 z-20'
          }">
            ${st.name}
          </span>
        </div>
      `;

      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        selectStation(st);
        map.flyTo({
          center: [st.longitude, st.latitude],
          zoom: Math.max(map.getZoom(), 11.5),
          duration: 650,
        });
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([st.longitude, st.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    }
  }, [
    filteredStations,
    showStations,
    selectedStation,
    activeLayer,
    currentSlot,
    timelineRatio,
    selectStation,
  ]);

  // Render Arbitrary Point Inspection Marker & Dashed Line to Nearest Active Station
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (inspectMarkerRef.current) {
      inspectMarkerRef.current.remove();
      inspectMarkerRef.current = null;
    }

    const lineSource = map.isStyleLoaded()
      ? (map.getSource('inspector-nearest-line') as maplibregl.GeoJSONSource | undefined)
      : undefined;

    if (!inspectedPoint) {
      if (lineSource) {
        lineSource.setData({ type: 'FeatureCollection', features: [] });
      }
      return;
    }

    const pinEl = document.createElement('div');
    pinEl.className =
      'w-5 h-5 rounded-full bg-sky-400 border-2 border-white shadow-lg ring-4 ring-sky-400/40';
    inspectMarkerRef.current = new maplibregl.Marker({ element: pinEl, anchor: 'center' })
      .setLngLat([inspectedPoint.longitude, inspectedPoint.latitude])
      .addTo(map);

    if (lineSource && inspectedPoint.nearestActiveStation) {
      const targetSt = inspectedPoint.nearestActiveStation.station;
      lineSource.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [inspectedPoint.longitude, inspectedPoint.latitude],
                [targetSt.longitude, targetSt.latitude],
              ],
            },
          },
        ],
      });
    }
  }, [inspectedPoint]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 z-0">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Wind Streamline Particle Overlay (Meteorological aid for PM2.5 dispersion) */}
      <WindParticleOverlay
        enabled={showWindAnimation || activeLayer === 'wind'}
        windSpeedKmh={currentSlot.windSpeedKmh}
        windDirectionDeg={currentSlot.windDirectionDeg}
      />
    </div>
  );
};
