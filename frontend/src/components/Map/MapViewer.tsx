import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreglWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useAppStore } from '../../stores/appStore';
import { useCulturalSites } from '../../hooks/useCulturalSites';
import { VIETNAM_MARITIME_TERRITORIES } from '../../data/vietnamMaritimeSovereignty';
import type { MaritimeTerritory } from '../../data/vietnamMaritimeSovereignty';
import { LandmarkVisualCard } from './LandmarkVisualCard';
import { fetchProvince, identifyProvince } from '../../api/geographicApi';
import { provinceSlugFromProperties, provinceSlugFromTerritory, provinceSourceName } from '../../data/provinceRegistry';
import {
  Layers,
  Compass,
  ShieldCheck,
  Sun,
  Moon,
  Eye,
  Database,
  Sparkles,
  RefreshCw,
  Landmark,
  Box,
  X,
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

interface HoveredProvinceState {
  name: string;
  landmark?: string;
  historicalPeriod?: string;
}

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

  const { mapCenter, mapZoom, setMapCenter, setMapZoom, selectedCategory, setSelectedCategory, setCurrentProvince } = useAppStore();
  const [geographicStatus, setGeographicStatus] = useState('');
  const [geographicError, setGeographicError] = useState(false);
  const [activeStyleKey, setActiveStyleKey] = useState<keyof typeof MAP_STYLES>('voyager');
  const [is3DView, setIs3DView] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<MaritimeTerritory | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<HoveredProvinceState | null>(null);
  
  const [selectedProvinceInfo, setSelectedProvinceInfo] = useState<SelectedProvinceInfo | null>(null);

  // Fetch real cultural sites count from PostgreSQL + PostGIS API
  const { data: sites = [], isFetching } = useCulturalSites(selectedCategory);

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
        const props = feature.properties;
        if (props && props.name_vi) {
          setHoveredProvince({
            name: props.name_vi,
            landmark: props.cultural_landmark,
            historicalPeriod: props.historical_period,
          });
        }
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
        setHoveredProvince(null);
      });

      const selectProvince = async (props: Record<string, unknown> | null, point?: maplibregl.LngLat) => {
        geographicRequestRef.current?.abort();
        const controller = new AbortController();
        geographicRequestRef.current = controller;
        setGeographicStatus('Đang xác định địa phương…');
        setGeographicError(false);
        setCurrentProvince(null);
        setSelectedProvinceInfo(null);
        setSelectedTerritory(null);
        const slug = props ? provinceSlugFromProperties(props) : null;
        const isDisplayOnly = props?.is_sovereignty === true || props?.is_sovereignty === 'true';
        try {
          const province = point && !isDisplayOnly
            ? await identifyProvince(point.lat, point.lng, controller.signal)
            : slug ? await fetchProvince(slug, controller.signal) : null;
          if (controller.signal.aborted) return;
          if (!province) {
            if (props && !point && !slug) throw new Error('Unmapped map feature');
            setGeographicStatus('Không có địa phương trong vùng dữ liệu tại vị trí này.');
            return;
          }
          setCurrentProvince(province.slug);
          setGeographicStatus(`Đã chọn ${province.name}`);
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
          setGeographicError(true);
          setGeographicStatus('Không thể tải địa phương. Hãy kiểm tra kết nối API rồi chọn lại.');
        }
      };

      map.on('click', 'provinces-fill', (e) => {
        if (e.features && e.features.length > 0) {
          void selectProvince(e.features[0].properties, e.lngLat);
        }
      });

      map.on('click', 'provinces-labels', (e) => {
        if (e.features && e.features.length > 0) {
          void selectProvince(e.features[0].properties);
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
        if (!features.length) void selectProvince(null, e.lngLat);
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
        // 2. Hide basemap's internal OSM city/place/town dots and black labels
        // This eliminates the conflicting black text and missing/unranked city clutter
        if (
          id.startsWith('place_') ||
          id.startsWith('poi_') ||
          id.includes('city_dot') ||
          id.includes('capital_dot')
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
        <div class="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-950/80 hover:bg-slate-900 border ${
          isSpecial ? 'border-amber-400/90 shadow-md shadow-amber-500/20' : 'border-slate-700/80'
        } transition-all duration-150">
          <span class="w-1.5 h-1.5 rounded-full ${isSpecial ? 'bg-red-500 ring-1 ring-amber-300' : 'bg-cyan-400'} shrink-0"></span>
          <span class="text-[11px] font-bold ${isSpecial ? 'text-amber-200' : 'text-slate-200'} whitespace-nowrap">
            ${shortName}
          </span>
        </div>

        <!-- HOVER TOOLTIP: Revealed strictly on hover -->
        <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-slate-950/95 backdrop-blur-md p-3 rounded-xl border border-amber-400/80 shadow-2xl text-left text-slate-100">
          <div class="flex items-center justify-between">
            <span class="text-xs font-black text-amber-300 flex items-center">
              <span class="mr-1">🇻🇳</span> ${territory.name}
            </span>
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30">
              Biển đảo
            </span>
          </div>
          <p class="text-[10px] text-amber-200/90 font-medium mt-1">${territory.adminUnit}</p>
          <p class="text-[10px] text-slate-300 mt-1 leading-relaxed line-clamp-3">${territory.description}</p>
          <div class="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
            <span>Click để mở ảnh di tích</span>
            <span class="text-amber-400 font-bold">Xem thêm →</span>
          </div>
        </div>
      `;

      el.addEventListener('mouseenter', () => {
        setHoveredProvince({
          name: territory.name,
          landmark: territory.adminUnit,
        });
      });

      el.addEventListener('mouseleave', () => {
        setHoveredProvince(null);
      });

      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        geographicRequestRef.current?.abort();
        const controller = new AbortController();
        geographicRequestRef.current = controller;
        setCurrentProvince(null);
        setSelectedProvinceInfo(null);
        setSelectedTerritory(null);
        setGeographicStatus('Đang tải địa phương…');
        setGeographicError(false);
        const slug = provinceSlugFromTerritory(territory.id);
        try {
          if (!slug) throw new Error('Unmapped territory');
          const province = await fetchProvince(slug, controller.signal);
          if (controller.signal.aborted) return;
          setCurrentProvince(province.slug);
          setGeographicStatus(`Đã chọn ${province.name}`);
          setSelectedProvinceInfo({
            name: territory.name,
            adminUnit: territory.adminUnit,
            isSovereignty: true,
            culturalLandmark: territory.culturalLandmark,
            culturalSummary: territory.description,
            culturalCategoryLabel: 'Chủ quyền Lãnh thổ Biển Đảo',
            historicalPeriod: 'Thế kỷ 17 - Nay',
          });
          setSelectedTerritory(territory);
        } catch {
          if (controller.signal.aborted) return;
          setGeographicError(true);
          setGeographicStatus('Không thể tải địa phương. Hãy kiểm tra kết nối API rồi chọn lại.');
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

  const clearProvinceSelection = () => {
    geographicRequestRef.current?.abort();
    setSelectedProvinceInfo(null);
    setSelectedTerritory(null);
    setCurrentProvince(null);
    setGeographicStatus('');
  };

  return (
    <div className="space-y-3">
      {geographicStatus && (
        <p role={geographicError ? 'alert' : 'status'} aria-live="polite"
          className={`px-3 py-2 rounded-lg text-sm ${geographicError ? 'bg-red-950 text-red-200' : 'bg-slate-900 text-slate-200'}`}>
          {geographicStatus}
        </p>
      )}
      {/* Sleek Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/95 border border-slate-800 p-2.5 rounded-xl shadow-lg backdrop-blur-md">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <span className="text-slate-400 font-semibold mr-1 flex items-center">
            <Layers className="w-3.5 h-3.5 mr-1 text-amber-400" /> Di sản:
          </span>
          {[
            { id: 'all', label: 'Tất cả 65 điểm' },
            { id: 'unesco', label: 'Di sản UNESCO' },
            { id: 'history', label: 'Di tích Lịch sử' },
            { id: 'festival', label: 'Lễ hội & Cổ truyền' },
            { id: 'nature', label: 'Danh thắng' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Region & Sovereignty Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <span className="text-slate-400 font-semibold mr-1 flex items-center">
            <Compass className="w-3.5 h-3.5 mr-1 text-rose-400" /> Tiêu điểm:
          </span>
          <button
            onClick={() => flyTo(108.5, 15.5, 4.75)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition cursor-pointer font-medium"
          >
            🇻🇳 Toàn cảnh (63 Tỉnh)
          </button>
          <button
            onClick={() => flyTo(112.0, 16.5, 7.5)}
            className="px-2.5 py-1 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold rounded-lg transition shadow-md border border-amber-400/50 cursor-pointer"
          >
            🇻🇳 QĐ Hoàng Sa
          </button>
          <button
            onClick={() => flyTo(114.3, 10.0, 7.0)}
            className="px-2.5 py-1 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold rounded-lg transition shadow-md border border-amber-400/50 cursor-pointer"
          >
            🇻🇳 QĐ Trường Sa
          </button>
          <button
            onClick={() => flyTo(105.8, 21.2, 7.0)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition cursor-pointer"
          >
            Miền Bắc
          </button>
          <button
            onClick={() => flyTo(107.8, 16.2, 7.0)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition cursor-pointer"
          >
            Miền Trung
          </button>
          <button
            onClick={() => flyTo(106.6, 10.5, 7.0)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition cursor-pointer"
          >
            Miền Nam
          </button>
        </div>

        {/* 3D Map Perspective Toggle & Style Switcher */}
        <div className="flex items-center gap-2">
          {/* 3D Tilt View Button */}
          <button
            onClick={toggle3DView}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
              is3DView
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-400/40'
            }`}
            title="Bật/Tắt góc nhìn không gian 3D nghiêng"
          >
            <Box className="w-3.5 h-3.5" />
            <span>{is3DView ? 'Bản đồ 3D (Đang bật)' : 'Góc nhìn 3D'}</span>
          </button>

          {/* Real PostGIS Indicator */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-[11px] text-emerald-400">
            <Database className="w-3 h-3 animate-pulse" />
            <span className="font-semibold">PostGIS API ({sites.length} điểm)</span>
            {isFetching && <RefreshCw className="w-2.5 h-2.5 animate-spin ml-0.5" />}
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map((key) => {
              const style = MAP_STYLES[key];
              const Icon = style.icon;
              const isActive = activeStyleKey === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSwitchStyle(key)}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
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
      <div className={`relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 ${className}`}>
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* STABLE TOP HUD BANNER (Fixed Position & Height: Zero Text Jumping / Jitter) */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none max-w-xl w-[90%]">
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-4 py-2 shadow-2xl flex items-center justify-between text-xs text-slate-200 transition-all duration-150">
            {hoveredProvince ? (
              <div className="flex items-center space-x-2 truncate">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 shadow-sm shadow-amber-400/80" />
                <span className="font-extrabold text-amber-300 shrink-0">{hoveredProvince.name}</span>
                <span className="text-slate-500">•</span>
                <span className="text-white font-medium truncate flex items-center">
                  <Landmark className="w-3 h-3 mr-1 text-amber-400 shrink-0 inline" />
                  {hoveredProvince.landmark || 'Đặc trưng văn hóa'}
                </span>
                {hoveredProvince.historicalPeriod && (
                  <>
                    <span className="text-slate-500 hidden sm:inline">•</span>
                    <span className="text-amber-200/80 text-[11px] hidden sm:inline truncate">{hoveredProvince.historicalPeriod}</span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-slate-400">
                <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Di chuột qua tỉnh thành để xem di tích • Click để chiêm ngưỡng ảnh thật di sản</span>
              </div>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-400/30 text-amber-300 font-bold ml-2 shrink-0">
              📸 65 Điểm Di tích Thực tế
            </span>
          </div>
        </div>

        {/* Selected Province Info Panel with Authentic Photography */}
        {selectedProvinceInfo && (
          <div className="absolute top-14 left-4 z-20 w-80 sm:w-96 max-h-[calc(100%-4.5rem)] overflow-y-auto bg-slate-900/98 backdrop-blur-lg p-3.5 rounded-2xl border-2 border-amber-400/80 shadow-2xl text-slate-100 transition-all">
            <div className="flex items-start justify-between">
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide flex items-center ${
                selectedProvinceInfo.isSovereignty
                  ? 'bg-red-600/30 text-red-300 border border-red-500/50'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
              }`}>
                <Sparkles className="w-3 h-3 mr-1" />
                {selectedProvinceInfo.culturalCategoryLabel || (selectedProvinceInfo.isSovereignty ? '🇻🇳 Lãnh thổ Biển Đảo' : 'Di sản Cổ truyền')}
              </span>
              <button
                onClick={clearProvinceSelection}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Đóng thẻ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mt-2 flex items-center justify-between">
              <div>
                <h4 className="font-black text-lg text-white flex items-center space-x-1.5">
                  <span>{selectedProvinceInfo.isSovereignty ? '🇻🇳' : '📍'}</span>
                  <span>{selectedProvinceInfo.name}</span>
                </h4>
                <p className="text-xs text-slate-400 font-medium">{selectedProvinceInfo.adminUnit}</p>
              </div>
              <div className="px-2 py-0.5 bg-slate-950 rounded border border-amber-400/40 text-[10px] font-extrabold text-amber-400 flex items-center">
                <Sparkles className="w-3 h-3 mr-1 text-amber-400" />
                Di sản Quốc gia
              </div>
            </div>

            {/* AUTHENTIC REAL PHOTOGRAPHY + 3D PARALLAX TILT + 3D DIGITAL SCAN LINK */}
            <div className="mt-2.5">
              <LandmarkVisualCard
                provinceName={selectedProvinceInfo.name}
                landmarkName={selectedProvinceInfo.culturalLandmark || selectedProvinceInfo.name}
                categoryLabel={selectedProvinceInfo.culturalCategoryLabel}
                historicalPeriod={selectedProvinceInfo.historicalPeriod}
                isSovereignty={selectedProvinceInfo.isSovereignty}
              />
            </div>

            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {selectedProvinceInfo.culturalSummary || selectedProvinceInfo.description || (
                selectedProvinceInfo.isSovereignty
                  ? 'Phần lãnh thổ thiêng liêng không thể tách rời của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam trên Biển Đông.'
                  : 'Vùng đất giàu truyền thống văn hóa dân tộc với di tích lịch sử ngàn đời.'
              )}
            </p>

            {/* Quick Action Button */}
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">Mô hình tạo bởi Antigravity 3D Engine</span>
              <button
                onClick={() => {
                  // Click any province to focus zoom
                }}
                className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center cursor-pointer"
              >
                Khám phá di sản →
              </button>
            </div>
          </div>
        )}

        {/* Sovereignty Info Panel (Special badge for Maritime Territories) */}
        {selectedTerritory && (
          <div className="absolute top-14 right-4 z-20 max-w-sm bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border-2 border-red-500/80 shadow-2xl text-slate-100">
            <div className="flex items-start justify-between">
              <span className="flex items-center space-x-1 bg-red-600/20 text-red-400 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase border border-red-500/40">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Chủ quyền Lãnh thổ Việt Nam
              </span>
              <button
                onClick={clearProvinceSelection}
                className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <h4 className="font-extrabold text-lg text-white mt-2 flex items-center space-x-1.5">
              <span>🇻🇳</span>
              <span>{selectedTerritory.name}</span>
            </h4>
            <p className="text-xs text-amber-400 font-semibold mt-0.5">{selectedTerritory.adminUnit}</p>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">{selectedTerritory.description}</p>
            <div className="mt-3 pt-2.5 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block mb-1.5">Các đảo, bãi đá tiêu biểu:</span>
              <div className="flex flex-wrap gap-1">
                {selectedTerritory.islands.map((island) => (
                  <span
                    key={island}
                    className="px-2 py-0.5 bg-slate-800/90 text-slate-200 text-[10px] rounded border border-slate-700"
                  >
                    {island}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live Coordinates Footer Bottom Left */}
        <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-center space-x-3 pointer-events-none">
          <span>
            📍 <b>Tọa độ:</b> {mapCenter[0].toFixed(3)}°E, {mapCenter[1].toFixed(3)}°N
          </span>
          <span className="text-slate-500">|</span>
          <span>
            🔍 <b>Thu phóng:</b> {mapZoom.toFixed(1)}x
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-400 font-semibold flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
            65 Điểm Di tích Cổ truyền (63 Tỉnh Thành & 2 Quần Đảo)
          </span>
        </div>
      </div>
    </div>
  );
};
