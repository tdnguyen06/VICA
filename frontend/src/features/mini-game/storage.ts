import { createInitialState, transition } from './engine.js';
import type { Scenario } from './scenario.js';
import type { GameEvent, GameState } from './state.js';
import { decodeGameSave, SAVE_SCHEMA_VERSION, validateGameState } from './save-validation.js';
import type { InvalidSaveReason } from './save-validation.js';

export const MINI_GAME_SAVE_KEY = 'vica:minigame:hanoi:current';

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// Deferred access also catches browsers that throw when accessing window.localStorage itself.
// This module never accesses window, localStorage, auth keys or Assistant credentials.
export type StorageProvider = () => StoragePort;

export type LoadResult =
  | { readonly status: 'empty'; readonly checkpoint: null }
  | { readonly status: 'loaded'; readonly checkpoint: string; readonly state: GameState }
  | { readonly status: 'invalid'; readonly checkpoint: string; readonly reason: InvalidSaveReason }
  | { readonly status: 'unavailable' };

export type SaveResult =
  | { readonly status: 'saved'; readonly checkpoint: string }
  | { readonly status: 'invalid_state'; readonly reason: InvalidSaveReason }
  | { readonly status: 'conflict' }
  | { readonly status: 'unavailable' };

// A checkpoint is the exact value previously read from this game's key, not a global storage snapshot.
export function loadGame(scenario: Scenario, storage: StorageProvider): LoadResult {
  let raw: string | null;
  try {
    raw = storage().getItem(MINI_GAME_SAVE_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'empty', checkpoint: null };
  const decoded = decodeGameSave(scenario, raw);
  return decoded.ok
    ? { status: 'loaded', checkpoint: raw, state: decoded.state }
    : { status: 'invalid', checkpoint: raw, reason: decoded.reason };
}

export function saveGame(
  scenario: Scenario,
  storage: StorageProvider,
  state: GameState,
  expectedCheckpoint: string | null,
): SaveResult {
  const validated = validateGameState(scenario, state);
  if (!validated.ok) return { status: 'invalid_state', reason: validated.reason };
  const raw = JSON.stringify({ schemaVersion: SAVE_SCHEMA_VERSION, state: validated.state });
  try {
    const port = storage();
    // Best-effort conflict detection; localStorage has no atomic compare-and-swap across tabs.
    if (port.getItem(MINI_GAME_SAVE_KEY) !== expectedCheckpoint) return { status: 'conflict' };
    port.setItem(MINI_GAME_SAVE_KEY, raw);
    return { status: 'saved', checkpoint: raw };
  } catch {
    return { status: 'unavailable' };
  }
}

export function applyAndSave(
  scenario: Scenario,
  storage: StorageProvider,
  state: GameState,
  event: GameEvent,
  expectedCheckpoint: string | null,
) {
  const outcome = transition(scenario, state, event);
  if (!outcome.ok) return { status: 'rejected' as const, ...outcome };
  // Accepted gameplay remains in memory even if persistence fails.
  return {
    status: 'applied' as const,
    state: outcome.state,
    persistence: saveGame(scenario, storage, outcome.state, expectedCheckpoint),
  };
}

export function restartGame(
  scenario: Scenario,
  storage: StorageProvider,
  newRunId: string,
  expectedCheckpoint: string | null,
  confirmed: boolean,
) {
  if (!confirmed) return { status: 'cancelled' as const };
  if (!newRunId.trim() || newRunId.length > 200) return { status: 'invalid_run_id' as const };
  if (expectedCheckpoint !== null) {
    const previous = decodeGameSave(scenario, expectedCheckpoint);
    if (previous.ok && previous.state.runId === newRunId) return { status: 'invalid_run_id' as const };
  }
  const state = createInitialState(scenario, newRunId);
  const saved = saveGame(scenario, storage, state, expectedCheckpoint);
  // Do not replace the current in-memory run or claim restart succeeded when the write failed.
  return saved.status === 'saved'
    ? { status: 'restarted' as const, state, checkpoint: saved.checkpoint }
    : saved;
}
