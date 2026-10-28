import React, { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { classifyPm25Level } from '@hanoi-pm25/shared';
import {
  HANOI_MAP_CENTER,
  VERIFIED_CAMS_MODEL_GRID_CELLS,
  VERIFIED_HANOI_STATIONS,
  VERIFIED_TIMELINE_SLOTS,
} from '../data/verifiedHanoiSnapshot.js';
import { HANOI_ADMIN_BOUNDARIES_GEOJSON } from '../data/hanoiAdminBoundariesGeoJson.js';
import { useWebGisStore } from '../store/useWebGisStore.js';
import { WindParticleOverlay } from './WindParticleOverlay.js';

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
    selectedStation,
    inspectedPoint,
    timelineIndex,
    selectStation,
    inspectMapCoordinate,
  } = useWebGisStore();

  const currentSlot = VERIFIED_TIMELINE_SLOTS[timelineIndex] ?? VERIFIED_TIMELINE_SLOTS[6];
  const timelineRatio = currentSlot.cityMeanModelPm25 / 42.7;

  const filteredStations = useMemo(() => {
    return VERIFIED_HANOI_STATIONS.filter((st) => {
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
  }, [stationFilter, searchQuery]);

  // Build dynamic GeoJSON for the ~40km CAMS Global model grid cells
  const modelGridGeoJson = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: VERIFIED_CAMS_MODEL_GRID_CELLS.map((cell) => {
        const [minLon, minLat, maxLon, maxLat] = cell.bounds;
        const scaledPm25 = Number((cell.pm25UgM3 * timelineRatio).toFixed(1));
        const classification = classifyPm25Level(scaledPm25);

        let fillColor = classification.colorHex;
        if (activeLayer === 'temperature') {
          fillColor = currentSlot.temperatureC >= 28 ? '#F97316' : '#38BDF8';
        } else if (activeLayer === 'humidity') {
          fillColor = currentSlot.humidityPct >= 75 ? '#3B82F6' : '#06B6D4';
        } else if (activeLayer === 'wind') {
          fillColor = '#22D3EE';
        } else if (activeLayer === 'precipitation') {
          fillColor = '#6366F1';
        }

        return {
          type: 'Feature' as const,
          properties: {
            cellCode: cell.cellCode,
            labelVi: cell.labelVi,
            pm25UgM3: scaledPm25,
            fillColor,
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [
              [
                [minLon, minLat],
                [maxLon, minLat],
                [maxLon, maxLat],
                [minLon, maxLat],
                [minLon, minLat],
              ],
            ],
          },
        };
      }),
    };
  }, [activeLayer, timelineRatio, currentSlot]);

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
      // 1. CAMS Global ~40km Model Grid Source & Layers
      map.addSource('cams-model-grid', {
        type: 'geojson',
        data: modelGridGeoJson,
      });

      map.addLayer({
        id: 'cams-model-grid-fill',
        type: 'fill',
        source: 'cams-model-grid',
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': modelGridOpacity,
        },
      });

      map.addLayer({
        id: 'cams-model-grid-outline',
        type: 'line',
        source: 'cams-model-grid',
        paint: {
          'line-color': '#94A3B8',
          'line-width': 1,
          'line-dasharray': [4, 4],
          'line-opacity': 0.55,
        },
      });

      // 2. Hanoi Administrative Boundaries Source & Layers
      map.addSource('hanoi-admin-boundaries', {
        type: 'geojson',
        data: HANOI_ADMIN_BOUNDARIES_GEOJSON,
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
            '#CBD5E1',
          ],
          'line-width': [
            'case',
            ['==', ['get', 'adminLevel'], 1],
            2.5,
            1.1,
          ],
          'line-opacity': 0.8,
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

  // Update Model Grid GeoJSON & Opacity when layer/timeline changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const src = map.getSource('cams-model-grid') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(modelGridGeoJson);
    }
    if (map.getLayer('cams-model-grid-fill')) {
      map.setLayoutProperty(
        'cams-model-grid-fill',
        'visibility',
        showModelGrid ? 'visible' : 'none'
      );
      map.setPaintProperty('cams-model-grid-fill', 'fill-opacity', modelGridOpacity);
    }
    if (map.getLayer('cams-model-grid-outline')) {
      map.setLayoutProperty(
        'cams-model-grid-outline',
        'visibility',
        showModelGrid ? 'visible' : 'none'
      );
    }
  }, [modelGridGeoJson, showModelGrid, modelGridOpacity]);

  // Update Administrative Boundaries visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (map.getLayer('hanoi-admin-line')) {
      map.setLayoutProperty(
        'hanoi-admin-line',
        'visibility',
        showAdminBoundaries ? 'visible' : 'none'
      );
    }
  }, [showAdminBoundaries]);

  // Render Station Markers
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
      el.className = 'station-marker-btn group relative flex items-center justify-center focus:outline-none';

      const isSelected = selectedStation?.id === st.id;
      const hasValue = st.latestPm25UgM3 !== null && !currentSlot.isForecast;
      const displayPm25 = hasValue
        ? Number(((st.latestPm25UgM3 ?? 0) * (currentSlot.isLive ? 1 : timelineRatio)).toFixed(1))
        : null;

      let badgeValueText = 'N/A';
      let bgColor = '#334155';
      let borderColor = '#64748B';

      if (displayPm25 !== null) {
        const cls = classifyPm25Level(displayPm25);
        bgColor = cls.colorHex;
        borderColor = isSelected ? '#FFFFFF' : '#0F172A';
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

      el.innerHTML = `
        <div class="relative flex flex-col items-center">
          ${
            isFresh && displayPm25 !== null
              ? `<span class="animate-ping absolute inline-flex h-9 w-9 rounded-full opacity-35" style="background-color: ${bgColor}"></span>`
              : ''
          }
          <div
            class="relative z-10 flex items-center justify-center min-w-[38px] h-9 px-2 rounded-full font-bold text-xs shadow-lg transition-transform duration-150 group-hover:scale-110 ${
              isSelected ? 'scale-125 ring-2 ring-sky-400' : ''
            }"
            style="
              background-color: ${bgColor};
              color: ${displayPm25 !== null && displayPm25 <= 50 ? '#0F172A' : '#FFFFFF'};
              border: 2px ${isStaleOrDelayed ? 'dashed #F59E0B' : `solid ${borderColor}`};
              opacity: ${st.freshnessStatus === 'UNAVAILABLE' ? '0.68' : '0.96'};
            "
            title="${st.name} (${st.freshnessStatus})"
          >
            ${badgeValueText}
          </div>
          <span class="mt-1 px-1.5 py-0.5 rounded bg-slate-950/85 border border-slate-700/70 text-[10px] font-medium text-slate-200 whitespace-nowrap shadow">
            ${st.name.length > 18 ? st.name.slice(0, 18) + '…' : st.name}
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
  }, [filteredStations, showStations, selectedStation, activeLayer, currentSlot, timelineRatio, selectStation]);

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
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Wind Streamline Particle Overlay (Meteorological aid for PM2.5 dispersion) */}
      <WindParticleOverlay
        enabled={showWindAnimation}
        windSpeedKmh={currentSlot.windSpeedKmh}
        windDirectionDeg={currentSlot.windDirectionDeg}
      />

      {/* Scientific Honesty Badge for CAMS Model Grid */}
      {showModelGrid && (
        <div className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-20 hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/85 border border-slate-700/70 backdrop-blur-md text-xs text-slate-300 shadow-lg">
          <span className="inline-block w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span>
            <strong>Lớp phủ nền:</strong> Mô hình CAMS Global (ECMWF) độ phân giải{' '}
            <code className="text-sky-300">0.4° × 0.4° (~40 km)</code> — Điểm tròn là{' '}
            <strong className="text-emerald-300">Trạm quan trắc mặt đất thực tế</strong>
          </span>
        </div>
      )}
    </div>
  );
};

