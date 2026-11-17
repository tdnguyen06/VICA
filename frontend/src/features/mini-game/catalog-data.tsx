import registry from '../../data/provinces-v1.json';
import { createProvinceCatalog } from './catalog';
import { scenarios } from './scenarios';
export const provinceExperiences = createProvinceCatalog(registry.provinces, scenarios.map(scenario => ({
  provinceSlug: scenario.provinceSlug, scenarioId: scenario.id, title: scenario.title, path: '/experiences/' + scenario.provinceSlug,
})));
