import { create } from 'zustand';

interface AppState {
  currentProvince: string | null;
  mapCenter: [number, number]; // [lng, lat]
  mapZoom: number;
  selectedCategory: string;
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
  setCurrentProvince: (province: string | null) => void;
  setSelectedCategory: (category: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentProvince: null,
  mapCenter: [106.660172, 10.762622], // Vietnam center/default (approx Ho Chi Minh / Da Nang)
  mapZoom: 5.5,
  selectedCategory: 'all',
  setMapCenter: (mapCenter) => set({ mapCenter }),
  setMapZoom: (mapZoom) => set({ mapZoom }),
  setCurrentProvince: (currentProvince) => set({ currentProvince }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
}));

