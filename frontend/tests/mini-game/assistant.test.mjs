import assert from 'node:assert/strict';
import test from 'node:test';
import { hanoiScenario as scenario } from '../../.mini-game-test-build/content/hanoi.js';
import { createInitialState, transition } from '../../.mini-game-test-build/engine.js';
import { buildSceneQuestion, createSceneAssistant, SceneAssistantError } from '../../.mini-game-test-build/assistant/assistant.js';

function advance(state, type, choiceId) {
  const outcome = transition(scenario, state, { type, choiceId, expectedRunId: state.runId, expectedSceneId: state.sceneId, expectedRevision: state.revision });
  assert.equal(outcome.ok, true);
  return outcome.state;
}
function lunch(run = 'game-run') {
  let state = advance(createInitialState(scenario, run), 'start');
  state = advance(state, 'choose', 'morning-walk');
  state = advance(state, 'continue');
  return advance(state, 'choose', 'lunch-pho');
}
const guest = { guestToken: 'fixture-game-token', guestSessionUuid: '11111111-1111-4111-8111-111111111111' };
const answer = (extra = {}) => ({ conversationId: 42, content: 'Câu trả lời giả lập', citations: [], credentials: guest, ...extra });

test('scene context includes only actual selections, Hanoi, current scene and bounded question', () => {
  const state = lunch();
  const snapshot = structuredClone(state);
  const text = buildSceneQuestion(scenario, state, 'Phở có những thành phần nào?');
  assert.ok(text.includes('Hà Nội'));
  assert.ok(text.includes('Đi dạo, quan sát đời sống'));
  assert.ok(text.includes('Phở'));
  assert.ok(text.includes('Buổi trưa'));
  assert.equal(text.includes('Bún chả'), false);
  assert.equal(text.includes('Họa tiết cây lá'), false);
  assert.equal(text.includes('Ngồi trò chuyện'), false);
  assert.ok(text.length <= 2000);
  assert.deepEqual(state, snapshot);
  assert.ok(buildSceneQuestion(scenario, state, 'a'.repeat(500)).length <= 2000);
  assert.throws(() => buildSceneQuestion(scenario, state, 'a'.repeat(501)));
  assert.throws(() => buildSceneQuestion(scenario, createInitialState(scenario, 'intro'), 'Xin chào'));
});

test('uses a separate guest conversation and fresh scene context on each request', async () => {
  const calls = [];
  const client = createSceneAssistant({ cancel() {}, async send(request, credentials) {
    calls.push({ request, credentials }); return answer(calls.length > 1 ? { credentials: null } : {});
  } });
  const state = lunch();
  const before = structuredClone(state);
  assert.equal((await client.ask(scenario, state, 'Phở là gì?')).status, 'answered');
  const afternoon = advance(state, 'continue');
  assert.equal((await client.ask(scenario, afternoon, 'Mình đã chọn món gì?')).status, 'answered');
  assert.equal(calls[0].request.conversationId, null);
  assert.equal(calls[0].credentials, null);
  assert.equal(calls[1].request.conversationId, 42);
  assert.deepEqual(calls[1].credentials, guest);
  assert.equal(calls[1].request.guestSessionUuid, guest.guestSessionUuid);
  assert.equal(calls[1].request.provinceSlug, 'ha-noi');
  assert.ok(calls[1].request.message.includes('Buổi chiều'));
  assert.deepEqual(state, before);
});

test('new run does not reuse previous conversation or credentials', async () => {
  const calls = [];
  const client = createSceneAssistant({ cancel() {}, async send(request, credentials) {
    calls.push({ request, credentials }); return answer();
  } });
  await client.ask(scenario, lunch('old'), 'Một câu hỏi');
  await client.ask(scenario, lunch('new'), 'Câu hỏi khác');
  assert.equal(calls[1].request.conversationId, null);
  assert.equal(calls[1].credentials, null);
});

