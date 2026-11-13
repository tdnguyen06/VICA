import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { scenarios, scenarioById, scenarioByProvince, regionalImages } from '../../.mini-game-test-build/scenarios.js';
import { culturalSources } from '../../.mini-game-test-build/content/sources.js';
import { hanoiVisuals } from '../../.mini-game-test-build/content/media.js';
import { createInitialState, getCurrentResult, transition } from '../../.mini-game-test-build/engine.js';
import { buildJournal } from '../../.mini-game-test-build/journal.js';
import { validateGameState } from '../../.mini-game-test-build/save-validation.js';
import { openAdventureSession, beginAdventure, replaceAdventure } from '../../.mini-game-test-build/adventure.js';
import { advanceSession } from '../../.mini-game-test-build/session.js';
import { MINI_GAME_SAVE_KEY } from '../../.mini-game-test-build/storage.js';
import { createSceneAssistant } from '../../.mini-game-test-build/assistant/assistant.js';

const approved = ['hai-phong','quang-ninh','ninh-binh','thua-thien-hue','da-nang','quang-nam','khanh-hoa','lam-dong','ho-chi-minh','can-tho'];
const hanoi = scenarioByProvince('ha-noi');
const others = scenarios.filter(story => story !== hanoi);
function origin(state) { return { expectedRunId: state.runId, expectedSceneId: state.sceneId, expectedRevision: state.revision }; }
function act(story, state, type, choiceId) {
  const result = transition(story, state, { ...origin(state), type, choiceId });
  assert.equal(result.ok, true);
  return result.state;
}
function routes(story, id = story.firstSceneId, prefix = []) {
  assert.ok(prefix.length < 6, 'Scene graph must be finite');
  const scene = story.scenes[id];
  assert.ok(scene);
  return scene.choices.flatMap(choice => choice.nextSceneId === 'journal' ? [[...prefix, { sceneId:id, choice }]]
    : routes(story, choice.nextSceneId, [...prefix, { sceneId:id, choice }]));
}
function store(raw = null) {
  const data = new Map([['auth-fixture', 'keep-auth'], ['chat-fixture', 'keep-chat']]);
  if (raw !== null) data.set(MINI_GAME_SAVE_KEY, raw);
  let writes = 0, fail = false;
  const port = { getItem:key => data.get(key) ?? null, setItem:(key,value) => { if (fail) throw Error('QA quota'); writes++; data.set(key,value); } };
  return { data, storage:() => port, get writes(){return writes;}, set fail(value){fail=value;} };
}

test('production registry registers exactly Hanoi plus the ten approved provinces', () => {
  assert.equal(scenarios.length, 11);
  assert.deepEqual(others.map(story => story.provinceSlug), approved);
  assert.equal(new Set(scenarios.map(story => story.id)).size, 11);
  const provinces = JSON.parse(readFileSync(new URL('../../src/data/provinces-v1.json', import.meta.url), 'utf8')).provinces;
  for (const story of scenarios) assert.ok(provinces.some(province => province.slug === story.provinceSlug));
  assert.equal(scenarioByProvince('unsupported'), undefined);
  assert.equal(scenarioById('unsupported'), undefined);
});

