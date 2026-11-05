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
  mapCenter: [108.5, 15.5], // Tâm trung tâm bao trọn cả đất liền và 2 quần đảo Hoàng Sa - Trường Sa
  mapZoom: 4.75,
  selectedCategory: 'all',
  setMapCenter: (mapCenter) => set({ mapCenter }),
  setMapZoom: (mapZoom) => set({ mapZoom }),
  setCurrentProvince: (currentProvince) => set({ currentProvince }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
}));
