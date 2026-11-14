import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialState, transition, getCurrentResult } from '../../.mini-game-test-build/engine.js';
import { buildJournal } from '../../.mini-game-test-build/journal.js';
import { hanoiScenario as scenario } from '../../.mini-game-test-build/content/hanoi.js';
import { hanoiVisuals } from '../../.mini-game-test-build/content/media.js';
import { culturalSources } from '../../.mini-game-test-build/content/sources.js';

// These route expectations are the agreed product scope, not generated from the scene graph.
const mornings = ['morning-walk', 'morning-story'];
const lunches = ['lunch-bun-cha', 'lunch-pho'];
const afternoons = [
  ['afternoon-pottery', 'pottery', 'pottery-geometric'],
  ['afternoon-pottery', 'pottery', 'pottery-leaves'],
  ['afternoon-cafe', 'cafe', 'cafe-street'],
  ['afternoon-cafe', 'cafe', 'cafe-chat'],
];
const labels = {
  'morning-walk': 'Đi dạo, quan sát đời sống ở Hồ Gươm',
  'morning-story': 'Khám phá câu chuyện về Hồ Gươm',
  'lunch-bun-cha': 'Ăn bún chả',
  'lunch-pho': 'Ăn phở',
  'pottery-geometric': 'Trang trí cốc bằng họa tiết hình học',
  'pottery-leaves': 'Trang trí cốc bằng họa tiết cây lá',
  'cafe-street': 'Ngồi nhìn phố ở quán cà phê',
  'cafe-chat': 'Ngồi trò chuyện ở quán cà phê',
};

let runSequence = 0;
function newRun(story = scenario) {
  return createInitialState(story, 'test-run-' + ++runSequence);
}
function eventFor(state, type, choiceId) {
  return { type, expectedRunId: state.runId, expectedSceneId: state.sceneId, expectedRevision: state.revision, ...(choiceId ? { choiceId } : {}) };
}
function act(state, type, choiceId, story = scenario) {
  const outcome = transition(story, state, eventFor(state, type, choiceId));
  assert.equal(outcome.ok, true, outcome.reason);
  return outcome.state;
}
function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}
function reject(state, event, reason) {
  const snapshot = structuredClone(state);
  freezeDeep(state);
  const outcome = transition(scenario, state, event);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, reason);
  assert.strictEqual(outcome.state, state);
  assert.deepEqual(state, snapshot);
}
function reachLunch() {
  let state = act(newRun(), 'start');
  state = act(state, 'choose', 'morning-walk');
  return act(state, 'continue');
}

for (const morning of mornings) {
  for (const lunch of lunches) {
    for (const [activity, detailScene, detail] of afternoons) {
      test('complete journey and exact journal: ' + [morning, lunch, detail].join(' / '), () => {
        let state = newRun();
        assert.equal(state.phase, 'intro');
        assert.equal(buildJournal(scenario, state), null);
        state = act(state, 'start');

        const route = [
          ['morning', morning, 'lunch'],
          ['lunch', lunch, 'afternoon'],
          ['afternoon', activity, detailScene],
          [detailScene, detail, 'journal'],
        ];
        for (const [sceneId, choiceId, nextSceneId] of route) {
          assert.equal(state.sceneId, sceneId);
          assert.equal(state.phase, 'choice');
          assert.equal(getCurrentResult(scenario, state), null);
          const before = freezeDeep(state);
          state = act(state, 'choose', choiceId);
          assert.equal(state.sceneId, sceneId, 'Choosing must not skip the result');
          assert.equal(state.phase, 'result');
          assert.equal(state.choiceId, choiceId);
          assert.equal(state.choices.length, before.choices.length + 1);
          assert.equal(buildJournal(scenario, state), null, 'No completed journal before the final Continue');
          const result = getCurrentResult(scenario, state);
          assert.ok(result);
          if (choiceId === 'cafe-chat') {
            const text = result.blocks.map(block => block.text).join(' ');
            assert.ok(text.includes(scenario.recallByChoice[morning]));
            assert.ok(text.includes(scenario.recallByChoice[lunch]));
            assert.equal(text.includes('{morning}'), false);
            assert.equal(text.includes('[Chưa trải nghiệm]'), false);
          }
          state = act(state, 'continue');
          assert.equal(state.sceneId, nextSceneId);
          assert.equal(state.phase, nextSceneId === 'journal' ? 'completed' : 'choice');
          assert.equal('choiceId' in state, false);
        }

        const journal = buildJournal(scenario, state);
        assert.ok(journal);
        assert.deepEqual(journal.entries.map(entry => entry.choiceId), [morning, lunch, detail]);
        assert.deepEqual(journal.entries.map(entry => entry.sceneId), ['morning', 'lunch', detailScene]);
        assert.deepEqual(journal.entries.map(entry => entry.label), [labels[morning], labels[lunch], labels[detail]]);
        assert.deepEqual(journal.knowledge.map(note => note.id), [morning + '-note', ...(morning === 'morning-story' ? ['morning-history-note'] : []), lunch + '-note']);
        const imageByChoice = {
          'morning-walk': 'hanoi-morning-walk', 'morning-story': 'hanoi-lake',
          'lunch-bun-cha': 'hanoi-bun-cha', 'lunch-pho': 'hanoi-pho',
          'pottery-geometric': 'cup-geometric', 'pottery-leaves': 'cup-leaves',
          'cafe-street': 'hanoi-cafe', 'cafe-chat': 'hanoi-cafe',
        };
        assert.deepEqual(journal.imageRefs, [imageByChoice[morning], imageByChoice[lunch], imageByChoice[detail]]);
        assert.deepEqual(journal.sourceRefs, [morning === 'morning-story' ? 'heritage-hoan-kiem' : 'tourism-photo-etiquette', 'tourism-hanoi-food']);
        assert.ok(journal.ending.text.includes(scenario.recallByChoice[morning]));
        assert.ok(journal.ending.text.includes(scenario.recallByChoice[lunch]));
        assert.ok(journal.ending.text.includes(detail.startsWith('pottery-') ? 'cốc' : 'cà phê'));
        assert.equal(journal.ending.text.includes('[Chưa trải nghiệm]'), false);
        assert.equal(state.choices.length, 4);
        for (const type of ['start', 'choose', 'continue']) {
          reject(state, eventFor(state, type, 'morning-story'), 'invalid_action');
        }
      });
    }
  }
}

