import axios from 'axios';

export interface CulturalSiteDto {
  id: number;
  name: string;
  slug: string;
  category: string;
  categoryLabel: string;
  province: string;
  lat: number;
  lng: number;
  description: string;
  unescoYear?: number;
  historicalPeriod?: string;
  thumbnailUrl?: string;
  color: string;
  featured: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export const fetchCulturalSites = async (category?: string): Promise<CulturalSiteDto[]> => {
  const params: Record<string, string> = {};
  if (category && category !== 'all') {
    params.category = category;
  }
  const response = await axios.get<ApiResponse<CulturalSiteDto[]>>('/api/v1/cultural-sites', {
    params,
    timeout: 8000,
  });
  return response.data.data;
};

