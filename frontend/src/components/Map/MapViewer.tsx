import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { useAppStore } from '../../stores/appStore';

interface MapViewerProps {
  className?: string;
}

export const MapViewer: React.FC<MapViewerProps> = ({ className = 'h-96 w-full' }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const { mapCenter, mapZoom, setMapCenter, setMapZoom } = useAppStore();

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default style: Carto Positron or Demotiles
    const defaultTileStyle =
      import.meta.env.VITE_MAP_STYLE_URL ||
      'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: defaultTileStyle,
      center: mapCenter,
      zoom: mapZoom,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');

    map.on('moveend', () => {
      const center = map.getCenter();
      setMapCenter([center.lng, center.lat]);
      setMapZoom(map.getZoom());
    });

    // Add sample marker for Hanoi (Capital) & Ho Chi Minh City
    new maplibregl.Marker({ color: '#ef4444' })
      .setLngLat([105.83416, 21.027764])
      .setPopup(new maplibregl.Popup().setHTML('<b style="color:#000;">Thủ đô Hà Nội</b><br/><span style="color:#333;">Trung tâm Văn hóa & Lịch sử</span>'))
      .addTo(map);

    new maplibregl.Marker({ color: '#3b82f6' })
      .setLngLat([106.660172, 10.762622])
      .setPopup(new maplibregl.Popup().setHTML('<b style="color:#000;">TP. Hồ Chí Minh</b><br/><span style="color:#333;">Đô thị di sản phương Nam</span>'))
      .addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className={`relative rounded-xl overflow-hidden shadow-2xl border border-slate-700 ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
        MapLibre GL JS | Lng: {mapCenter[0].toFixed(4)}, Lat: {mapCenter[1].toFixed(4)} | Zoom: {mapZoom.toFixed(1)}
      </div>
    </div>
  );
};
