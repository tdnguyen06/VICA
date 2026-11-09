import { apiClient } from '../services/apiClient';
import type { ProvinceDto } from './geographicApi';

// Contract: docs/api/culture-api.md (Cultural API v1)
export type EntryType = 'HERITAGE' | 'CUISINE' | 'FESTIVAL' | 'FIGURE' | 'PLACE';
export type VerificationStatus = 'VERIFIED' | 'LEGEND';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type MediaType = 'IMAGE' | 'VIDEO' | 'MODEL_3D';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface CultureSource {
  id: number;
  title: string;
  author: string | null;
  publisher: string | null;
  sourceType: string;
  url: string | null;
  publishedYear: number | null;
  reviewStatus: ReviewStatus;
  citationNote: string | null;
}

export interface CultureMedia {
  id: number;
  mediaType: MediaType;
  url: string;
  caption: string | null;
  credit: string | null;
}

export interface CultureEntrySummary {
  id: number;
  slug: string;
  provinceSlug: string;
  type: EntryType;
  category: string | null;
  name: string;
  summary: string | null;
  verificationStatus: VerificationStatus;
  coordinate: Coordinate | null;
  thumbnailUrl: string | null;
  sourceCount: number;
}

export interface CultureEntryDetail {
  id: number;
  slug: string;
  provinceSlug: string;
  type: EntryType;
  category: string | null;
  name: string;
  summary: string | null;
  description: string;
  verificationStatus: VerificationStatus;
  historicalPeriod: string | null;
  coordinate: Coordinate | null;
  sources: CultureSource[];
  media: CultureMedia[];
}

export interface ProvinceCultureOverview {
  province: ProvinceDto;
  overview: string | null;
  counts: Record<EntryType, number>;
  highlights: CultureEntrySummary[];
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

const COLLECTION_PATH: Record<EntryType, string> = {
  HERITAGE: 'heritages',
  CUISINE: 'cuisines',
  FESTIVAL: 'festivals',
  FIGURE: 'figures',
  PLACE: 'places',
};

export async function fetchCultureOverview(slug: string, signal?: AbortSignal): Promise<ProvinceCultureOverview> {
  const response = await apiClient.get<Envelope<ProvinceCultureOverview>>(
    `/cultures/provinces/${encodeURIComponent(slug)}`, { signal });
  return response.data.data;
}

export async function fetchCultureEntries(slug: string, type: EntryType, signal?: AbortSignal): Promise<CultureEntrySummary[]> {
  const response = await apiClient.get<Envelope<CultureEntrySummary[]>>(
    `/cultures/provinces/${encodeURIComponent(slug)}/${COLLECTION_PATH[type]}`, { signal });
  return response.data.data;
}

export async function fetchCultureEntry(id: number, signal?: AbortSignal): Promise<CultureEntryDetail> {
  const response = await apiClient.get<Envelope<CultureEntryDetail>>(`/cultures/entries/${id}`, { signal });
  return response.data.data;
}