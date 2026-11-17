import { useQuery } from '@tanstack/react-query';
import {
  fetchCultureEntries,
  fetchCultureEntry,
  fetchCultureOverview,
  type EntryType,
} from '../api/cultureApi';

const FIVE_MINUTES = 5 * 60 * 1000;

// No placeholder/fallback data: content without sources must never be shown as if it came from the API.
export const useCultureOverview = (slug: string | null) =>
  useQuery({
    queryKey: ['culture', slug, 'overview'],
    queryFn: ({ signal }) => fetchCultureOverview(slug as string, signal),
    enabled: slug !== null,
    staleTime: FIVE_MINUTES,
    retry: 1,
  });

export const useCultureEntries = (slug: string | null, type: EntryType | null) =>
  useQuery({
    queryKey: ['culture', slug, 'entries', type],
    queryFn: ({ signal }) => fetchCultureEntries(slug as string, type as EntryType, signal),
    enabled: slug !== null && type !== null,
    staleTime: FIVE_MINUTES,
    retry: 1,
  });

export const useCultureEntry = (id: number | null) =>
  useQuery({
    queryKey: ['culture', 'entry', id],
    queryFn: ({ signal }) => fetchCultureEntry(id as number, signal),
    enabled: id !== null,
    staleTime: FIVE_MINUTES,
    retry: 1,
  });