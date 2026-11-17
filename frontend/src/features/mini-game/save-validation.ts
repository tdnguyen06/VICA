import { createInitialState, transition } from './engine.js';
import type { Scenario } from './scenario.js';
import type { GameEvent, GameState } from './state.js';

export const SAVE_SCHEMA_VERSION = 1;
export const MAX_SAVE_LENGTH = 65536;

export type InvalidSaveReason =
  | 'malformed_json'
  | 'invalid_shape'
  | 'unsupported_schema'
  | 'incompatible_scenario'
  | 'invalid_progress'
  | 'save_too_large';

export type StateValidation =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly reason: InvalidSaveReason };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(record).length === keys.length && keys.every(key => Object.hasOwn(record, key));
}

// Reconstruct a canonical state through the real engine instead of trusting persisted fields.
export function validateGameState(scenario: Scenario, value: unknown): StateValidation {
  const invalid = (reason: InvalidSaveReason): StateValidation => ({ ok: false, reason });
  if (!isRecord(value)) return invalid('invalid_shape');
  if (value.scenarioId !== scenario.id || value.scenarioVersion !== scenario.version) {
    return invalid('incompatible_scenario');
  }
  if (typeof value.runId !== 'string' || !value.runId.trim() || value.runId.length > 200 ||
      !Number.isSafeInteger(value.revision) || !Array.isArray(value.choices) ||
      typeof value.phase !== 'string' || !['intro', 'choice', 'result', 'completed'].includes(value.phase)) {
    return invalid('invalid_shape');
  }
  const keys = ['runId', 'scenarioId', 'scenarioVersion', 'revision', 'choices', 'phase', 'sceneId'];
  if (value.phase === 'result') keys.push('choiceId');
  if (!hasKeys(value, keys)) return invalid('invalid_shape');
  if (value.choices.length > Object.keys(scenario.scenes).length) return invalid('invalid_progress');

  let state = createInitialState(scenario, value.runId);
  const advance = (type: 'start' | 'choose' | 'continue', choiceId?: string): boolean => {
    const origin = { expectedRunId: state.runId, expectedSceneId: state.sceneId, expectedRevision: state.revision };
    const event: GameEvent = type === 'choose'
      ? { ...origin, type, choiceId: choiceId ?? '' }
      : { ...origin, type };
    const outcome = transition(scenario, state, event);
    if (!outcome.ok) return false;
    state = outcome.state;
    return true;
  };

  if (value.phase !== 'intro' && !advance('start')) return invalid('invalid_progress');
  for (const [index, choice] of value.choices.entries()) {
    if (!isRecord(choice) || !hasKeys(choice, ['sceneId', 'choiceId']) ||
        typeof choice.choiceId !== 'string' || typeof choice.sceneId !== 'string') {
      return invalid('invalid_shape');
    }
    if (state.phase !== 'choice' || choice.sceneId !== state.sceneId || !advance('choose', choice.choiceId)) {
      return invalid('invalid_progress');
    }
    const isLastResult = index === value.choices.length - 1 && value.phase === 'result';
    if (!isLastResult && !advance('continue')) return invalid('invalid_progress');
  }

  if (state.phase !== value.phase || state.sceneId !== value.sceneId || state.revision !== value.revision ||
      (state.phase === 'result' && state.choiceId !== value.choiceId)) {
    return invalid('invalid_progress');
  }
  return { ok: true, state };
}

export function decodeGameSave(scenario: Scenario, raw: string): StateValidation {
  if (raw.length > MAX_SAVE_LENGTH) return { ok: false, reason: 'save_too_large' };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'malformed_json' };
  }
  if (!isRecord(value) || !hasKeys(value, ['schemaVersion', 'state'])) {
    return { ok: false, reason: 'invalid_shape' };
  }
  if (value.schemaVersion !== SAVE_SCHEMA_VERSION) return { ok: false, reason: 'unsupported_schema' };
  return validateGameState(scenario, value.state);
}
