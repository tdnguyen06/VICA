import { useQuery } from '@tanstack/react-query';
import { fetchCulturalSites, type CulturalSiteDto } from '../api/culturalSitesApi';
import { VIETNAM_CULTURAL_SITES } from '../data/vietnamCulturalSites';

export const useCulturalSites = (category: string = 'all') => {
  return useQuery<CulturalSiteDto[]>({
    queryKey: ['cultural-sites', category],
    queryFn: () => fetchCulturalSites(category),
    // If backend is momentarily unavailable, fallback to initial cached sites
    initialData: () => {
      const fallback = VIETNAM_CULTURAL_SITES.map((s, idx) => ({
        id: idx + 1,
        name: s.name,
        slug: s.id,
        category: s.category,
        categoryLabel: s.categoryLabel,
        province: s.province,
        lat: s.lat,
        lng: s.lng,
        description: s.description,
        color: s.color,
        featured: true,
      }));
      return category === 'all'
        ? fallback
        : fallback.filter((s) => s.category === category);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
};