for (const story of scenarios) {
  test(story.provinceSlug + ': graph, knowledge sources and assets resolve with no placeholder', () => {
    const paths = routes(story);
    assert.equal(paths.length, 16);
    const choices = Object.values(story.scenes).flatMap(scene => scene.choices);
    assert.equal(new Set(choices.map(choice => choice.id)).size, choices.length);
    assert.ok(paths.every(path => path.length === 4));
    for (const id of story.sourceRefs) {
      assert.ok(culturalSources[id], id);
      assert.match(culturalSources[id].url, /^https:\/\//);
    }
    for (const id of story.imageRefs) assert.ok(hanoiVisuals[id] || regionalImages[id], id);
    for (const note of story.knowledge) {
      assert.equal(note.verification, 'source-reviewed');
      assert.ok(note.sourceIds.length);
      for (const id of note.sourceIds) assert.ok(story.sourceRefs.includes(id));
    }
    const blocks = [...story.intro, ...Object.values(story.scenes).flatMap(scene => [...scene.blocks, ...scene.choices.flatMap(choice => choice.result.blocks)])];
    assert.ok(blocks.every(block => block.kind !== 'cultural-placeholder' && block.editorialStatus !== 'draft'));
  });
}
for (const story of others) {
  for (const [index,path] of routes(story).entries()) {
    test(story.provinceSlug + ': journey ' + (index+1) + ' has exact journal and restorable result/choice phases', () => {
      const fixture = store();
      let state = act(story, createInitialState(story, story.id+'-'+index), 'start');
      for (const {sceneId,choice} of path) {
        assert.equal(state.sceneId, sceneId);
        state = act(story, state, 'choose', choice.id);
        assert.equal(state.phase, 'result');
        const result = getCurrentResult(story, state);
        assert.equal(result.title, choice.result.title);
        const dialogue=result.blocks.filter(block=>block.speaker);
        assert.ok(dialogue.length>0,'Every regional result has named dialogue');
        for(const block of dialogue) assert.ok([story.cast.guide,story.cast.visitor].includes(block.speaker));
        assert.equal(result.blocks.some(block=>block.text.includes('Người bạn:')),false);
        assert.equal(result.blocks.some(block=>/\{[^}]+\}/.test(block.text)),false);
        assert.equal(result.imageRef, choice.result.imageRef);
        assert.ok(!result.blocks.some(block => /\{(morning|lunch|afternoon)\}|\[Chưa trải nghiệm\]/.test(block.text)));
        assert.equal(validateGameState(story, state).ok, true);
        fixture.data.set(MINI_GAME_SAVE_KEY, JSON.stringify({schemaVersion:1,state}));
        assert.deepEqual(openAdventureSession(scenarios, fixture.storage).game, state);
        state = act(story, state, 'continue');
        fixture.data.set(MINI_GAME_SAVE_KEY, JSON.stringify({schemaVersion:1,state}));
        assert.deepEqual(openAdventureSession(scenarios, fixture.storage).game, state);
      }
      assert.equal(state.phase, 'completed');
      const journal = buildJournal(story, state);
      const actual = [path[0].choice, path[1].choice, path[3].choice];
      assert.deepEqual(journal.entries.map(entry=>entry.choiceId), actual.map(choice=>choice.id));
      assert.deepEqual(journal.imageRefs, actual.map(choice=>choice.result.imageRef));
      assert.deepEqual(journal.knowledge.map(note=>note.id).sort(), actual.flatMap(choice=>choice.result.knowledgeIds).sort());
      for (const record of state.choices.filter(choice=>choice.sceneId==='morning'||choice.sceneId==='lunch')) assert.ok(journal.ending.text.includes(story.recallByChoice[record.choiceId]));
      assert.ok(!JSON.stringify(journal).includes('[Chưa trải nghiệm]'));
      for (const option of [...story.scenes.morning.choices,...story.scenes.lunch.choices]) {
        const text=JSON.stringify(journal);
        const chosen=state.choices.some(record=>record.choiceId===option.id);
        assert.equal(journal.ending.text.includes(story.recallByChoice[option.id]),chosen,'Ending recalls only played moments');
        if(!chosen) assert.equal(text.includes(story.recallByChoice[option.id]),false,'No unplayed memories in diary');
      }
      const rejected = transition(story, state, {...origin(state),type:'choose',choiceId:path[0].choice.id});
      assert.equal(rejected.ok,false);
      assert.strictEqual(rejected.state,state);
    });
  }
}

