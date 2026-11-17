import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { scenarioByProvince } from '../../features/mini-game/scenarios';
import * as maplibregl from 'maplibre-gl';
import maplibreglWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useAppStore } from '../../stores/appStore';
import { VIETNAM_MARITIME_TERRITORIES } from '../../data/vietnamMaritimeSovereignty';
import { LandmarkVisualCard } from './LandmarkVisualCard';
import { fetchProvince, identifyProvince } from '../../api/geographicApi';
import { provinceSlugFromProperties, provinceSlugFromTerritory, provinceSourceName } from '../../data/provinceRegistry';
import {
  Compass,
  Sun,
  Moon,
  Eye,
  Sparkles,
  Box,
  X,
  LoaderCircle,
  Shuffle,
} from 'lucide-react';

// Configure Web Worker URL for MapLibre GL JS under Vite
if (typeof window !== 'undefined' && maplibregl.config) {
  maplibregl.config.WORKER_URL = maplibreglWorkerUrl;
}

interface MapViewerProps {
  className?: string;
}

interface SelectedProvinceInfo {
  name: string;
  adminUnit: string;
  isSovereignty: boolean;
  culturalLandmark?: string;
  culturalSummary?: string;
  culturalCategoryLabel?: string;
  historicalPeriod?: string;
  description?: string;
}

interface GeographicFeedback {
  kind: 'loading' | 'success' | 'empty' | 'error';
  message: string;
}

const SUCCESS_FEEDBACK_DURATION_MS = 3500;

