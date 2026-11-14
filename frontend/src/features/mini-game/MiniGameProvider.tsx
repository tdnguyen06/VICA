import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { scenarios, scenarioById } from './scenarios';
import { beginAdventure, openAdventureSession, replaceAdventure } from './adventure';
import { advanceSession, retrySessionSave } from './session';
import type { GameSession } from './session';
import { MiniGameContext } from './MiniGameContext';
import type { MiniGameContextValue } from './MiniGameContext';
import { MINI_GAME_SAVE_KEY } from './storage';

const storage = () => window.localStorage;
const newRunId = () => window.crypto.randomUUID?.() ?? Array.from(window.crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16)).join('-');

export function MiniGameProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(() => openAdventureSession(scenarios, storage));
  const current = useRef(session);
  const commit = (next: GameSession) => { current.current = next; setSession(next); };

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      const previous = current.current;
      if ((event.key === MINI_GAME_SAVE_KEY || event.key === null) && event.newValue !== previous.checkpoint) {
        const next: GameSession = { ...previous, issue: 'conflict' };
        current.current = next; setSession(next);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => {
    if (!session.unsaved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [session.unsaved]);

  const value: MiniGameContextValue = {
    session,
    begin: scenarioId => {
      const scenario = scenarioById(scenarioId);
      if (scenario) commit(beginAdventure(scenario, storage, current.current, newRunId()));
    },
    dispatch: event => {
      const scenario = current.current.game ? scenarioById(current.current.game.scenarioId) : undefined;
      if (scenario) commit(advanceSession(scenario, storage, current.current, event));
    },
    restart: scenarioId => {
      const scenario = scenarioById(scenarioId);
      if (!scenario) return false;
      const next = replaceAdventure(scenario, storage, current.current, newRunId(), true);
      commit(next);
      return next.issue === null && next.game?.scenarioId === scenario.id && next.game.phase === 'intro';
    },
    reload: () => commit(openAdventureSession(scenarios, storage)),
    retry: () => {
      const scenario = current.current.game ? scenarioById(current.current.game.scenarioId) : undefined;
      if (scenario) commit(retrySessionSave(scenario, storage, current.current));
    },
  };
  return <MiniGameContext.Provider value={value}>{children}</MiniGameContext.Provider>;
}
