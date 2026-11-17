import assert from 'node:assert/strict';
import test from 'node:test';
import { scenarios } from '../../.mini-game-test-build/scenarios.js';
import { createInitialState, transition } from '../../.mini-game-test-build/engine.js';
import { getChoicePresentation, getSceneAtmosphere, getFarewell, getScenePrompts } from '../../.mini-game-test-build/immersion.js';
function act(scenario, state, type, choiceId) {
  const result=transition(scenario,state,{type,choiceId,expectedRunId:state.runId,expectedSceneId:state.sceneId,expectedRevision:state.revision});
  assert.equal(result.ok,true);return result.state;
}
function memory(scenario,state,id) { const c=state.choices.find(c=>c.sceneId===id);const choice=scenario.scenes[id].choices.find(o=>o.id===c.choiceId);return scenario.recallByChoice?.[choice.id]??choice.result.journalLabel??choice.label; }
test('176 real engine paths keep farewell tied to actual choices and final results',()=>{
  let total=0;
  for(const scenario of scenarios){
    let endings=0;
    function walk(state){
      assert.equal(getFarewell(scenario,state),null);
      for(const choice of scenario.scenes[state.sceneId].choices){
        const result=act(scenario,state,'choose',choice.id);const farewell=getFarewell(scenario,result);
        if(choice.nextSceneId==='journal'){
          endings++;total++;assert.ok(farewell);
          const text=farewell.blocks.map(b=>b.text).join(' ');
          assert.ok(text.includes(memory(scenario,result,'morning')));assert.ok(text.includes(memory(scenario,result,'lunch')));
          assert.ok(farewell.blocks.every(b=>b.kind==='fiction'&&b.editorialStatus==='authored'));
          assert.equal(getFarewell(scenario,{...result,scenarioId:'other'}),null);
          assert.equal(getFarewell(scenario,act(scenario,result,'continue')),null);
        }else{assert.equal(farewell,null);walk(act(scenario,result,'continue'));}
      }
    }
    walk(act(scenario,createInitialState(scenario,'immersion-test'),'start'));assert.equal(endings,16);
  }
  assert.equal(total,176);
});
test('every choice has role speech without modifying scenario or choice contracts',()=>{
  for(const scenario of scenarios){const before=JSON.stringify(scenario);for(const scene of Object.values(scenario.scenes))for(const choice of scene.choices){const p=getChoicePresentation(scenario,scene.id,choice);assert.ok(p.speech.length>10);assert.ok(p.detail.length>10);}assert.equal(JSON.stringify(scenario),before);}
});
test('waiting morning never reveals unplayed meals and farewell remains absent',()=>{
  for(const scenario of scenarios){const state=act(scenario,createInitialState(scenario,'intro-check'),'start');const prose=[getSceneAtmosphere(scenario,state),...getScenePrompts(scenario,state)].join(' ');for(const meal of scenario.scenes.lunch.choices)assert.ok(!prose.includes(meal.label));assert.equal(getFarewell(scenario,state),null);}
});
test('lunch atmosphere only remembers the morning actually selected',()=>{
  for(const scenario of scenarios)for(const morning of scenario.scenes.morning.choices){let state=act(scenario,createInitialState(scenario,'memory-check'),'start');state=act(scenario,act(scenario,state,'choose',morning.id),'continue');assert.ok(getSceneAtmosphere(scenario,state).includes(memory(scenario,state,'morning')));}
});
test('AI prompts are bounded and mention the selected meal without unplayed meals',()=>{
  for(const scenario of scenarios)for(const meal of scenario.scenes.lunch.choices){let state=act(scenario,createInitialState(scenario,'prompts-check'),'start');state=act(scenario,act(scenario,state,'choose',scenario.scenes.morning.choices[0].id),'continue');state=act(scenario,state,'choose',meal.id);const prompts=getScenePrompts(scenario,state);assert.ok(prompts.length>0&&prompts.length<=2);assert.ok(prompts.every(p=>p.length<=500));assert.ok(prompts.join(' ').includes(meal.label));for(const unplayed of scenario.scenes.lunch.choices.filter(c=>c.id!==meal.id))assert.ok(!prompts.join(' ').includes(unplayed.label));}
});