const MAP_STYLES = {
  voyager: {
    id: 'voyager',
    name: 'Địa lý tự nhiên',
    icon: Sun,
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  positron: {
    id: 'positron',
    name: 'Sáng tối giản',
    icon: Eye,
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  dark: {
    id: 'dark',
    name: 'Đêm sang trọng',
    icon: Moon,
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
};

export const MapViewer: React.FC<MapViewerProps> = ({ className = 'h-[620px] w-full' }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const sovereigntyMarkersRef = useRef<maplibregl.Marker[]>([]);
  const geographicRequestRef = useRef<AbortController | null>(null);

  const { currentProvince, mapCenter, mapZoom, setMapCenter, setMapZoom, setCurrentProvince } = useAppStore();
  const [geographicFeedback, setGeographicFeedback] = useState<GeographicFeedback | null>(null);
  const [activeStyleKey, setActiveStyleKey] = useState<keyof typeof MAP_STYLES>('voyager');
  const [is3DView, setIs3DView] = useState(false);
  const [selectedProvinceInfo, setSelectedProvinceInfo] = useState<SelectedProvinceInfo | null>(null);

  const selectProvince = async (
    props: Record<string, unknown> | null,
    point?: maplibregl.LngLat | { lng: number; lat: number }
  ) => {
    geographicRequestRef.current?.abort();
    const controller = new AbortController();
    geographicRequestRef.current = controller;
    setGeographicFeedback({ kind: 'loading', message: 'Đang xác định địa phương…' });
    setCurrentProvince(null);
    setSelectedProvinceInfo(null);
    const slug = props ? provinceSlugFromProperties(props) : null;
    const isDisplayOnly = props?.is_sovereignty === true || props?.is_sovereignty === 'true';
    try {
      const province = point && !isDisplayOnly
        ? await identifyProvince(point.lat, point.lng, controller.signal)
        : slug ? await fetchProvince(slug, controller.signal) : null;
      if (controller.signal.aborted) return;
      if (!province) {
        if (props && !point && !slug) throw new Error('Unmapped map feature');
        setGeographicFeedback({ kind: 'empty', message: 'Không có địa phương trong vùng dữ liệu tại vị trí này.' });
        return;
      }
      setCurrentProvince(province.slug);
      setGeographicFeedback({ kind: 'success', message: `Đã chọn ${province.name}` });
      // Retain existing cultural preview only when it belongs to the identified province.
      const preview = props && slug === province.slug ? props : {};
      const text = (key: string) => typeof preview[key] === 'string' ? preview[key] as string : undefined;
      setSelectedProvinceInfo({
        name: isDisplayOnly ? text('name_vi') ?? province.name : province.name,
        adminUnit: province.adminUnit,
        isSovereignty: isDisplayOnly,
        culturalLandmark: text('cultural_landmark'),
        culturalSummary: text('cultural_summary'),
        culturalCategoryLabel: text('cultural_category_label'),
        historicalPeriod: text('historical_period'),
      });
    } catch {
      if (controller.signal.aborted) return;
      setGeographicFeedback({ kind: 'error', message: 'Không thể tải địa phương. Hãy kiểm tra kết nối API rồi chọn lại.' });
    }
  };

  const selectProvinceRef = useRef(selectProvince);
  selectProvinceRef.current = selectProvince;

  useEffect(() => {
    if (geographicFeedback?.kind !== 'success') return;

    const timer = window.setTimeout(() => {
      setGeographicFeedback(current => current === geographicFeedback ? null : current);
    }, SUCCESS_FEEDBACK_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [geographicFeedback]);

  // Helper to add 63 Vietnam Provinces & 2 Archipelagoes GeoJSON layers
  const addProvincesGeoJsonLayer = (map: maplibregl.Map) => {
    sanitizeBasemapLabels(map);
    if (map.getSource('vietnam-provinces')) return;

    map.addSource('vietnam-provinces', {
      type: 'geojson',
      data: '/data/vietnam_provinces.geojson',
      generateId: true,
    });

    // 1. Province Fills (Distinct colorful mosaic across all 63 provinces + 2 archipelagoes)
    map.addLayer({
      id: 'provinces-fill',
      type: 'fill',
      source: 'vietnam-provinces',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.85,
          ['==', ['get', 'is_sovereignty'], true],
          0.80,
          0.45,
        ],
      },
    });

    // 2. Crisp Provincial Borders
    map.addLayer({
      id: 'provinces-borders',
      type: 'line',
      source: 'vietnam-provinces',
      paint: {
        'line-color': [
          'case',
          ['==', ['get', 'is_sovereignty'], true],
          '#ef4444',
          ['boolean', ['feature-state', 'hover'], false],
          '#f59e0b',
          '#1e293b',
        ],
        'line-width': [
          'case',
          ['==', ['get', 'is_sovereignty'], true],
          3.0,
          ['boolean', ['feature-state', 'hover'], false],
          2.5,
          1.2,
        ],
        'line-opacity': 0.95,
      },
    });

    // Selected province follows the canonical slug shared with other modules.
    map.addLayer({
      id: 'selected-province-border',
      type: 'line',
      source: 'vietnam-provinces',
      filter: ['==', ['get', 'Name'], provinceSourceName(useAppStore.getState().currentProvince)],
      paint: { 'line-color': '#fbbf24', 'line-width': 4 },
    });

    map.addLayer({
      id: 'sovereignty-dashed-borders',
      type: 'line',
      source: 'vietnam-provinces',
      filter: ['==', ['get', 'is_sovereignty'], true],
      paint: {
        'line-color': '#f59e0b',
        'line-width': 2.5,
        'line-dasharray': [3, 2],
      },
    });

    // 4. Fixed Single-Point Province & Archipelago Labels (Exactly 1 clean label per province, zero repeating duplicates)
    if (!map.getSource('vietnam-province-labels')) {
      map.addSource('vietnam-province-labels', {
        type: 'geojson',
        data: '/data/vietnam_province_labels.geojson',
      });
    }

    map.addLayer({
      id: 'provinces-labels',
      type: 'symbol',
      source: 'vietnam-province-labels',
      filter: ['!=', ['get', 'is_sovereignty'], true],
      layout: {
        'text-field': ['get', 'name_vi'],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 7.5,
          5, 8.5,
          6, 10.0,
          7, 11.5,
          8, 13.0,
          10, 15.0,
        ],
        'text-font': ['Open Sans Bold', 'Noto Sans Regular'],
        'text-max-width': 4.5, // Tự động ngắt dòng thông minh để nằm gọn gàng bên trong tỉnh
        'text-justify': 'center',
        'text-anchor': 'center',
        'symbol-placement': 'point',
        'text-line-height': 1.1,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': [
          'case',
          ['==', ['get', 'is_sovereignty'], true],
          '#fef08a', // Hoàng Sa & Trường Sa nổi bật
          '#ffffff', // 100% chữ trắng tinh khôi cho toàn bộ 63 tỉnh/thành phố
        ],
        'text-halo-color': '#020617',
        'text-halo-width': 2.0,
        'text-halo-blur': 0.5,
      },
    });
  };

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[activeStyleKey].url,
      center: mapCenter,
      zoom: mapZoom,
      minZoom: 3.5,
      maxZoom: 18,
      renderWorldCopies: false,
      attributionControl: false,
      scrollZoom: true,
      dragPan: true,
      doubleClickZoom: true,
      touchZoomRotate: true,
    });

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'Vietnam Cultural Atlas &copy; CARTO &copy; OpenStreetMap &copy; PostGIS',
      }),
      'bottom-right'
    );
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');

    map.on('moveend', () => {
      const center = map.getCenter();
      setMapCenter([center.lng, center.lat]);
      setMapZoom(map.getZoom());
    });

    let currentHoveredId: number | string | null = null;

    map.on('load', () => {
      map.resize();
      addProvincesGeoJsonLayer(map);
      renderSovereigntyOverlays(map);

      // Setup Province Hover Interaction (STABLE: no text jumping / jittering)
      map.on('mousemove', 'provinces-fill', (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const newId = feature.id ?? null;

        // CRUCIAL FIX: Short-circuit if mouse moves within the same province
        // Prevents 60fps re-rendering and animation jittering
        if (newId === currentHoveredId) return;

        if (currentHoveredId !== null) {
          map.setFeatureState(
            { source: 'vietnam-provinces', id: currentHoveredId },
            { hover: false }
          );
        }
        currentHoveredId = newId;
        if (currentHoveredId !== null) {
          map.setFeatureState(
            { source: 'vietnam-provinces', id: currentHoveredId },
            { hover: true }
          );
        }
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'provinces-fill', () => {
        if (currentHoveredId !== null) {
          map.setFeatureState(
            { source: 'vietnam-provinces', id: currentHoveredId },
            { hover: false }
          );
        }
        currentHoveredId = null;
        map.getCanvas().style.cursor = '';
      });

      map.on('click', 'provinces-fill', (e) => {
        if (e.features && e.features.length > 0) {
          void selectProvinceRef.current(e.features[0].properties, e.lngLat);
        }
      });

      map.on('click', 'provinces-labels', (e) => {
        if (e.features && e.features.length > 0) {
          void selectProvinceRef.current(e.features[0].properties);
        }
      });

      map.on('mouseenter', 'provinces-labels', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'provinces-labels', () => {
        map.getCanvas().style.cursor = '';
      });

      map.on('click', (e) => {
        const layers = ['provinces-fill', 'provinces-labels'].filter(layer => map.getLayer(layer));
        const features = layers.length ? map.queryRenderedFeatures(e.point, { layers }) : [];
        if (!features.length) void selectProvinceRef.current(null, e.lngLat);
      });
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    mapInstanceRef.current = map;
    const unsubscribeProvince = useAppStore.subscribe((state, previous) => {
      if (state.currentProvince !== previous.currentProvince && map.getLayer('selected-province-border')) {
        map.setFilter('selected-province-border', ['==', ['get', 'Name'], provinceSourceName(state.currentProvince)]);
      }
    });

    return () => {
      unsubscribeProvince();
      geographicRequestRef.current?.abort();
      useAppStore.getState().setCurrentProvince(null);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Switch Basemap Style
  const handleSwitchStyle = (key: keyof typeof MAP_STYLES) => {
    if (!mapInstanceRef.current) return;
    setActiveStyleKey(key);
    mapInstanceRef.current.setStyle(MAP_STYLES[key].url);

    mapInstanceRef.current.once('styledata', () => {
      if (mapInstanceRef.current) {
        addProvincesGeoJsonLayer(mapInstanceRef.current);
        renderSovereigntyOverlays(mapInstanceRef.current);
      }
    });
  };

  // Toggle 3D Perspective Pitch / 2D Flat View
  const toggle3DView = () => {
    if (!mapInstanceRef.current) return;
    const new3D = !is3DView;
    setIs3DView(new3D);
    if (new3D) {
      mapInstanceRef.current.easeTo({
        pitch: 55,
        bearing: -15,
        duration: 1200,
      });
    } else {
      mapInstanceRef.current.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 1200,
      });
    }
  };

  // Clean foreign/controversial water labels and hide Carto default place dots/black text
  // so that ONLY our official 63 clean white Vietnam province labels are displayed
  const sanitizeBasemapLabels = (map: maplibregl.Map) => {
    try {
      if (!map.isStyleLoaded()) return;
      const style = map.getStyle();
      if (!style || !style.layers) return;

      style.layers.forEach((layer) => {
        const id = layer.id;
        // 1. Hide foreign / controversial water names
        if (['watername_ocean', 'watername_sea'].includes(id)) {
          map.setLayoutProperty(id, 'visibility', 'none');
        }
        // 2. Hide basemap's internal OSM city/place/town/state labels and dots
        // This completely eliminates any conflicting black text or double province labels
        if (
          id.startsWith('place_') ||
          id.startsWith('place-') ||
          id.startsWith('poi_') ||
          id.includes('city_dot') ||
          id.includes('capital_dot') ||
          id.includes('place_state') ||
          id.includes('place_town') ||
          id.includes('place_village') ||
          id.includes('place_suburbs') ||
          id.includes('place_hamlet')
        ) {
          map.setLayoutProperty(id, 'visibility', 'none');
        }
      });
    } catch {
      // Safe guard
    }
  };

  // Render Vietnam Maritime Sovereignty Labels & Clean Minimalist Markers
  const renderSovereigntyOverlays = (map: maplibregl.Map) => {
    sanitizeBasemapLabels(map);

    sovereigntyMarkersRef.current.forEach((m) => m.remove());
    sovereigntyMarkersRef.current = [];

    // Subtle Watermark: BIỂN ĐÔNG (Cartographic ocean label)
    const bienDongEl = document.createElement('div');
    bienDongEl.className = 'pointer-events-none select-none text-center';
    bienDongEl.innerHTML = `
      <div style="color: rgba(2, 132, 199, 0.45); font-weight: 800; font-size: 15px; letter-spacing: 0.35em; text-transform: uppercase;">
        BIỂN ĐÔNG
      </div>
      <div style="color: rgba(2, 132, 199, 0.3); font-weight: 700; font-size: 10px; letter-spacing: 0.2em;">
        (VIETNAM EAST SEA)
      </div>
    `;
    const bienDongMarker = new maplibregl.Marker({ element: bienDongEl })
      .setLngLat([112.5, 13.5])
      .addTo(map);
    sovereigntyMarkersRef.current.push(bienDongMarker);

    // Clean Island Markers: Name only, details revealed strictly on hover
    VIETNAM_MARITIME_TERRITORIES.forEach((territory) => {
      const isSpecial = territory.id === 'hoang-sa' || territory.id === 'truong-sa';

      // Short clean display name
      const shortName =
        territory.id === 'hoang-sa'
          ? 'QĐ. Hoàng Sa'
          : territory.id === 'truong-sa'
            ? 'QĐ. Trường Sa'
            : territory.id === 'con-dao'
              ? 'Côn Đảo'
              : territory.id === 'phu-quoc'
                ? 'Phú Quốc'
                : territory.id === 'ly-son'
                  ? 'Lý Sơn'
                  : territory.id === 'bach-long-vi'
                    ? 'Bạch Long Vĩ'
                    : territory.name;

      const el = document.createElement('div');
      el.className = 'cursor-pointer group relative select-none';
      el.innerHTML = `
        <div class="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-clay-50/80 hover:bg-clay-100 border ${isSpecial ? 'border-amber-400/90 shadow-md shadow-amber-500/20' : 'border-clay-300/80'
        } transition-all duration-150">
          <span class="w-1.5 h-1.5 rounded-full ${isSpecial ? 'bg-red-500 ring-1 ring-amber-300' : 'bg-cyan-400'} shrink-0"></span>
          <span class="text-[11px] font-bold ${isSpecial ? 'text-amber-800' : 'text-clay-800'} whitespace-nowrap">
            ${shortName}
          </span>
        </div>

        <!-- HOVER TOOLTIP: Revealed strictly on hover -->
        <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-clay-50/95 backdrop-blur-md p-3 rounded-xl border border-amber-400/80 shadow-2xl text-left text-clay-900">
          <div class="flex items-center justify-between">
            <span class="text-xs font-black text-amber-700 flex items-center">
              <span class="mr-1">🇻🇳</span> ${territory.name}
            </span>
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 font-bold border border-amber-400/30">
              Biển đảo
            </span>
          </div>
          <p class="text-[10px] text-amber-800/90 font-medium mt-1">${territory.adminUnit}</p>
          <p class="text-[10px] text-clay-700 mt-1 leading-relaxed line-clamp-3">${territory.description}</p>
          <div class="mt-2 pt-1.5 border-t border-clay-200 flex items-center justify-between text-[9px] text-clay-600">
            <span>Click để mở ảnh di tích</span>
            <span class="text-amber-700 font-bold">Xem thêm →</span>
          </div>
        </div>
      `;

      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        geographicRequestRef.current?.abort();
        const controller = new AbortController();
        geographicRequestRef.current = controller;
        setCurrentProvince(null);
        setSelectedProvinceInfo(null);
        setGeographicFeedback({ kind: 'loading', message: 'Đang tải địa phương…' });
        const slug = provinceSlugFromTerritory(territory.id);
        try {
          if (!slug) throw new Error('Unmapped territory');
          const province = await fetchProvince(slug, controller.signal);
          if (controller.signal.aborted) return;
          setCurrentProvince(province.slug);
          setGeographicFeedback({ kind: 'success', message: `Đã chọn ${province.name}` });
          setSelectedProvinceInfo({
            name: territory.name,
            adminUnit: territory.adminUnit,
            isSovereignty: true,
            culturalLandmark: territory.culturalLandmark,
            culturalSummary: territory.description,
            culturalCategoryLabel: 'Chủ quyền Lãnh thổ Biển Đảo',
            historicalPeriod: 'Thế kỷ 17 - Nay',
          });
        } catch {
          if (controller.signal.aborted) return;
          setGeographicFeedback({ kind: 'error', message: 'Không thể tải địa phương. Hãy kiểm tra kết nối API rồi chọn lại.' });
        }
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([territory.lng, territory.lat])
        .addTo(map);

      sovereigntyMarkersRef.current.push(marker);
    });
  };

  // Smooth Fly-to
  const flyTo = (lng: number, lat: number, zoom: number) => {
    mapInstanceRef.current?.flyTo({
      center: [lng, lat],
      zoom,
      essential: true,
      duration: 1600,
    });
  };

  // Khám phá ngẫu nhiên một tỉnh thành
  const handleRandomProvince = async () => {
    try {
      const response = await fetch('/data/vietnam_province_labels.geojson');
      const data = await response.json();
      if (!data.features || data.features.length === 0) return;
      const randomIndex = Math.floor(Math.random() * data.features.length);
      const feature = data.features[randomIndex];
      const coords = feature.geometry.coordinates as [number, number];

      flyTo(coords[0], coords[1], 7.8);
      void selectProvince(feature.properties, { lng: coords[0], lat: coords[1] });
      setGeographicFeedback({
        kind: 'success',
        message: `Khám phá ngẫu nhiên: ${feature.properties.name_vi || feature.properties.Name}`,
      });
    } catch {
      flyTo(105.8407, 21.0344, 7.8);
    }
  };

  const clearProvinceSelection = () => {
    geographicRequestRef.current?.abort();
    setSelectedProvinceInfo(null);
    setCurrentProvince(null);
    setGeographicFeedback(null);
  };

  return (
    <div className="space-y-3">
      {/* Sleek Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-clay-lilac sheen border border-white/60 p-2.5 rounded-2xl  backdrop-blur-md clay-soft">
        {/* Region & Sovereignty Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <span className="text-clay-600 font-semibold mr-1 flex items-center">
            <Compass className="w-3.5 h-3.5 mr-1 text-rose-700" /> Tiêu điểm:
          </span>
          <button
            onClick={() => flyTo(108.5, 15.5, 4.75)}
            className="px-2.5 py-1 bg-clay-cream/85 hover:bg-clay-butter text-clay-800 rounded-lg transition cursor-pointer font-medium"
          >
            🇻🇳 Toàn cảnh (63 Tỉnh)
          </button>
          <button
            onClick={() => flyTo(112.0, 16.5, 7.5)}
            className="px-2.5 py-1 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold rounded-lg transition border border-amber-400/50 cursor-pointer clay"
          >
            🇻🇳 QĐ Hoàng Sa
          </button>
          <button
            onClick={() => flyTo(114.3, 10.0, 7.0)}
            className="px-2.5 py-1 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold rounded-lg transition border border-amber-400/50 cursor-pointer clay"
          >
            🇻🇳 QĐ Trường Sa
          </button>
          <button
            onClick={() => flyTo(105.8, 21.2, 7.0)}
            className="px-2.5 py-1 bg-clay-cream/85 hover:bg-clay-butter text-clay-800 rounded-lg transition cursor-pointer"
          >
            Miền Bắc
          </button>
          <button
            onClick={() => flyTo(107.8, 16.2, 7.0)}
            className="px-2.5 py-1 bg-clay-cream/85 hover:bg-clay-butter text-clay-800 rounded-lg transition cursor-pointer"
          >
            Miền Trung
          </button>
          <button
            onClick={() => flyTo(106.6, 10.5, 7.0)}
            className="px-2.5 py-1 bg-clay-cream/85 hover:bg-clay-butter text-clay-800 rounded-lg transition cursor-pointer"
          >
            Miền Nam
          </button>
        </div>

        {/* 3D Map Perspective Toggle & Style Switcher */}
        <div className="flex items-center gap-2">
          {/* Random Province Explorer Button */}
          <button
            type="button"
            onClick={handleRandomProvince}
            title="Khám phá ngẫu nhiên một tỉnh/thành phố hoặc hải đảo Việt Nam"
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border-amber-500/40 shadow-sm"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-700" />
            <span>Khám phá ngẫu nhiên</span>
          </button>

          {/* 3D Tilt View Button */}
          <button
            onClick={toggle3DView}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${is3DView
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-clay-900 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-clay-cream/85 hover:bg-clay-butter text-amber-700 border-amber-400/40'
              }`}
            title="Bật/Tắt góc nhìn không gian 3D nghiêng"
          >
            <Box className="w-3.5 h-3.5" />
            <span>{is3DView ? 'Bản đồ 3D (Đang bật)' : 'Góc nhìn 3D'}</span>
          </button>

          <div className="flex items-center gap-1 bg-clay-50 p-1 rounded-lg border border-clay-200 text-xs">
            {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map((key) => {
              const style = MAP_STYLES[key];
              const Icon = style.icon;
              const isActive = activeStyleKey === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSwitchStyle(key)}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${isActive
                      ? 'bg-amber-500 text-clay-900 font-bold shadow'
                      : 'text-clay-600 hover:text-clay-800'
                    }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{style.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Map Box */}
      <div className={`relative rounded-3xl overflow-hidden border-4 border-clay-cream bg-clay-50 ${className} clay-soft`}>
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Keep feedback in the map without shifting it or intercepting map gestures. */}
        {geographicFeedback && (
          <p role={geographicFeedback.kind === 'error' ? 'alert' : 'status'}
            aria-atomic="true"
            className={`absolute top-4 left-4 right-14 z-30 max-w-md pointer-events-none flex items-start gap-2 px-3 py-2 rounded-lg border text-sm shadow-lg ${
              geographicFeedback.kind === 'error'
                ? 'bg-red-50 text-red-800 border-red-100'
                : geographicFeedback.kind === 'empty'
                  ? 'bg-amber-50 text-amber-800 border-amber-100'
                  : 'bg-clay-100 text-clay-800 border-clay-300'
            }`}>
            {geographicFeedback.kind === 'loading' && (
              <LoaderCircle aria-hidden="true" className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />
            )}
            <span>{geographicFeedback.message}</span>
          </p>
        )}

        {/* Selected Province Info Panel with Authentic Photography */}
        {selectedProvinceInfo && (
          <div className="absolute top-28 sm:top-20 left-4 z-20 w-[calc(100%-2rem)] sm:w-96 max-h-[calc(100%-8rem)] sm:max-h-[calc(100%-6rem)] overflow-y-auto bg-clay-cream/95 backdrop-blur-lg p-3.5 rounded-2xl border-2 border-amber-400/80  text-clay-900 transition-all clay-soft">
            <div className="flex items-start justify-between">
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide flex items-center ${selectedProvinceInfo.isSovereignty
                  ? 'bg-red-600/30 text-red-700 border border-red-500/50'
                  : 'bg-amber-500/20 text-amber-700 border border-amber-400/40'
                }`}>
                <Sparkles className="w-3 h-3 mr-1" />
                {selectedProvinceInfo.culturalCategoryLabel || (selectedProvinceInfo.isSovereignty ? '🇻🇳 Lãnh thổ Biển Đảo' : 'Di sản Cổ truyền')}
              </span>
              <button
                onClick={clearProvinceSelection}
                className="text-clay-600 hover:text-clay-900 p-1 rounded-lg hover:bg-clay-200 transition cursor-pointer"
                title="Đóng thẻ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-2">
              <h4 className="font-black text-lg text-clay-900 flex items-center space-x-1.5">
                <span>{selectedProvinceInfo.isSovereignty ? '🇻🇳' : '📍'}</span>
                <span>{selectedProvinceInfo.name}</span>
              </h4>
              <p className="text-xs text-clay-600 font-medium">{selectedProvinceInfo.adminUnit}</p>
            </div>

            {/* Cultural Landmark Photo & Info */}
            <div className="mt-2.5">
              <LandmarkVisualCard
                provinceName={selectedProvinceInfo.name}
                landmarkName={selectedProvinceInfo.culturalLandmark || selectedProvinceInfo.name}
                categoryLabel={selectedProvinceInfo.culturalCategoryLabel}
                historicalPeriod={selectedProvinceInfo.historicalPeriod}
                isSovereignty={selectedProvinceInfo.isSovereignty}
              />
            </div>

            <p className="text-xs text-clay-700 mt-2 leading-relaxed">
              {selectedProvinceInfo.culturalSummary || selectedProvinceInfo.description || (
                selectedProvinceInfo.isSovereignty
                  ? 'Phần lãnh thổ thiêng liêng không thể tách rời của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam trên Biển Đông.'
                  : 'Vùng đất giàu truyền thống văn hóa dân tộc với di tích lịch sử ngàn đời.'
              )}
            </p>

            {currentProvince && scenarioByProvince(currentProvince) && !selectedProvinceInfo.isSovereignty ? (
              <Link to={"/experiences/" + currentProvince} className="mt-4 flex min-h-12 items-center justify-center rounded-xl border border-amber-400/50 bg-amber-400 px-4 py-3 text-sm font-bold text-clay-900 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400 clay-soft">
                Trải nghiệm một ngày
              </Link>
            ) : null}

            {/* Quick Action Buttons */}
            <div className="mt-3.5 pt-2.5 border-t border-clay-200/80 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  const state = useAppStore.getState();
                  if (state.currentProvince) {
                    state.openCultureDrawerForProvince(state.currentProvince);
                  }
                }}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-clay-900 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-amber-500/20 transition cursor-pointer group clay-soft"
              >
                <Compass className="w-4 h-4 text-clay-900 group-hover:rotate-45 transition-transform" />
                <span>Khám phá Văn hóa {selectedProvinceInfo.name}</span>
              </button>
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-[11px] text-clay-600">Đàm thoại thông minh</span>
                <button
                  type="button"
                  onClick={() => {
                    const state = useAppStore.getState();
                    const slug = state.currentProvince;
                    state.openAssistantWithPrompt(
                      `Giới thiệu về nét đẹp văn hóa, lịch sử, ẩm thực và phong tục tập quán của ${selectedProvinceInfo.name}`,
                      slug || undefined
                    );
                  }}
                  className="text-amber-700 hover:text-amber-700 font-bold text-[11px] flex items-center cursor-pointer gap-1 px-2.5 py-1 rounded-lg bg-clay-200 hover:bg-clay-300 border border-clay-300 hover:border-amber-500/30 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Hỏi Trợ lý AI →</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
