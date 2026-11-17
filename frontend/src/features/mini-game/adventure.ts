import type { Scenario } from './scenario.js';
import type { GameSession } from './session.js';
import type { StorageProvider } from './storage.js';
import { MINI_GAME_SAVE_KEY } from './storage.js';
import { decodeGameSave, MAX_SAVE_LENGTH } from './save-validation.js';
import { beginSession, restartSession } from './session.js';

/** Resolve the stored scenario before validation. Preserve unknown/corrupt saves for confirmed replacement. */
export function openAdventureSession(scenarios: readonly Scenario[], storage: StorageProvider): GameSession {
  let raw: string | null;
  try { raw = storage().getItem(MINI_GAME_SAVE_KEY); }
  catch { return { game: null, checkpoint: undefined, issue: 'unavailable', unsaved: false }; }
  if (raw === null) return { game: null, checkpoint: null, issue: null, unsaved: false };
  const invalid: GameSession = { game: null, checkpoint: raw, issue: 'invalid', unsaved: false };
  if (raw.length > MAX_SAVE_LENGTH) return invalid;
  try {
    const envelope = JSON.parse(raw);
    const scenario = scenarios.find(candidate => candidate.id === envelope?.state?.scenarioId);
    if (!scenario) return invalid;
    const decoded = decodeGameSave(scenario, raw);
    return decoded.ok ? { game: decoded.state, checkpoint: raw, issue: null, unsaved: false } : invalid;
  } catch { return invalid; }
}

/** Opening another province never implicitly replaces a run. */
export function beginAdventure(scenario: Scenario, storage: StorageProvider, session: GameSession, runId: string): GameSession {
  if (session.game && session.game.scenarioId !== scenario.id) return session;
  return beginSession(scenario, storage, session, runId);
}

/** Called only after explicit restart/switch confirmation; write failure preserves the old run. */
export function replaceAdventure(scenario: Scenario, storage: StorageProvider, session: GameSession, runId: string, confirmed: boolean): GameSession {
  return restartSession(scenario, storage, session, runId, confirmed);
}
