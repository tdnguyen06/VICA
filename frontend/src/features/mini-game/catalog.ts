/** Province selection is independent of gameplay state, storage and network. */
export interface CatalogProvince { readonly slug: string; readonly name: string; readonly adminUnit: string; }
export interface AvailableExperience {
  readonly provinceSlug: string;
  readonly scenarioId: string;
  readonly title: string;
  readonly path: string;
}
export type ProvinceExperience = CatalogProvince & (
  | { readonly status: 'ready'; readonly experience: AvailableExperience }
  | { readonly status: 'coming-soon'; readonly experience: null }
);

export function createProvinceCatalog(provinces: readonly CatalogProvince[], experiences: readonly AvailableExperience[]): readonly ProvinceExperience[] {
  const byProvince = new Map(experiences.map(experience => [experience.provinceSlug, experience]));
  if (byProvince.size !== experiences.length) throw new Error('Duplicate experience province');
  const slugs = new Set(provinces.map(province => province.slug));
  if (slugs.size !== provinces.length || experiences.some(experience => !slugs.has(experience.provinceSlug))) {
    throw new Error('Invalid catalog province');
  }
  return provinces.map(province => {
    const experience = byProvince.get(province.slug);
    return experience ? { ...province, status: 'ready' as const, experience }
      : { ...province, status: 'coming-soon' as const, experience: null };
  }).sort((a, b) => a.name.localeCompare(b.name, 'vi') || a.slug.localeCompare(b.slug));
}

export function normalizeProvinceSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().trim().replace(/[-\s]+/g, ' ');
}

export function getCatalogPage(catalog: readonly ProvinceExperience[], query: string, requestedPage: number, readyOnly = false, pageSize = 9) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 63) throw new Error('Invalid catalog page size');
  const tokens = normalizeProvinceSearch(query).split(' ').filter(Boolean);
  const matches = catalog.filter(province => (!readyOnly || province.status === 'ready') &&
    tokens.every(token => normalizeProvinceSearch(province.name + ' ' + province.slug).includes(token)));
  const pageCount = Math.ceil(matches.length / pageSize);
  const page = Math.min(Math.max(Number.isSafeInteger(requestedPage) ? requestedPage : 1, 1), Math.max(pageCount, 1));
  return { items: matches.slice((page - 1) * pageSize, page * pageSize), page, pageCount, total: matches.length, pageSize };
}

/** Random draws from all playable provinces, independent of current search/page. */
export function chooseRandomExperience(catalog: readonly ProvinceExperience[], random: () => number = Math.random) {
  const ready = catalog.filter((province): province is ProvinceExperience & { status: 'ready'; experience: AvailableExperience } => province.status === 'ready');
  if (!ready.length) return null;
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new Error('Invalid random sample');
  return ready[Math.floor(sample * ready.length)] ?? null;
}