test('cannot start twice or continue before choosing', () => {
  const intro = newRun();
  reject(intro, eventFor(intro, 'continue'), 'invalid_action');
  reject(intro, eventFor(intro, 'choose', 'morning-walk'), 'invalid_action');
  const morning = act(intro, 'start');
  reject(morning, eventFor(morning, 'start'), 'invalid_action');
  reject(morning, eventFor(morning, 'continue'), 'invalid_action');
});

test('unknown and wrong-scene choices preserve the state', () => {
  const morning = act(newRun(), 'start');
  for (const choiceId of ['not-a-choice', 'lunch-pho', 'cafe-chat']) {
    reject(morning, eventFor(morning, 'choose', choiceId), 'invalid_choice');
  }
  const lunch = reachLunch();
  reject(lunch, eventFor(lunch, 'choose', 'morning-story'), 'invalid_choice');
});

test('a confirmed choice is locked even when the event has a fresh revision', () => {
  const lunch = reachLunch();
  const result = act(lunch, 'choose', 'lunch-bun-cha');
  reject(result, eventFor(result, 'choose', 'lunch-pho'), 'invalid_action');
  reject(result, eventFor(result, 'choose', 'lunch-bun-cha'), 'invalid_action');
  assert.equal(getCurrentResult(scenario, result).journalLabel, labels['lunch-bun-cha']);
});

test('double clicks and delayed events cannot skip results or select a later scene', () => {
  const intro = newRun();
  const oldStart = eventFor(intro, 'start');
  const morning = act(intro, 'start');
  reject(morning, oldStart, 'stale_event');
  const oldChoice = eventFor(morning, 'choose', 'morning-walk');
  const result = act(morning, 'choose', 'morning-walk');
  reject(result, oldChoice, 'stale_event');
  const oldContinue = eventFor(result, 'continue');
  const lunch = act(result, 'continue');
  reject(lunch, oldContinue, 'stale_event');
  reject(lunch, oldChoice, 'stale_event');
  const lunchResult = act(lunch, 'choose', 'lunch-pho');
  reject(lunchResult, oldContinue, 'stale_event');
  assert.equal(lunchResult.phase, 'result');
  assert.equal(lunchResult.sceneId, 'lunch');
});

test('new runs are independent and do not retain choices from another run', () => {
  const original = act(reachLunch(), 'choose', 'lunch-pho');
  const next = newRun();
  const started = act(next, 'start');
  assert.equal(started.phase, 'choice');
  assert.deepEqual(started.choices, []);
  assert.equal(original.phase, 'result');
  assert.equal(original.choiceId, 'lunch-pho');
});

test('scenario identity/version mismatch is rejected, not silently migrated', () => {
  for (const mismatch of [{ scenarioId: 'other-story' }, { scenarioVersion: 'future-version' }]) {
    const state = { ...newRun(), ...mismatch };
    reject(state, eventFor(state, 'start'), 'scenario_mismatch');
    assert.equal(buildJournal(scenario, { ...state, phase: 'completed', sceneId: 'journal' }), null);
  }
});

