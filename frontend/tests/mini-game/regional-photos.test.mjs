import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { regionalPhotos } from '../../.mini-game-test-build/content/regional-media.js';
import { regionalStories } from '../../.mini-game-test-build/content/regions.js';
import { buildRegionalImages } from '../../.mini-game-test-build/content/regional-builder.js';
import { resolveRegionalPhoto } from '../../.mini-game-test-build/regional-photo.js';

test('each regional place/food choice has an attributed real photograph', () => {
  const choices = regionalStories.flatMap(story => [...story.morning, ...story.lunch]);
  assert.equal(choices.length, 40);
  assert.equal(regionalPhotos.length, 40);
  assert.equal(new Set(regionalPhotos.map(photo => photo.choiceId)).size, 40);

  for (const choice of choices) assert.ok(regionalPhotos.some(photo => photo.choiceId === choice.id), choice.id);
});

for (const story of regionalStories) {
  test(story.slug + ': every image slot resolves and afternoon uses the morning actually played', () => {
    for (const image of buildRegionalImages(story)) {
      const resolved=resolveRegionalPhoto(image.id);
      assert.ok(resolved, image.id);
      assert.equal(resolved.province, story.name);
    }
    for (const choice of story.morning) {
      for (const slot of ['intro','pause','postcard','postcard-scene','postcard-colour']) {
        const resolved=resolveRegionalPhoto(story.slug+':'+slot,choice.id);
        assert.equal(resolved.photo.choiceId,choice.id);
      }
    }
    for (const choice of [...story.morning,...story.lunch]) {
      assert.equal(resolveRegionalPhoto(story.slug+':'+choice.id).photo.choiceId,choice.id);
    }
    assert.notEqual(resolveRegionalPhoto(story.slug+':postcard-scene').role,resolveRegionalPhoto(story.slug+':postcard-colour').role);
  });
}
test('a choice from another province cannot supply this province photo', () => {
  const first=regionalStories[0], other=regionalStories[1];
  assert.equal(resolveRegionalPhoto(first.slug+':pause',other.morning[0].id).photo.choiceId,first.morning[0].id);
  assert.equal(resolveRegionalPhoto('unsupported:intro'),null);
  assert.equal(resolveRegionalPhoto(first.slug+':unknown'),null);
});
test('all regional JPEGs match their hash and human-readable credit entry', () => {
  const credits=readFileSync(new URL('../../public/mini-game/regions/CREDITS.md',import.meta.url),'utf8');
  for(const photo of regionalPhotos) {
    assert.equal(photo.kind,'photo');
    assert.equal(photo.needsIdentityReview,false,photo.id+' must be reviewed');
    assert.ok(photo.src.startsWith('/mini-game/regions/'));
    const bytes=readFileSync(new URL('../../public'+photo.src,import.meta.url));
    assert.equal(bytes[0],0xff);
    assert.equal(bytes[1],0xd8);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),photo.sha256,photo.id);
    assert.ok(bytes.length<1_000_000,photo.id+' should use a bounded local thumbnail');
    assert.ok(photo.width>0&&photo.height>0);
    assert.equal(new URL(photo.sourceUrl).hostname,'commons.wikimedia.org');
    assert.ok(photo.author.trim());
    assert.ok(photo.caption.length>10&&photo.alt.length>10);
    assert.ok(!/noncommercial|no.?derivatives|\bNC\b|\bND\b/i.test(photo.license));
    if(photo.license.startsWith('CC')) assert.equal(new URL(photo.licenseUrl).hostname,'creativecommons.org');
    assert.ok(credits.includes(photo.id)&&credits.includes(photo.author)&&credits.includes(photo.sourceUrl)&&credits.includes(photo.sha256),photo.id);
  }
});
