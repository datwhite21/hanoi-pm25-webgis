import React, { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  HANOI_MAP_CENTER,
  VERIFIED_CAMS_MODEL_GRID_CELLS,
  VERIFIED_TIMELINE_SLOTS,
} from '../data/verifiedHanoiSnapshot.js';
import { HANOI_ADMIN_BOUNDARIES_GEOJSON } from '../data/hanoiAdminBoundariesGeoJson.js';
import { useWebGisStore } from '../store/useWebGisStore.js';
import { WindParticleOverlay } from './WindParticleOverlay.js';

/**
 * Computes a continuous color & intensity style for PM2.5 (ug/m3) so that
 * lower concentrations look lighter/softer and higher concentrations look deeper/more vivid.
 */
function getContinuousPm25Style(pm25: number): {
  bgColor: string;
  textColor: string;
  glowColor: string;
} {
  const v = Math.max(0, pm25);
  if (v <= 15) {
    return {
      bgColor: '#6EE7B7', // Light soft mint-emerald
      textColor: '#064E3B',
      glowColor: 'rgba(110, 231, 183, 0.45)',
    };
  }
  if (v <= 25) {
    return {
      bgColor: '#34D399', // Fresh emerald
      textColor: '#064E3B',
      glowColor: 'rgba(52, 211, 153, 0.5)',
    };
  }
  if (v <= 36) {
    return {
      bgColor: '#FDE047', // Light pale yellow (e.g. 33.6 ug/m3)
      textColor: '#1E293B',
      glowColor: 'rgba(253, 224, 71, 0.5)',
    };
  }
  if (v <= 43) {
    return {
      bgColor: '#FACC15', // Warm golden yellow (e.g. 40.4 ug/m3)
      textColor: '#0F172A',
      glowColor: 'rgba(250, 204, 21, 0.55)',
    };
  }
  if (v <= 50) {
    return {
      bgColor: '#F59E0B', // Deep amber-orange (e.g. 44.3 - 49.4 ug/m3)
      textColor: '#0F172A',
      glowColor: 'rgba(245, 158, 11, 0.65)',
    };
  }
  if (v <= 80) {
    return {
      bgColor: '#F97316', // Vivid orange (50 - 80 ug/m3, exceeds QCVN)
      textColor: '#FFFFFF',
      glowColor: 'rgba(249, 115, 22, 0.72)',
    };
  }
  if (v <= 150) {
    return {
      bgColor: '#EF4444', // Deep crimson red (80 - 150 ug/m3)
      textColor: '#FFFFFF',
      glowColor: 'rgba(239, 68, 68, 0.8)',
    };
  }
  return {
    bgColor: '#A855F7', // Purple (> 150 ug/m3)
    textColor: '#FFFFFF',
    glowColor: 'rgba(168, 85, 247, 0.85)',
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
      if (stationFilter !== 'ALL' && st.freshnessStatus !== stationFilter) {
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
   * Build a smooth continuous spatial gradient point field across Hanoi
   * (instead of blocky rectangular polygons) so MapLibre's WebGL heatmap
   * renders a smooth Windy.com-style color gradient where low values are light/translucent
   * and higher values are warmer/more intense.
   */
  const gradientFieldGeoJson = useMemo(() => {
    const features: Array<{
      type: 'Feature';
      properties: { weight: number; pm25UgM3: number };
      geometry: { type: 'Point'; coordinates: [number, number] };
    }> = [];

    const activeStationsWithVal = stations.filter(
      (s) => s.latestPm25UgM3 !== null && s.freshnessStatus !== 'UNAVAILABLE'
    );

    // Generate a dense smooth lattice of points inside Hanoi's boundary
    for (let lat = 20.58; lat <= 21.37; lat += 0.048) {
      for (let lon = 105.30; lon <= 106.01; lon += 0.048) {
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
            0.0025;
          const w = 1.8 / d2;
          num += (st.latestPm25UgM3 ?? 38) * timelineRatio * w;
          den += w;
        }

        const localPm25 = den > 0 ? num / den : 36 * timelineRatio;

        // Normalize weight so lower values (15-30 ug/m3) produce a light, soft tint
        // and higher values (45-75+ ug/m3) produce a vivid, intense gradient
        const normalizedWeight = Math.max(
          0.08,
          Math.min(1.0, (localPm25 - 12) / 58)
        );

        features.push({
          type: 'Feature',
          properties: {
            weight: Number(normalizedWeight.toFixed(3)),
            pm25UgM3: Number(localPm25.toFixed(1)),
          },
          geometry: {
            type: 'Point',
            coordinates: [Number(lon.toFixed(4)), Number(lat.toFixed(4))],
          },
        });
      }
    }

    // Add real station hotspots directly so local peaks (e.g. Gia Lam / Giai Phong) glow accurately
    for (const st of activeStationsWithVal) {
      const stPm25 = (st.latestPm25UgM3 ?? 38) * timelineRatio;
      const w = Math.max(0.12, Math.min(1.0, (stPm25 - 10) / 52));
      features.push({
        type: 'Feature',
        properties: {
          weight: Number(w.toFixed(3)),
          pm25UgM3: Number(stPm25.toFixed(1)),
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
  }, [stations, timelineRatio]);

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
      // 1. Continuous Smooth Gradient Surface (Replaces blocky rectangular CAMS boxes)
      map.addSource('cams-gradient-field', {
        type: 'geojson',
        data: gradientFieldGeoJson,
      });

      map.addLayer({
        id: 'pollution-gradient-surface',
        type: 'heatmap',
        source: 'cams-gradient-field',
        maxzoom: 16,
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7,
            0.55,
            9,
            0.78,
            11,
            1.05,
            14,
            1.25,
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7,
            26,
            8.5,
            44,
            10,
            68,
            11.5,
            110,
            13,
            160,
            15,
            220,
          ],
          // Smooth multi-stop color ramp: low density = very soft light mint/yellow, high = vivid orange/red/purple
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(16, 185, 129, 0)',
            0.12,
            'rgba(110, 231, 183, 0.16)', // Very light soft mint (Low index)
            0.28,
            'rgba(52, 211, 153, 0.30)',  // Soft emerald-green
            0.45,
            'rgba(253, 224, 71, 0.44)',  // Light lemon yellow (Moderate-low ~30-35 ug/m3)
            0.62,
            'rgba(250, 204, 21, 0.58)',  // Warm golden yellow (~38-44 ug/m3)
            0.78,
            'rgba(249, 115, 22, 0.72)',  // Vivid orange (~48-65 ug/m3, e.g. Gia Lam / Giai Phong)
            0.92,
            'rgba(239, 68, 68, 0.84)',   // Deep crimson red (Unhealthy)
            1.0,
            'rgba(168, 85, 247, 0.90)',  // Purple (Very unhealthy)
          ],
          'heatmap-opacity': Math.min(0.88, Math.max(0.15, modelGridOpacity * 1.45)),
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
      map.setPaintProperty(
        'pollution-gradient-surface',
        'heatmap-opacity',
        Math.min(0.92, Math.max(0.15, modelGridOpacity * 1.45))
      );
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

  // Render Station Markers with Continuous Color Intensity & Hover/Selected Labels
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const m of markersRef.current) {
      m.remove();
    }
    markersRef.current = [];

    if (!showStations) return;

    for (const st of filteredStations) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className =
        'station-marker-btn group flex items-center justify-center w-9 h-9 focus:outline-none cursor-pointer';

      const isSelected = selectedStation?.id === st.id;
      const hasValue = st.latestPm25UgM3 !== null && !currentSlot.isForecast;
      const displayPm25 = hasValue
        ? Number(((st.latestPm25UgM3 ?? 0) * (currentSlot.isLive ? 1 : timelineRatio)).toFixed(1))
        : null;

      let badgeValueText = 'N/A';
      let bgColor = 'rgba(30, 41, 59, 0.72)';
      let textColor = '#94A3B8';
      let borderColor = 'rgba(100, 116, 139, 0.55)';
      let glowCss = 'none';

      if (displayPm25 !== null) {
        const contStyle = getContinuousPm25Style(displayPm25);
        bgColor = contStyle.bgColor;
        textColor = contStyle.textColor;
        borderColor = isSelected ? '#FFFFFF' : 'rgba(15, 23, 42, 0.85)';
        glowCss = `0 0 16px ${contStyle.glowColor}`;

        if (activeLayer === 'pm25') {
          badgeValueText = `${displayPm25}`;
        } else if (activeLayer === 'pm10') {
          badgeValueText = `${st.latestPm10UgM3 ?? Math.round(displayPm25 * 1.18)}`;
        } else if (activeLayer === 'aqi') {
          badgeValueText = `${st.computedVnAqi ?? st.rawAqiSubindex ?? '--'}`;
        } else {
          badgeValueText = `${displayPm25}`;
        }
      }

      const isFresh = st.freshnessStatus === 'FRESH';
      const isStaleOrDelayed =
        st.freshnessStatus === 'STALE' || st.freshnessStatus === 'DELAYED';
      const isOffline = st.freshnessStatus === 'UNAVAILABLE';

      el.innerHTML = `
        <div class="relative flex items-center justify-center w-9 h-9">
          ${
            isFresh && displayPm25 !== null
              ? `<span class="animate-ping absolute inline-flex h-8 w-8 rounded-full opacity-30" style="background-color: ${bgColor}"></span>`
              : ''
          }
          <div
            class="relative z-10 flex items-center justify-center ${
              isOffline ? 'w-7 h-7 text-[10px]' : 'min-w-[34px] h-8 px-1.5 text-[11px]'
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
        enabled={showWindAnimation}
        windSpeedKmh={currentSlot.windSpeedKmh}
        windDirectionDeg={currentSlot.windDirectionDeg}
      />
    </div>
  );
};
