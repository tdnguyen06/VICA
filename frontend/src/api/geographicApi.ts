import { apiClient } from '../services/apiClient';
import type { ApiResponse } from '../types';

export interface ProvinceDto {
  id: number;
  slug: string;
  name: string;
  adminUnit: string;
}

export async function fetchProvinces(signal?: AbortSignal): Promise<ProvinceDto[]> {
  const response = await apiClient.get<ApiResponse<ProvinceDto[]>>('/geo/provinces', { signal });
  return response.data.data;
}

export async function fetchProvince(slug: string, signal?: AbortSignal): Promise<ProvinceDto> {
  const response = await apiClient.get<ApiResponse<ProvinceDto>>(`/geo/provinces/${encodeURIComponent(slug)}`, { signal });
  return response.data.data;
}

export async function identifyProvince(latitude: number, longitude: number, signal?: AbortSignal): Promise<ProvinceDto | null> {
  const response = await apiClient.post<ApiResponse<ProvinceDto | null>>('/geo/identify', { latitude, longitude }, { signal });
  return response.data.data;
}
