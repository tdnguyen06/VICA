import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { useAppStore } from '../../stores/appStore';
import { VIETNAM_CULTURAL_SITES } from '../../data/vietnamCulturalSites';
import type { CulturalSite } from '../../data/vietnamCulturalSites';
import { Layers, Compass, MapPin } from 'lucide-react';

interface MapViewerProps {
  className?: string;
}

// OpenStreetMap Raster Style - 100% reliable, full Vietnamese place names & topology
const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const CARTO_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export const MapViewer: React.FC<MapViewerProps> = ({ className = 'h-[500px] w-full' }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const { mapCenter, mapZoom, setMapCenter, setMapZoom, selectedCategory, setSelectedCategory } = useAppStore();
  const [mapStyleType, setMapStyleType] = useState<'osm' | 'carto'>('osm');
  const [activeSite, setActiveSite] = useState<CulturalSite | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialStyle = mapStyleType === 'osm' ? OSM_STYLE : CARTO_STYLE;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: mapCenter,
      zoom: mapZoom,
      maxBounds: [
        [98.0, 6.0],   // Tây Nam (bao trọn vịnh Thái Lan & Cà Mau)
        [118.0, 25.0], // Đông Bắc (bao trọn cực Bắc & 2 quần đảo Hoàng Sa, Trường Sa)
      ],
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');

    map.on('moveend', () => {
      const center = map.getCenter();
      setMapCenter([center.lng, center.lat]);
      setMapZoom(map.getZoom());
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Map Style
  const handleStyleChange = (style: 'osm' | 'carto') => {
    if (!mapInstanceRef.current) return;
    setMapStyleType(style);
    mapInstanceRef.current.setStyle(style === 'osm' ? OSM_STYLE : CARTO_STYLE);
  };

  // Render markers according to filter
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const filteredSites =
      selectedCategory === 'all'
        ? VIETNAM_CULTURAL_SITES
        : VIETNAM_CULTURAL_SITES.filter((s) => s.category === selectedCategory);

    filteredSites.forEach((site) => {
      // Custom HTML Marker element
      const el = document.createElement('div');
      el.className = 'group cursor-pointer transform -translate-x-1/2 -translate-y-full transition-transform hover:scale-125';
      el.innerHTML = `
        <div style="background-color: ${site.color};" class="p-1.5 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
          <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </div>
      `;

      // Popup with rich information
      const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="color: #0f172a; padding: 4px; font-family: sans-serif; max-width: 240px;">
          <div style="display: inline-block; background: ${site.color}15; color: ${site.color}; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; margin-bottom: 4px;">
            ${site.categoryLabel}
          </div>
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${site.name}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #475569; line-height: 1.4;">${site.description}</p>
          <div style="font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            📍 <b>${site.province}</b> ${site.yearRecognized ? `| UNESCO: ${site.yearRecognized}` : ''}
          </div>
        </div>
      `);

      el.addEventListener('click', () => {
        setActiveSite(site);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([site.lng, site.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [selectedCategory]);

  // Quick Fly to region
  const flyToRegion = (lng: number, lat: number, zoom: number) => {
    mapInstanceRef.current?.flyTo({
      center: [lng, lat],
      zoom,
      essential: true,
      duration: 1500,
    });
  };

  return (
    <div className="space-y-3">
      {/* Quick Navigation & Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl backdrop-blur-md">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center">
            <Layers className="w-3.5 h-3.5 mr-1" /> Bộ lọc:
          </span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'unesco', label: 'Di sản UNESCO' },
            { id: 'history', label: 'Di tích Lịch sử' },
            { id: 'festival', label: 'Lễ hội & Văn hóa' },
            { id: 'nature', label: 'Thắng cảnh' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-md font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Region Quick Jump */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center">
            <Compass className="w-3.5 h-3.5 mr-1" /> Vùng:
          </span>
          <button
            onClick={() => flyToRegion(107.5, 16.0, 5.8)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
          >
            🇻🇳 Toàn quốc
          </button>
          <button
            onClick={() => flyToRegion(105.8, 21.2, 7.5)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
          >
            Miền Bắc
          </button>
          <button
            onClick={() => flyToRegion(107.8, 16.2, 7.5)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
          >
            Miền Trung
          </button>
          <button
            onClick={() => flyToRegion(106.3, 10.3, 7.5)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
          >
            Miền Nam
          </button>
          <button
            onClick={() => flyToRegion(113.2, 13.5, 6.0)}
            className="px-2.5 py-1 bg-rose-950/60 border border-rose-800/80 hover:bg-rose-900/60 text-rose-300 rounded-lg transition"
          >
            🌊 Biển Đảo
          </button>
        </div>

        {/* Style Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => handleStyleChange('osm')}
            className={`px-2 py-0.5 rounded ${
              mapStyleType === 'osm' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            OSM Chuẩn
          </button>
          <button
            onClick={() => handleStyleChange('carto')}
            className={`px-2 py-0.5 rounded ${
              mapStyleType === 'carto' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tối giản
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className={`relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 ${className}`}>
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Selected Site Detail Card Float */}
        {activeSite && (
          <div className="absolute top-4 left-4 z-10 max-w-sm bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl animate-fade-in text-slate-100">
            <div className="flex items-start justify-between">
              <span
                style={{ backgroundColor: `${activeSite.color}20`, color: activeSite.color }}
                className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider mb-1 inline-block"
              >
                {activeSite.categoryLabel}
              </span>
              <button
                onClick={() => setActiveSite(null)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            <h4 className="font-bold text-base text-white mt-1">{activeSite.name}</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{activeSite.description}</p>
            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-amber-400" />
                {activeSite.province}
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                {activeSite.lng.toFixed(2)}°E, {activeSite.lat.toFixed(2)}°N
              </span>
            </div>
          </div>
        )}

        {/* Live Coordinates Footer */}
        <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-center space-x-3">
          <span>
            📍 <b>Kinh độ:</b> {mapCenter[0].toFixed(4)}°E | <b>Vĩ độ:</b> {mapCenter[1].toFixed(4)}°N
          </span>
          <span className="text-slate-500">|</span>
          <span>
            🔍 <b>Thu phóng:</b> {mapZoom.toFixed(1)}x
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-400 font-semibold">
            {selectedCategory === 'all'
              ? `${VIETNAM_CULTURAL_SITES.length} Điểm di sản`
              : `${VIETNAM_CULTURAL_SITES.filter((s) => s.category === selectedCategory).length} Điểm lọc`}
          </span>
        </div>
      </div>
    </div>
  );
};