test('two assistant clients do not share guest sessions', async () => {
  const calls = [];
  const transport = () => ({ cancel() {}, async send(request, credentials) {
    calls.push({ request, credentials }); return answer();
  } });
  await createSceneAssistant(transport()).ask(scenario, lunch(), 'Câu hỏi');
  await createSceneAssistant(transport()).ask(scenario, lunch(), 'Câu hỏi khác');
  assert.equal(calls[1].request.conversationId, null);
  assert.equal(calls[1].credentials, null);
});

test('double submit sends only one request; closing ignores late response', async () => {
  let resolve;
  let count = 0;
  const client = createSceneAssistant({ cancel() {}, send() {
    count++; return new Promise(done => { resolve = done; });
  } });
  const pending = client.ask(scenario, lunch(), 'Câu hỏi');
  assert.equal((await client.ask(scenario, lunch(), 'Câu hỏi lặp')).status, 'busy');
  assert.equal(count, 1);
  client.cancel();
  resolve(answer());
  assert.equal((await pending).status, 'cancelled');
});

test('late response from old run cannot attach credentials to a new run', async () => {
  let resolveOld;
  const calls = [];
  const client = createSceneAssistant({ cancel() {}, send(request, credentials) {
    calls.push({ request, credentials });
    if (calls.length === 1) return new Promise(done => { resolveOld = done; });
    return Promise.resolve(answer());
  } });
  const old = client.ask(scenario, lunch('old'), 'Câu hỏi cũ');
  assert.equal((await client.ask(scenario, lunch('new'), 'Câu hỏi mới')).status, 'answered');
  resolveOld(answer({ conversationId: 99 }));
  assert.equal((await old).status, 'cancelled');
  assert.equal(calls[1].credentials, null);
});

test('network and timeout failures remain optional and never mutate gameplay', async () => {
  const state = lunch();
  const before = structuredClone(state);
  for (const error of [new Error('private-diagnostic-fixture'), new SceneAssistantError('timeout')]) {
    const client = createSceneAssistant({ cancel() {}, async send() { throw error; } });
    const reply = await client.ask(scenario, state, 'Câu hỏi');
    assert.equal(reply.status, 'error');
    assert.equal(reply.message.includes('private-diagnostic-fixture'), false);
    assert.deepEqual(state, before);
  }
});

test('invalid replies do not become valid answers or credentials', async () => {
  for (const reply of [
    answer({ conversationId: -1 }), answer({ content: '' }), answer({ credentials: null }),
    answer({ credentials: { guestToken: 'token', guestSessionUuid: 'not-a-uuid' } }),
  ]) {
    const client = createSceneAssistant({ cancel() {}, async send() { return reply; } });
    assert.equal((await client.ask(scenario, lunch(), 'Câu hỏi')).status, 'error');
  }
});

test('unsafe citation links are removed while legitimate source links survive', async () => {
  const client = createSceneAssistant({ cancel() {}, async send() { return answer({ citations: [
    { sourceId: 'bad', sourceName: 'Bad', url: 'javascript:alert(1)', status: 'VERIFIED' },
    { sourceId: 'good', sourceName: 'Good', url: 'https://dsvh.gov.vn/', status: 'LEGEND' },
  ] }); } });
  const result = await client.ask(scenario, lunch(), 'Câu hỏi');
  assert.equal(result.status, 'answered');
  assert.equal(result.citations[0].url, null);
  assert.equal(result.citations[1].url, 'https://dsvh.gov.vn/');
});

test('denied guest conversation is cleared only within the game client', async () => {
  const calls = [];
  const client = createSceneAssistant({ cancel() {}, async send(request, credentials) {
    calls.push({ request, credentials });
    if (calls.length === 2) throw new SceneAssistantError('access_denied');
    return answer();
  } });
  await client.ask(scenario, lunch(), 'Câu một');
  await client.ask(scenario, lunch(), 'Câu hai');
  await client.ask(scenario, lunch(), 'Câu ba');
  assert.equal(calls[2].request.conversationId, null);
  assert.equal(calls[2].credentials, null);
});