test('legacy Hanoi v0.2.0 save loads without migration or any write', () => {
  let state=act(hanoi,createInitialState(hanoi,'legacy-hanoi'),'start');
  state=act(hanoi,state,'choose','morning-story');
  const raw=JSON.stringify({schemaVersion:1,state});
  const fixture=store(raw);
  assert.deepEqual(openAdventureSession(scenarios,fixture.storage).game,state);
  assert.equal(fixture.data.get(MINI_GAME_SAVE_KEY),raw);
  assert.equal(fixture.writes,0);
});
test('looking at another province or cancelling replacement preserves the current run and all other keys', () => {
  const fixture=store();
  let session=beginAdventure(hanoi,fixture.storage,openAdventureSession(scenarios,fixture.storage),'current');
  const before=structuredClone(session), writes=fixture.writes;
  assert.strictEqual(beginAdventure(others[0],fixture.storage,session,'not-confirmed'),session);
  assert.strictEqual(replaceAdventure(others[0],fixture.storage,session,'cancelled',false),session);
  assert.deepEqual(session,before);
  assert.equal(fixture.writes,writes);
  assert.equal(fixture.data.get('auth-fixture'),'keep-auth');
  assert.equal(fixture.data.get('chat-fixture'),'keep-chat');
});
test('confirmed switch stores and restores the new province; old events cannot select a choice there', () => {
  const fixture=store(), target=scenarioByProvince('da-nang');
  let session=beginAdventure(hanoi,fixture.storage,openAdventureSession(scenarios,fixture.storage),'old');
  const oldEvent={...origin(session.game),type:'choose',choiceId:'morning-walk'};
  session=replaceAdventure(target,fixture.storage,session,'new',true);
  session=beginAdventure(target,fixture.storage,session,'unused');
  assert.equal(session.game.scenarioId,target.id);
  assert.equal(session.game.phase,'choice');
  assert.deepEqual(openAdventureSession(scenarios,fixture.storage).game,session.game);
  assert.strictEqual(advanceSession(target,fixture.storage,session,oldEvent),session);
  assert.equal(fixture.data.get('auth-fixture'),'keep-auth');
  assert.equal(fixture.data.get('chat-fixture'),'keep-chat');
  assert.equal([...fixture.data.keys()].length,3);
});
test('switch write failure or cross-tab conflict cannot replace the old run', () => {
  for (const failure of ['quota','conflict']) {
    const fixture=store();
    const session=beginAdventure(hanoi,fixture.storage,openAdventureSession(scenarios,fixture.storage),'old');
    const previousRaw=fixture.data.get(MINI_GAME_SAVE_KEY);
    if(failure==='quota') fixture.fail=true;
    else fixture.data.set(MINI_GAME_SAVE_KEY,previousRaw+' ');
    const result=replaceAdventure(others[0],fixture.storage,session,'new',true);
    assert.strictEqual(result.game,session.game);
    assert.equal(result.issue,failure==='quota'?'unavailable':'conflict');
    assert.equal(fixture.data.get(MINI_GAME_SAVE_KEY),failure==='quota'?previousRaw:previousRaw+' ');
  }
});
test('unknown, corrupt, oversized and incompatible multi-province saves stay intact until confirmation', () => {
  for(const raw of ['{','x'.repeat(65537),JSON.stringify({schemaVersion:1,state:{scenarioId:'not-registered'}}),JSON.stringify({schemaVersion:99,state:createInitialState(others[0],'bad')})]) {
    const fixture=store(raw);
    const session=openAdventureSession(scenarios,fixture.storage);
    assert.equal(session.issue,'invalid');
    assert.equal(session.game,null);
    assert.equal(session.checkpoint,raw);
    assert.equal(fixture.writes,0);
    assert.strictEqual(beginAdventure(others[0],fixture.storage,session,'new'),session);
    assert.strictEqual(replaceAdventure(others[0],fixture.storage,session,'new',false),session);
    const next=replaceAdventure(others[0],fixture.storage,session,'new',true);
    assert.equal(next.game.scenarioId,others[0].id);
    assert.equal(fixture.data.get('chat-fixture'),'keep-chat');
  }
});
test('blocked storage fails gracefully before resolving any province', () => {
  const blocked=()=>{throw Error('QA denied');};
  const session=openAdventureSession(scenarios,blocked);
  assert.equal(session.issue,'unavailable');
  const memory=beginAdventure(others[0],blocked,session,'memory');
  assert.equal(memory.game.scenarioId,others[0].id);
  assert.equal(memory.unsaved,true);
  assert.strictEqual(replaceAdventure(others[1],blocked,memory,'cannot-switch',true).game,memory.game);
});
for(const story of others) {
  test(story.provinceSlug+': Assistant uses this province and only the selected path', async()=>{
    const calls=[];
    const client=createSceneAssistant({cancel(){},async send(request,credentials){
      calls.push({request,credentials});
      return {conversationId:77,content:'QA reply',citations:[],credentials:{guestSessionUuid:'11111111-1111-4111-8111-111111111111',guestToken:'qa-only'}};
    }});
    let state=act(story,createInitialState(story,'run-'+story.id),'start');
    state=act(story,state,'choose',story.scenes.morning.choices[0].id);
    state=act(story,state,'continue');
    state=act(story,state,'choose',story.scenes.lunch.choices[1].id);
    const before=structuredClone(state);
    const response=await client.ask(story,state,'Giải thích món vừa chọn');
    assert.equal(response.status,'answered');
    const request=calls[0].request;
    assert.equal(request.provinceSlug,story.provinceSlug);
    assert.ok(request.message.includes(story.provinceName));
    assert.ok(request.message.includes(story.scenes.lunch.choices[1].label));
    assert.equal(request.message.includes(story.scenes.lunch.choices[0].label),false);
    assert.equal(request.message.includes('Hà Nội (ha-noi)'),false);
    assert.equal(request.message.includes(story.scenes.morning.choices[1].label),false);
    assert.deepEqual(state,before);
  });
}

