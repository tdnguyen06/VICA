import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialState, transition, getCurrentResult } from '../../.mini-game-test-build/engine.js';
import { buildJournal } from '../../.mini-game-test-build/journal.js';
import { hanoiScenario as scenario } from '../../.mini-game-test-build/content/hanoi.js';
import { decodeGameSave, SAVE_SCHEMA_VERSION, MAX_SAVE_LENGTH } from '../../.mini-game-test-build/save-validation.js';
import { MINI_GAME_SAVE_KEY, loadGame, saveGame, applyAndSave, restartGame } from '../../.mini-game-test-build/storage.js';

let sequence = 0;
function initial() { return createInitialState(scenario, 'storage-test-' + ++sequence); }
function eventFor(state, type, choiceId) {
  return { type, expectedRunId: state.runId, expectedSceneId: state.sceneId, expectedRevision: state.revision,
    ...(choiceId ? { choiceId } : {}) };
}
function act(state, type, choiceId) {
  const result = transition(scenario, state, eventFor(state, type, choiceId));
  assert.equal(result.ok, true);
  return result.state;
}
function memory(entries = []) {
  const data = new Map(entries);
  let reads = 0;
  let writes = 0;
  const port = {
    getItem(key) { reads++; return data.get(key) ?? null; },
    setItem(key, value) { writes++; data.set(key, value); },
  };
  return { data, port, provide: () => port, get reads() { return reads; }, get writes() { return writes; } };
}
function encoded(state) { return JSON.stringify({ schemaVersion: SAVE_SCHEMA_VERSION, state }); }
function routeStates(morning = 'morning-walk', lunch = 'lunch-bun-cha', activity = 'afternoon-cafe', detail = 'cafe-chat') {
  let state = initial();
  const states = [state];
  state = act(state, 'start');
  states.push(state);
  for (const choice of [morning, lunch, activity, detail]) {
    state = act(state, 'choose', choice); states.push(state);
    state = act(state, 'continue'); states.push(state);
  }
  return states;
}

const afternoons = [
  ['afternoon-pottery', 'pottery-geometric'],
  ['afternoon-pottery', 'pottery-leaves'],
  ['afternoon-cafe', 'cafe-street'],
  ['afternoon-cafe', 'cafe-chat'],
];
for (const morning of ['morning-walk', 'morning-story']) {
  for (const lunch of ['lunch-bun-cha', 'lunch-pho']) {
    for (const [activity, detail] of afternoons) {
      test('restore every screen and result: ' + [morning, lunch, detail].join(' / '), () => {
        const disk = memory([['vica_auth_token', 'fixture-auth'], ['vica_last_conversation_id', 'fixture-chat']]);
        let checkpoint = null;
        for (const state of routeStates(morning, lunch, activity, detail)) {
          const saved = saveGame(scenario, disk.provide, state, checkpoint);
          assert.equal(saved.status, 'saved');
          checkpoint = saved.checkpoint;
          const restored = loadGame(scenario, disk.provide);
          assert.equal(restored.status, 'loaded');
          assert.deepEqual(restored.state, state);
          assert.notStrictEqual(restored.state, state, 'Restore must reconstruct independent data');
          assert.deepEqual(getCurrentResult(scenario, restored.state), getCurrentResult(scenario, state));
          assert.deepEqual(buildJournal(scenario, restored.state), buildJournal(scenario, state));
        }
        assert.equal(disk.data.size, 3);
        assert.equal(disk.data.get('vica_auth_token'), 'fixture-auth');
        assert.equal(disk.data.get('vica_last_conversation_id'), 'fixture-chat');
      });
    }
  }
}

test('empty storage does not create a run or write anything', () => {
  const disk = memory();
  assert.deepEqual(loadGame(scenario, disk.provide), { status: 'empty', checkpoint: null });
  assert.equal(disk.writes, 0);
});

