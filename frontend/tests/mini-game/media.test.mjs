import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { hanoiScenario } from '../../.mini-game-test-build/content/hanoi.js';
import { hanoiVisuals } from '../../.mini-game-test-build/content/media.js';
import { decodeGameSave } from '../../.mini-game-test-build/save-validation.js';

for (const asset of Object.values(hanoiVisuals).filter(asset => asset.kind === 'photo')) {
  test('bundled photo and attribution metadata: ' + asset.id, () => {
    const data = readFileSync(new URL('../../public' + asset.src, import.meta.url));
    assert.equal(data[0], 0xff);
    assert.equal(data[1], 0xd8);
    assert.equal(createHash('sha256').update(data).digest('hex'), asset.sha256);
    assert.ok(data.length < 500_000, 'Serve bounded local images rather than multi-megabyte originals');
    assert.ok(asset.alt.length > 10);
    assert.ok(asset.caption.length > 10);
    assert.ok(asset.author);
    assert.equal(new URL(asset.sourceUrl).hostname, 'commons.wikimedia.org');
    assert.ok(['CC BY-SA 4.0', 'CC BY 4.0', 'Public domain'].includes(asset.license));
    if (asset.license.startsWith('CC')) assert.equal(new URL(asset.licenseUrl).hostname, 'creativecommons.org');
    assert.equal(asset.src.startsWith('/mini-game/hanoi/'), true);
    assert.ok(asset.changes.includes('CSS'));
    const credits = readFileSync(new URL('../../public/mini-game/hanoi/CREDITS.md', import.meta.url), 'utf8');
    assert.ok(credits.includes(asset.id));
    assert.ok(credits.includes(asset.author));
    assert.ok(credits.includes(asset.sourceUrl));
    assert.ok(credits.includes(asset.sha256));
  });
}

test('every intro, choice-scene and result image reference resolves to a local visual', () => {
  const refs = [
    hanoiScenario.introImageRef,
    ...Object.values(hanoiScenario.scenes).flatMap(scene =>
      [scene.imageRef, ...scene.choices.map(choice => choice.result.imageRef)]),
  ];
  for (const ref of refs) {
    assert.ok(ref, 'All authored screens should have a visual');
    assert.ok(hanoiVisuals[ref], 'Unknown visual: ' + ref);
    assert.ok(hanoiScenario.imageRefs.includes(ref));
  }
  assert.notEqual(hanoiVisuals['cup-geometric'].id, hanoiVisuals['cup-leaves'].id);
});

test('older content version is rejected without silently migrating progress', () => {
  const oldSave = JSON.stringify({ schemaVersion: 1, state: {
    runId: 'pre-image-save', scenarioId: 'hanoi-one-day', scenarioVersion: '0.1.0-draft',
    revision: 4, choices: [
      { sceneId: 'morning', choiceId: 'morning-walk' },
      { sceneId: 'lunch', choiceId: 'lunch-pho' },
    ], phase: 'result', sceneId: 'lunch', choiceId: 'lunch-pho',
  } });
  const restored = decodeGameSave(hanoiScenario, oldSave);
  assert.equal(restored.ok, false);
  assert.equal(restored.reason, 'incompatible_scenario');
});

test('all authored Hanoi visuals are real photographs; cup outcomes use different files', () => {
  for (const visual of Object.values(hanoiVisuals)) assert.equal(visual.kind,'photo',visual.id);
  assert.notEqual(hanoiVisuals['cup-geometric'].sha256,hanoiVisuals['cup-leaves'].sha256);
});