test('all 11 real experiences are reachable by random; unimplemented provinces remain excluded', async () => {
  const { createProvinceCatalog, chooseRandomExperience, getCatalogPage } = await import('../../.mini-game-test-build/catalog.js');
  const provinces=JSON.parse(readFileSync(new URL('../../src/data/provinces-v1.json',import.meta.url),'utf8')).provinces;
  const catalog=createProvinceCatalog(provinces,scenarios.map(story=>({provinceSlug:story.provinceSlug,scenarioId:story.id,title:story.title,path:'/experiences/'+story.provinceSlug})));
  assert.equal(getCatalogPage(catalog,'',1,true).total,11);
  const found=new Set(Array.from({length:11},(_,index)=>chooseRandomExperience(catalog,()=>index/11).slug));
  assert.deepEqual([...found].sort(),scenarios.map(story=>story.provinceSlug).sort());
  assert.equal(getCatalogPage(catalog,'bac ninh',1).items[0].status,'coming-soon');
});
test('Assistant cannot carry guest credentials between two scenarios even if run ID is accidentally reused', async () => {
  const calls=[];
  const client=createSceneAssistant({cancel(){},async send(request,credentials){
    calls.push({request,credentials});
    return {conversationId:42,content:'QA only',citations:[],credentials:{guestSessionUuid:'11111111-1111-4111-8111-111111111111',guestToken:'qa-only'}};
  }});
  for(const story of [hanoi,others[0]]) {
    const state=act(story,createInitialState(story,'same-run-id'),'start');
    assert.equal((await client.ask(story,state,'Câu hỏi QA')).status,'answered');
  }
  assert.equal(calls[0].request.provinceSlug,'ha-noi');
  assert.equal(calls[1].request.provinceSlug,'hai-phong');
  assert.equal(calls[1].request.conversationId,null);
  assert.equal(calls[1].credentials,null);
});

test('eleven independent casts and authored introductions are available without login', () => {
  const expected={ 'ha-noi':['An','Linh'],'hai-phong':['Huy','Mai'],'quang-ninh':['Khánh','Vy'],'ninh-binh':['Bình','Chi'],'thua-thien-hue':['Duy','Ngọc'],'da-nang':['Nam','Hà'],'quang-nam':['Phúc','Trang'],'khanh-hoa':['Hải','Yến'],'lam-dong':['Sơn','Thảo'],'ho-chi-minh':['Quân','Nhi'],'can-tho':['Tín','Hân'] };
  const openings=new Set();
  for(const story of scenarios){
    assert.deepEqual([story.cast.guide,story.cast.visitor],expected[story.provinceSlug]);
    assert.ok(story.intro.some(block=>block.speaker===story.cast.guide));
    assert.ok(story.intro.some(block=>block.speaker===story.cast.visitor));
    assert.equal(story.intro.some(block=>block.text.includes('Người bạn:')),false);
    openings.add(story.intro[0].text);
    for(const choice of [...story.scenes.morning.choices,...story.scenes.lunch.choices]) assert.ok(story.recallByChoice[choice.id].length>15);
  }
  assert.equal(openings.size,11);
});