const lunchResult = routeStates().find(state => state.sceneId === 'lunch' && state.phase === 'result');
const invalidStates = [
  ['missing scenario', value => { delete value.scenarioId; }],
  ['missing run ID', value => { delete value.runId; }],
  ['missing phase', value => { delete value.phase; }],
  ['missing choices', value => { delete value.choices; }],
  ['missing revision', value => { delete value.revision; }],
  ['missing scene', value => { delete value.sceneId; }],
  ['missing result choice', value => { delete value.choiceId; }],
  ['blank run ID', value => { value.runId = ' '; }],
  ['oversize run ID', value => { value.runId = 'x'.repeat(201); }],
  ['non-integer revision', value => { value.revision = 4.5; }],
  ['negative revision', value => { value.revision = -1; }],
  ['wrong revision', value => { value.revision += 1; }],
  ['unknown scene', value => { value.sceneId = 'unknown'; }],
  ['unknown phase', value => { value.phase = 'unknown'; }],
  ['object phase', value => { value.phase = { toString: null }; }],
  ['array choices', value => { value.choices = [null]; }],
  ['unknown choice', value => { value.choices[1].choiceId = 'unknown'; }],
  ['wrong-scene choice', value => { value.choices[1].choiceId = 'cafe-street'; }],
  ['duplicate scene', value => { value.choices.push({ ...value.choices[0] }); }],
  ['reversed history', value => { value.choices.reverse(); }],
  ['wrong result', value => { value.choiceId = 'lunch-pho'; }],
  ['premature completion', value => { value.phase = 'completed'; value.sceneId = 'journal'; delete value.choiceId; }],
  ['extra field', value => { value.unrelatedData = 'must not persist'; }],
  ['extra choice field', value => { value.choices[0].unexpected = true; }],
  ['extra choiceId on choice screen', value => { value.phase = 'choice'; }],
  ['future story version', value => { value.scenarioVersion = 'future'; }],
  ['another story', value => { value.scenarioId = 'other'; }],
];
for (const [name, mutate] of invalidStates) {
  test('reject corrupted progress without deleting it: ' + name, () => {
    const value = structuredClone(lunchResult);
    mutate(value);
    const raw = encoded(value);
    const disk = memory([[MINI_GAME_SAVE_KEY, raw], ['vica_guest_token', 'fixture-guest']]);
    const result = loadGame(scenario, disk.provide);
    assert.equal(result.status, 'invalid');
    assert.equal(result.checkpoint, raw);
    assert.equal(disk.data.get(MINI_GAME_SAVE_KEY), raw);
    assert.equal(disk.data.get('vica_guest_token'), 'fixture-guest');
    assert.equal(disk.writes, 0);
  });
}

for (const [raw, reason] of [
  ['{', 'malformed_json'],
  ['', 'malformed_json'],
  ['null', 'invalid_shape'],
  ['[]', 'invalid_shape'],
  ['{}', 'invalid_shape'],
  [JSON.stringify({ schemaVersion: 99, state: lunchResult }), 'unsupported_schema'],
  [JSON.stringify({ schemaVersion: 1, state: null }), 'invalid_shape'],
  ['x'.repeat(MAX_SAVE_LENGTH + 1), 'save_too_large'],
]) {
  test('decode invalid envelope: ' + reason + ' / length ' + raw.length, () => {
    assert.deepEqual(decodeGameSave(scenario, raw), { ok: false, reason });
  });
}

test('cannot restore pottery combined with a cafe-only choice', () => {
  const complete = structuredClone(routeStates().at(-1));
  complete.choices[2].choiceId = 'afternoon-pottery';
  assert.equal(decodeGameSave(scenario, encoded(complete)).ok, false);
});

test('saving invalid state does not write or replace the previous save', () => {
  const raw = encoded(lunchResult);
  const disk = memory([[MINI_GAME_SAVE_KEY, raw]]);
  const result = saveGame(scenario, disk.provide, { ...lunchResult, revision: -1 }, raw);
  assert.equal(result.status, 'invalid_state');
  assert.equal(disk.data.get(MINI_GAME_SAVE_KEY), raw);
  assert.equal(disk.writes, 0);
});

test('provider, read and write failures are reported, not claimed as saved', () => {
  const blocked = () => { throw new Error('storage denied'); };
  const unreadable = () => ({ getItem() { throw new Error('read denied'); }, setItem() { assert.fail(); } });
  const quota = () => ({ getItem() { return null; }, setItem() { throw new Error('quota exceeded'); } });
  assert.equal(loadGame(scenario, blocked).status, 'unavailable');
  assert.equal(loadGame(scenario, unreadable).status, 'unavailable');
  for (const provide of [blocked, unreadable, quota]) {
    assert.equal(saveGame(scenario, provide, initial(), null).status, 'unavailable');
  }
});

test('accepted events are saved; a fresh loader resumes the exact result or next scene', () => {
  const disk = memory();
  let state = initial();
  let checkpoint = null;
  for (const [type, choiceId] of [
    ['start'], ['choose', 'morning-walk'], ['continue'], ['choose', 'lunch-pho'],
  ]) {
    const result = applyAndSave(scenario, disk.provide, state, eventFor(state, type, choiceId), checkpoint);
    assert.equal(result.status, 'applied');
    assert.equal(result.persistence.status, 'saved');
    state = result.state;
    checkpoint = result.persistence.checkpoint;
    assert.deepEqual(loadGame(scenario, disk.provide).state, state);
  }
  assert.equal(state.phase, 'result');
  assert.equal(state.choiceId, 'lunch-pho');
  const restored = loadGame(scenario, disk.provide).state;
  const confirmedChoice = applyAndSave(scenario, disk.provide, restored, eventFor(restored, 'choose', 'lunch-bun-cha'), checkpoint);
  assert.equal(confirmedChoice.status, 'rejected');
  const next = applyAndSave(scenario, disk.provide, restored, eventFor(restored, 'continue'), checkpoint);
  assert.equal(next.state.phase, 'choice');
  assert.equal(next.state.sceneId, 'afternoon');
  assert.deepEqual(loadGame(scenario, disk.provide).state, next.state);
});

