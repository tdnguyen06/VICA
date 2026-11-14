import assert from 'node:assert/strict';
import test from 'node:test';
import { hanoiScenario as scenario } from '../../.mini-game-test-build/content/hanoi.js';
import { advanceSession, beginSession, openSession, restartSession, retrySessionSave } from '../../.mini-game-test-build/session.js';
import { MINI_GAME_SAVE_KEY } from '../../.mini-game-test-build/storage.js';

function memory() {
  const data = new Map();
  const provide = () => ({ getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) });
  return { data, provide };
}
function event(game, type, choiceId) {
  return { type, expectedRunId: game.runId, expectedSceneId: game.sceneId, expectedRevision: game.revision, choiceId };
}
test('two UI entry points resume one session without creating a second run', () => {
  const disk = memory();
  let session = beginSession(scenario, disk.provide, openSession(scenario, disk.provide), 'shared-run');
  session = advanceSession(scenario, disk.provide, session, event(session.game, 'choose', 'morning-story'));
  const secondEntry = openSession(scenario, disk.provide);
  assert.deepEqual(secondEntry.game, session.game);
  assert.equal(secondEntry.game.phase, 'result');
  assert.strictEqual(beginSession(scenario, disk.provide, session, 'must-not-replace'), session);
});
test('a stale render callback cannot advance the current session twice', () => {
  const disk = memory();
  let session = beginSession(scenario, disk.provide, openSession(scenario, disk.provide), 'run');
  const click = event(session.game, 'choose', 'morning-walk');
  session = advanceSession(scenario, disk.provide, session, click);
  assert.strictEqual(advanceSession(scenario, disk.provide, session, click), session);
});
test('blocked storage supports memory-only play and later saves if no existing save is found', () => {
  const blocked = () => { throw new Error('denied'); };
  let session = beginSession(scenario, blocked, openSession(scenario, blocked), 'memory-run');
  assert.equal(session.game.phase, 'choice');
  assert.equal(session.unsaved, true);
  assert.equal(session.issue, 'unavailable');
  session = advanceSession(scenario, blocked, session, event(session.game, 'choose', 'morning-story'));
  const disk = memory();
  const saved = retrySessionSave(scenario, disk.provide, session);
  assert.equal(saved.issue, null);
  assert.equal(saved.unsaved, false);
  assert.deepEqual(openSession(scenario, disk.provide).game, session.game);
});
test('retry never overwrites an existing save discovered after storage becomes available', () => {
  const disk = memory();
  beginSession(scenario, disk.provide, openSession(scenario, disk.provide), 'other-run');
  const before = disk.data.get(MINI_GAME_SAVE_KEY);
  const blocked = () => { throw new Error('denied'); };
  const memoryRun = beginSession(scenario, blocked, openSession(scenario, blocked), 'memory-run');
  const retried = retrySessionSave(scenario, disk.provide, memoryRun);
  assert.equal(retried.issue, 'conflict');
  assert.equal(disk.data.get(MINI_GAME_SAVE_KEY), before);
});
test('corrupted progress is blocked until confirmed restart', () => {
  const disk = memory();
  disk.data.set(MINI_GAME_SAVE_KEY, '{');
  const session = openSession(scenario, disk.provide);
  assert.equal(session.issue, 'invalid');
  assert.strictEqual(beginSession(scenario, disk.provide, session, 'run'), session);
  assert.strictEqual(restartSession(scenario, disk.provide, session, 'run', false), session);
  const next = restartSession(scenario, disk.provide, session, 'run', true);
  assert.equal(next.issue, null);
  assert.equal(next.game.phase, 'intro');
});
test('write failure preserves in-memory progress and retry clears the unsaved warning', () => {
  const disk = memory();
  let session = beginSession(scenario, disk.provide, openSession(scenario, disk.provide), 'run');
  const failed = () => ({ getItem: key => disk.data.get(key) ?? null, setItem() { throw new Error('full'); } });
  session = advanceSession(scenario, failed, session, event(session.game, 'choose', 'morning-walk'));
  assert.equal(session.unsaved, true);
  assert.equal(session.game.phase, 'result');
  session = retrySessionSave(scenario, disk.provide, session);
  assert.equal(session.unsaved, false);
  assert.equal(openSession(scenario, disk.provide).game.phase, 'result');
});
test('conflicts freeze gameplay until the user reloads, without losing the current memory state', () => {
  const disk = memory();
  const session = { ...beginSession(scenario, disk.provide, openSession(scenario, disk.provide), 'run'), issue: 'conflict' };
  assert.strictEqual(advanceSession(scenario, disk.provide, session, event(session.game, 'choose', 'morning-story')), session);
});
