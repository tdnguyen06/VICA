import { create } from 'zustand';

interface AppState {
  currentProvince: string | null;
  mapCenter: [number, number]; // [lng, lat]
  mapZoom: number;
  selectedCategory: string;
  isAssistantOpen: boolean;
  assistantInitialPrompt: string | null;
  isCultureDrawerOpen: boolean;
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
  setCurrentProvince: (province: string | null) => void;
  setSelectedCategory: (category: string) => void;
  setIsAssistantOpen: (open: boolean) => void;
  setIsCultureDrawerOpen: (open: boolean) => void;
  openAssistantWithPrompt: (prompt?: string, provinceSlug?: string) => void;
  openCultureDrawerForProvince: (provinceSlug: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentProvince: null,
  mapCenter: [108.5, 15.5], // Tâm trung tâm bao trọn cả đất liền và 2 quần đảo Hoàng Sa - Trường Sa
  mapZoom: 4.75,
  selectedCategory: 'all',
  isAssistantOpen: false,
  assistantInitialPrompt: null,
  isCultureDrawerOpen: false,
  setMapCenter: (mapCenter) => set({ mapCenter }),
  setMapZoom: (mapZoom) => set({ mapZoom }),
  setCurrentProvince: (currentProvince) => set({ currentProvince }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setIsAssistantOpen: (isAssistantOpen) => set({ isAssistantOpen }),
  setIsCultureDrawerOpen: (isCultureDrawerOpen) => set({ isCultureDrawerOpen }),
  openAssistantWithPrompt: (prompt, provinceSlug) =>
    set((state) => ({
      isAssistantOpen: true,
      currentProvince: provinceSlug !== undefined ? provinceSlug : state.currentProvince,
      assistantInitialPrompt: prompt || null,
    })),
  openCultureDrawerForProvince: (provinceSlug) =>
    set({
      currentProvince: provinceSlug,
      isCultureDrawerOpen: true,
    }),
}));
