import { hanoiScenario } from './content/hanoi.js';
import { regionalStories } from './content/regions.js';
import { buildRegionalImages, buildRegionalScenario } from './content/regional-builder.js';
import type { Scenario } from './scenario.js';

export const scenarios: readonly Scenario[] = [hanoiScenario, ...regionalStories.map(buildRegionalScenario)];
export const scenarioById = (id: string) => scenarios.find(scenario => scenario.id === id);
export const scenarioByProvince = (slug: string) => scenarios.find(scenario => scenario.provinceSlug === slug);
export const regionalImages = Object.fromEntries(regionalStories.flatMap(story => buildRegionalImages(story)).map(image => [image.id, image]));
