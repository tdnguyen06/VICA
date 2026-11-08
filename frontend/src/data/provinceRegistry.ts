import registry from './provinces-v1.json';

export function provinceSourceName(slug: string | null): string {
  return registry.provinces.find(province => province.slug === slug)?.sourceName ?? '';
}

const territoryProvinces: Record<string, string> = {
  'hoang-sa': 'da-nang', 'truong-sa': 'khanh-hoa', 'con-dao': 'ba-ria-vung-tau',
  'phu-quoc': 'kien-giang', 'ly-son': 'quang-ngai', 'bach-long-vi': 'hai-phong',
};

export function provinceSlugFromTerritory(id: string): string | null {
  return territoryProvinces[id] ?? null;
}

export function provinceSlugFromProperties(properties: Record<string, unknown>): string | null {
  const isDisplayOnly = properties.is_sovereignty === true || properties.is_sovereignty === 'true';
  if (isDisplayOnly) {
    return registry.displayOnlyFeatures.find(feature => feature.note === properties.Note)?.provinceSlug ?? null;
  }
  return registry.provinces.find(province => province.sourceName === properties.Name)?.slug ?? null;
}
