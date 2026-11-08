import { apiClient } from '../services/apiClient';

export interface ProvinceDto {
  id: number;
  slug: string;
  name: string;
  adminUnit: string;
}

interface GeographicResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export async function fetchProvinces(signal?: AbortSignal): Promise<ProvinceDto[]> {
  const response = await apiClient.get<GeographicResponse<ProvinceDto[]>>('/geo/provinces', { signal });
  return response.data.data;
}

export async function fetchProvince(slug: string, signal?: AbortSignal): Promise<ProvinceDto> {
  const response = await apiClient.get<GeographicResponse<ProvinceDto>>(`/geo/provinces/${encodeURIComponent(slug)}`, { signal });
  return response.data.data;
}

export async function identifyProvince(latitude: number, longitude: number, signal?: AbortSignal): Promise<ProvinceDto | null> {
  const response = await apiClient.post<GeographicResponse<ProvinceDto | null>>('/geo/identify', { latitude, longitude }, { signal });
  return response.data.data;
}