test('authored content resolves all graph and cultural source references', () => {
  assert.equal(scenario.editorialStatus, 'review-ready');
  assert.deepEqual(new Set(scenario.imageRefs), new Set(Object.keys(hanoiVisuals)));
  assert.deepEqual(new Set(scenario.sourceRefs), new Set(Object.keys(culturalSources)));
  const ids = new Set();
  for (const [id, scene] of Object.entries(scenario.scenes)) {
    assert.equal(scene.id, id);
    assert.equal(scene.choices.length, 2);
    for (const choice of scene.choices) {
      assert.equal(ids.has(choice.id), false, 'Choice IDs must be stable and unique');
      ids.add(choice.id);
      assert.ok(choice.nextSceneId === 'journal' || scenario.scenes[choice.nextSceneId]);
      assert.ok(hanoiVisuals[choice.result.imageRef]);
      choice.result.knowledgeIds.forEach(knowledgeId =>
        assert.ok(scenario.knowledge.some(note => note.id === knowledgeId)));
      choice.result.blocks.forEach(block => assert.equal(block.editorialStatus, block.kind === 'culture' ? 'source-reviewed' : 'authored'));
    }
  }
  scenario.knowledge.forEach(note => {
    assert.equal(note.verification, 'source-reviewed');
    assert.ok(note.sourceIds.length);
    note.sourceIds.forEach(id => assert.ok(culturalSources[id]));
  });
});

test('a late event from a previous run is rejected even at the same scene and revision', () => {
  const oldRun = act(newRun(), 'start');
  const newState = act(newRun(), 'start');
  assert.equal(oldRun.sceneId, newState.sceneId);
  assert.equal(oldRun.revision, newState.revision);
  reject(newState, eventFor(oldRun, 'choose', 'morning-story'), 'stale_event');
  assert.deepEqual(newState.choices, []);
});

test('journal filters image and source references to the played route', () => {
  // Synthetic reference IDs only; these are not real assets or verified cultural sources.
  const story = structuredClone(scenario);
  for (const scene of Object.values(story.scenes)) {
    for (const choice of scene.choices) {
      choice.result.imageRef = 'fixture-image-' + choice.id;
    }
  }
  for (const note of story.knowledge) {
    note.sourceIds = ['fixture-source-' + note.id];
  }
  story.sourceRefs = story.knowledge.flatMap(note => note.sourceIds);
  story.imageRefs = Object.values(story.scenes).flatMap(scene =>
    scene.choices.map(choice => choice.result.imageRef));
  let state = act(newRun(story), 'start', undefined, story);
  for (const choiceId of ['morning-story', 'lunch-pho', 'afternoon-cafe', 'cafe-chat']) {
    state = act(state, 'choose', choiceId, story);
    state = act(state, 'continue', undefined, story);
  }
  const journal = buildJournal(story, state);
  assert.deepEqual(journal.imageRefs, [
    'fixture-image-morning-story', 'fixture-image-lunch-pho', 'fixture-image-cafe-chat',
  ]);
  assert.deepEqual(journal.sourceRefs, [
    'fixture-source-morning-story-note', 'fixture-source-morning-history-note', 'fixture-source-lunch-pho-note',
  ]);
  assert.equal(JSON.stringify(journal).includes('fixture-image-pottery'), false);
  assert.equal(JSON.stringify(journal).includes('fixture-source-lunch-bun-cha'), false);
});

test('Hanoi named dialogue recalls only the lived moments and survives journal/reload rendering', () => {
  const morningMemories = { 'morning-walk': 'xin phép chụp ảnh', 'morning-story': 'phân biệt truyền thuyết' };
  const lunchMemories = { 'lunch-bun-cha': 'bữa bún chả', 'lunch-pho': 'bát phở' };
  for (const morning of mornings) for (const lunch of lunches) {
    let state = act(newRun(), 'start');
    for (const choice of [morning, lunch, 'afternoon-cafe']) {
      state = act(state, 'choose', choice); state = act(state, 'continue');
    }
    state = act(state, 'choose', 'cafe-chat');
    const blocks = getCurrentResult(scenario, structuredClone(state)).blocks;
    const text = blocks.map(block => block.text).join(' ');
    assert.ok(text.includes(morningMemories[morning]));
    assert.ok(text.includes(lunchMemories[lunch]));
    for (const [id, memory] of Object.entries({...morningMemories,...lunchMemories})) {
      if (id !== morning && id !== lunch) assert.equal(text.includes(memory),false);
    }
    assert.equal(/\{[^}]+\}|Người bạn:/.test(text),false);
    assert.deepEqual([...new Set(blocks.map(block=>block.speaker).filter(Boolean))].sort(), ['An','Linh']);
    const journal = buildJournal(scenario,act(state,'continue'));
    assert.deepEqual(journal.entries.at(-1).result.blocks,blocks);
  }
});
