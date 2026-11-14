import type { ChoiceResult, Scenario } from './scenario.js';
import type { GameEvent, GameState, RejectionReason, TransitionResult } from './state.js';
import { renderNarrative } from './journal.js';

export function createInitialState(scenario: Scenario, runId: string): GameState {
  if (!runId.trim()) throw new Error('runId must not be blank');
  return {
    runId,
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    phase: 'intro',
    sceneId: 'intro',
    revision: 0,
    choices: [],
  };
}

// Invalid or late events are rejected without mutating or replacing the state.
export function transition(scenario: Scenario, state: GameState, event: GameEvent): TransitionResult {
  const reject = (reason: RejectionReason): TransitionResult => ({ ok: false, state, reason });
  if (state.scenarioId !== scenario.id || state.scenarioVersion !== scenario.version) {
    return reject('scenario_mismatch');
  }
  if (event.expectedRunId !== state.runId || event.expectedSceneId !== state.sceneId || event.expectedRevision !== state.revision) {
    return reject('stale_event');
  }
  const nextRevision = state.revision + 1;
  if (event.type === 'start' && state.phase === 'intro') {
    return { ok: true, state: { ...state, revision: nextRevision, phase: 'choice', sceneId: scenario.firstSceneId } };
  }
  if (event.type === 'choose' && state.phase === 'choice') {
    const choice = scenario.scenes[state.sceneId]?.choices.find(option => option.id === event.choiceId);
    if (!choice) return reject('invalid_choice');
    if (state.choices.some(record => record.sceneId === state.sceneId)) return reject('invalid_action');
    return {
      ok: true,
      state: {
        ...state,
        revision: nextRevision,
        phase: 'result',
        choiceId: choice.id,
        choices: [...state.choices, { sceneId: state.sceneId, choiceId: choice.id }],
      },
    };
  }
  if (event.type === 'continue' && state.phase === 'result') {
    const choice = scenario.scenes[state.sceneId]?.choices.find(option => option.id === state.choiceId);
    if (!choice) return reject('invalid_choice');
    // Explicitly rebuild the state so a previous result's choiceId cannot leak into a choice screen.
    const base = {
      runId: state.runId,
      scenarioId: state.scenarioId,
      scenarioVersion: state.scenarioVersion,
      revision: nextRevision,
      choices: state.choices,
    };
    return {
      ok: true,
      state: choice.nextSceneId === 'journal'
        ? { ...base, phase: 'completed', sceneId: 'journal' }
        : { ...base, phase: 'choice', sceneId: choice.nextSceneId },
    };
  }
  return reject('invalid_action');
}

export function getCurrentResult(scenario: Scenario, state: GameState): ChoiceResult | null {
  if (state.phase !== 'result' || state.scenarioId !== scenario.id || state.scenarioVersion !== scenario.version) return null;
  const result = scenario.scenes[state.sceneId]?.choices.find(option => option.id === state.choiceId)?.result;
  return result ? { ...result, blocks: result.blocks.map(block => renderNarrative(scenario, state, block)) } : null;
}
