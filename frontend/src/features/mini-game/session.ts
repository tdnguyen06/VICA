import { createInitialState, transition } from './engine.js';
import type { Scenario } from './scenario.js';
import type { GameEvent, GameState } from './state.js';
import { applyAndSave, loadGame, restartGame, saveGame } from './storage.js';
import type { StorageProvider } from './storage.js';

export interface GameSession {
  readonly game: GameState | null;
  readonly checkpoint: string | null | undefined;
  readonly issue: 'invalid' | 'unavailable' | 'conflict' | null;
  readonly unsaved: boolean;
}

export function openSession(scenario: Scenario, storage: StorageProvider): GameSession {
  const saved = loadGame(scenario, storage);
  if (saved.status === 'loaded') return { game: saved.state, checkpoint: saved.checkpoint, issue: null, unsaved: false };
  if (saved.status === 'empty') return { game: null, checkpoint: null, issue: null, unsaved: false };
  return {
    game: null,
    checkpoint: saved.status === 'invalid' ? saved.checkpoint : undefined,
    issue: saved.status,
    unsaved: false,
  };
}

export function advanceSession(scenario: Scenario, storage: StorageProvider, session: GameSession, event: GameEvent): GameSession {
  if (!session.game || session.issue === 'invalid' || session.issue === 'conflict') return session;
  if (session.checkpoint === undefined) {
    const result = transition(scenario, session.game, event);
    return result.ok ? { ...session, game: result.state, issue: 'unavailable', unsaved: true } : session;
  }
  const result = applyAndSave(scenario, storage, session.game, event, session.checkpoint);
  if (result.status === 'rejected') return session;
  const persistence = result.persistence;
  if (persistence.status === 'saved') {
    return { game: result.state, checkpoint: persistence.checkpoint, issue: null, unsaved: false };
  }
  return {
    ...session, game: result.state, unsaved: true,
    issue: persistence.status === 'invalid_state' ? 'invalid' : persistence.status,
  };
}

export function beginSession(scenario: Scenario, storage: StorageProvider, session: GameSession, runId: string): GameSession {
  if (session.issue === 'invalid' || session.issue === 'conflict') return session;
  const game = session.game ?? createInitialState(scenario, runId);
  if (game.phase !== 'intro') return session;
  return advanceSession(scenario, storage, { ...session, game }, {
    type: 'start', expectedRunId: game.runId, expectedSceneId: game.sceneId, expectedRevision: game.revision,
  });
}

export function retrySessionSave(scenario: Scenario, storage: StorageProvider, session: GameSession): GameSession {
  if (!session.game || session.issue === 'invalid' || session.issue === 'conflict') return session;
  let checkpoint = session.checkpoint;
  if (checkpoint === undefined) {
    const saved = loadGame(scenario, storage);
    if (saved.status === 'unavailable') return session;
    if (saved.status !== 'empty') return { ...session, issue: 'conflict' };
    checkpoint = null;
  }
  const saved = saveGame(scenario, storage, session.game, checkpoint);
  return saved.status === 'saved'
    ? { ...session, checkpoint: saved.checkpoint, issue: null, unsaved: false }
    : { ...session, issue: saved.status === 'invalid_state' ? 'invalid' : saved.status, unsaved: true };
}

export function restartSession(scenario: Scenario, storage: StorageProvider, session: GameSession, runId: string, confirmed: boolean): GameSession {
  if (!confirmed) return session;
  if (session.checkpoint === undefined) return { ...session, issue: 'unavailable' };
  const result = restartGame(scenario, storage, runId, session.checkpoint, true);
  if (result.status === 'restarted') return { game: result.state, checkpoint: result.checkpoint, issue: null, unsaved: false };
  return {
    ...session,
    issue: result.status === 'conflict' ? 'conflict' : result.status === 'unavailable' ? 'unavailable' : 'invalid',
  };
}
