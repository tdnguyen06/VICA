import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createProvinceCatalog, getCatalogPage, chooseRandomExperience } from '../../.mini-game-test-build/catalog.js';

const provinces = JSON.parse(readFileSync(new URL('../../src/data/provinces-v1.json', import.meta.url), 'utf8')).provinces;
const experience = { provinceSlug: 'ha-noi', scenarioId: 'hanoi-one-day', title: 'Một ngày làm người Hà Nội', path: '/experiences/ha-noi' };
const catalog = createProvinceCatalog(provinces, [experience]);
test('all 63 provinces appear once; only Hanoi is playable, without display-only islands', () => {
  assert.equal(catalog.length, 63);
  assert.equal(new Set(catalog.map(p => p.slug)).size, 63);
  assert.deepEqual(catalog.filter(p => p.status === 'ready').map(p => p.slug), ['ha-noi']);
  assert.equal(catalog.some(p => ['hoang-sa', 'truong-sa'].includes(p.slug)), false);
  assert.ok(catalog.filter(p => p.status === 'coming-soon').every(p => p.experience === null));
});
test('search handles Vietnamese marks, đ, case, spacing and slug separators', () => {
  for (const q of ['Hà Nội', 'ha noi', 'HA-NOI', '  ha   noi  ']) assert.deepEqual(getCatalogPage(catalog, q, 1).items.map(p => p.slug), ['ha-noi']);
  for (const q of ['Đà Nẵng', 'da nang', 'DA-NANG']) assert.deepEqual(getCatalogPage(catalog, q, 1).items.map(p => p.slug), ['da-nang']);
  assert.equal(getCatalogPage(catalog, '  ', 1).total, 63);
});
test('seven pages cover exactly the catalog in order without duplicates or mutation', () => {
  const before = JSON.stringify(catalog);
  const pages = Array.from({ length: 7 }, (_, i) => getCatalogPage(catalog, '', i + 1));
  assert.ok(pages.every(p => p.pageCount === 7 && p.items.length === 9));
  assert.deepEqual(pages.flatMap(p => p.items.map(row => row.slug)), catalog.map(p => p.slug));
  assert.equal(JSON.stringify(catalog), before);
});
test('invalid page values clamp; filtering reduces stale page to the last available page', () => {
  for (const page of [NaN, Infinity, -20, 0, 2.5]) assert.equal(getCatalogPage(catalog, '', page).page, 1);
  assert.equal(getCatalogPage(catalog, '', 99).page, 7);
  assert.equal(getCatalogPage(catalog, 'ha noi', 7).page, 1);
  for (const size of [0, -1, 1.5, 64, NaN]) assert.throws(() => getCatalogPage(catalog, '', 1, false, size));
});
test('empty results and ready-only filtering cannot expose unfinished experiences', () => {
  const empty = getCatalogPage(catalog, 'khong-co-tinh-nay', 9);
  assert.deepEqual([empty.items.length, empty.total, empty.pageCount, empty.page], [0, 0, 0, 1]);
  assert.equal(getCatalogPage(catalog, 'da nang', 1, true).total, 0);
  assert.deepEqual(getCatalogPage(catalog, '', 1, true).items.map(p => p.slug), ['ha-noi']);
});
test('random uses all playable entries regardless of search and never chooses unfinished provinces', () => {
  const multiple = createProvinceCatalog(provinces, [experience, { ...experience, provinceSlug: 'da-nang', scenarioId: 'test-only', path: '/test-only' }]);
  const ready = multiple.filter(p => p.status === 'ready');
  assert.equal(getCatalogPage(multiple, 'khong-co', 1).total, 0);
  assert.equal(chooseRandomExperience(multiple, () => 0).slug, ready[0].slug);
  assert.equal(chooseRandomExperience(multiple, () => 0.99999).slug, ready[1].slug);
  for (let i = 0; i < 100; i++) assert.equal(chooseRandomExperience(catalog, () => i / 100).slug, 'ha-noi');
  assert.equal(chooseRandomExperience(createProvinceCatalog(provinces, [])), null);
  for (const sample of [1, -1, NaN, Infinity]) assert.throws(() => chooseRandomExperience(catalog, () => sample));
});
test('duplicate and unknown catalog registrations fail explicitly', () => {
  assert.throws(() => createProvinceCatalog(provinces, [experience, experience]));
  assert.throws(() => createProvinceCatalog([...provinces, provinces[0]], [experience]));
  assert.throws(() => createProvinceCatalog(provinces, [{ ...experience, provinceSlug: 'unknown' }]));
});
