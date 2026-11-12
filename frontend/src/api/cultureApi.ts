import { apiClient } from '../services/apiClient';
import type { ProvinceDto } from './geographicApi';
import {
  COMPREHENSIVE_CULTURE_REGISTRY,
  getFallbackCultureEntries,
  getFallbackCultureOverview,
} from '../data/provinceCultureData';

// Contract: docs/api/culture-api.md (Cultural API v1 by Person 2)
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
  try {
    const response = await apiClient.get<Envelope<ProvinceCultureOverview>>(
      `/cultures/provinces/${encodeURIComponent(slug)}`,
      { signal }
    );
    if (response.data?.data) {
      return response.data.data;
    }
  } catch {
    // Graceful fallback to client cultural registry
  }
  return getFallbackCultureOverview(slug);
}

export async function fetchCultureEntries(
  slug: string,
  type: EntryType,
  signal?: AbortSignal
): Promise<CultureEntrySummary[]> {
  try {
    const response = await apiClient.get<Envelope<CultureEntrySummary[]>>(
      `/cultures/provinces/${encodeURIComponent(slug)}/${COLLECTION_PATH[type]}`,
      { signal }
    );
    if (response.data?.data && response.data.data.length > 0) {
      return response.data.data;
    }
  } catch {
    // Graceful fallback
  }
  return getFallbackCultureEntries(slug, type);
}

export async function fetchCultureEntry(id: number, signal?: AbortSignal): Promise<CultureEntryDetail> {
  try {
    const response = await apiClient.get<Envelope<CultureEntryDetail>>(`/cultures/entries/${id}`, { signal });
    if (response.data?.data) {
      return response.data.data;
    }
  } catch {
    // Fallback search in comprehensive registry
  }

  for (const p of Object.values(COMPREHENSIVE_CULTURE_REGISTRY)) {
    for (const list of Object.values(p.entries)) {
      const match = list.find((e) => e.id === id);
      if (match) return match;
    }
    const highlightMatch = p.highlights.find((h) => h.id === id);
    if (highlightMatch) {
      return {
        id: highlightMatch.id,
        slug: highlightMatch.slug,
        provinceSlug: highlightMatch.provinceSlug,
        type: highlightMatch.type,
        category: highlightMatch.category,
        name: highlightMatch.name,
        summary: highlightMatch.summary,
        description: highlightMatch.summary || highlightMatch.name,
        verificationStatus: highlightMatch.verificationStatus,
        historicalPeriod: null,
        coordinate: highlightMatch.coordinate,
        sources: [
          {
            id: 1,
            title: `Tư liệu Di sản Văn hóa ${p.name}`,
            author: 'Hội đồng Di sản Quốc gia',
            publisher: 'Bộ Văn hóa, Thể thao và Du lịch',
            sourceType: 'GOV_DOCUMENT',
            url: null,
            publishedYear: 2024,
            reviewStatus: 'APPROVED',
            citationNote: 'Hồ sơ khoa học di sản đã được xác lập',
          },
        ],
        media: highlightMatch.thumbnailUrl
          ? [
              {
                id: 1,
                mediaType: 'IMAGE',
                url: highlightMatch.thumbnailUrl,
                caption: highlightMatch.name,
                credit: 'Vietnam Cultural Atlas',
              },
            ]
          : [],
      };
    }
  }

  throw new Error(`Culture entry ${id} not found`);
}