test('a rejected event never attempts storage access', () => {
  const state = initial();
  const result = applyAndSave(scenario, () => { assert.fail('Must not access storage'); },
    state, eventFor(state, 'continue'), null);
  assert.equal(result.status, 'rejected');
  assert.strictEqual(result.state, state);
});

test('failed autosave preserves gameplay in memory and the last successful save', () => {
  const before = act(initial(), 'start');
  const raw = encoded(before);
  const disk = memory([[MINI_GAME_SAVE_KEY, raw]]);
  const full = () => ({ getItem: disk.port.getItem, setItem() { throw new Error('full'); } });
  const result = applyAndSave(scenario, full, before, eventFor(before, 'choose', 'morning-story'), raw);
  assert.equal(result.status, 'applied');
  assert.equal(result.persistence.status, 'unavailable');
  assert.equal(result.state.phase, 'result');
  assert.equal(result.state.choiceId, 'morning-story');
  assert.equal(disk.data.get(MINI_GAME_SAVE_KEY), raw);
  assert.deepEqual(loadGame(scenario, disk.provide).state, before);
  const retry = saveGame(scenario, disk.provide, result.state, raw);
  assert.equal(retry.status, 'saved');
  assert.deepEqual(loadGame(scenario, disk.provide).state, result.state);
});

test('stale checkpoints detect an intervening write instead of overwriting it', () => {
  const disk = memory();
  const state = initial();
  const first = saveGame(scenario, disk.provide, state, null);
  const checkpointA = loadGame(scenario, disk.provide).checkpoint;
  const next = act(state, 'start');
  const writerB = saveGame(scenario, disk.provide, next, first.checkpoint);
  assert.equal(writerB.status, 'saved');
  assert.equal(saveGame(scenario, disk.provide, state, checkpointA).status, 'conflict');
  assert.equal(disk.data.get(MINI_GAME_SAVE_KEY), writerB.checkpoint);
});

test('cancelling restart neither reads storage nor changes the current run', () => {
  const result = restartGame(scenario, () => { assert.fail('No storage access'); },
    'replacement-run', encoded(lunchResult), false);
  assert.equal(result.status, 'cancelled');
});

test('confirmed restart replaces only mini-game data after a successful write', () => {
  const raw = encoded(lunchResult);
  const disk = memory([[MINI_GAME_SAVE_KEY, raw], ['vica_auth_token', 'fixture-auth'], ['vica_guest_token', 'fixture-guest']]);
  const result = restartGame(scenario, disk.provide, 'replacement-run', raw, true);
  assert.equal(result.status, 'restarted');
  assert.equal(result.state.phase, 'intro');
  assert.deepEqual(result.state.choices, []);
  assert.equal(loadGame(scenario, disk.provide).state.runId, 'replacement-run');
  assert.equal(disk.data.get('vica_auth_token'), 'fixture-auth');
  assert.equal(disk.data.get('vica_guest_token'), 'fixture-guest');
  assert.equal(disk.data.size, 3);
});

test('restart failure or conflict preserves the old save and does not return a replacement state', () => {
  const raw = encoded(lunchResult);
  const disk = memory([[MINI_GAME_SAVE_KEY, raw]]);
  const full = () => ({ getItem: disk.port.getItem, setItem() { throw new Error('full'); } });
  const failed = restartGame(scenario, full, 'replacement-run', raw, true);
  assert.equal(failed.status, 'unavailable');
  assert.equal('state' in failed, false);
  assert.equal(disk.data.get(MINI_GAME_SAVE_KEY), raw);
  const conflict = restartGame(scenario, disk.provide, 'replacement-run', null, true);
  assert.equal(conflict.status, 'conflict');
  assert.equal(disk.data.get(MINI_GAME_SAVE_KEY), raw);
});

test('restart rejects a reused or empty run ID', () => {
  const raw = encoded(lunchResult);
  const disk = memory([[MINI_GAME_SAVE_KEY, raw]]);
  for (const id of [lunchResult.runId, '', 'x'.repeat(201)]) {
    assert.equal(restartGame(scenario, disk.provide, id, raw, true).status, 'invalid_run_id');
  }
  assert.equal(disk.writes, 0);
});

test('incompatible or corrupt saves are replaced only after explicit restart confirmation', () => {
  for (const raw of ['{', JSON.stringify({ schemaVersion: 99, state: lunchResult })]) {
    const disk = memory([[MINI_GAME_SAVE_KEY, raw]]);
    assert.equal(loadGame(scenario, disk.provide).status, 'invalid');
    assert.equal(restartGame(scenario, disk.provide, 'replacement-run', raw, false).status, 'cancelled');
    assert.equal(disk.data.get(MINI_GAME_SAVE_KEY), raw);
    assert.equal(restartGame(scenario, disk.provide, 'replacement-run', raw, true).status, 'restarted');
    assert.equal(loadGame(scenario, disk.provide).state.phase, 'intro');
  }
});
