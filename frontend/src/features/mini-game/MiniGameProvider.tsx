import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { hanoiScenario } from './content/hanoi';
import { advanceSession, beginSession, openSession, restartSession, retrySessionSave } from './session';
import type { GameSession } from './session';
import { MiniGameContext } from './MiniGameContext';
import type { MiniGameContextValue } from './MiniGameContext';
import { MINI_GAME_SAVE_KEY } from './storage';

const storage = () => window.localStorage;
const newRunId = () => window.crypto.randomUUID?.() ?? Array.from(window.crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16)).join('-');

export function MiniGameProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(() => openSession(hanoiScenario, storage));
  const current = useRef(session);
  // Event handlers update the ref synchronously, so another click cannot read an old render snapshot.
  const commit = (next: GameSession) => {
    current.current = next;
    setSession(next);
  };

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      const previous = current.current;
      if ((event.key === MINI_GAME_SAVE_KEY || event.key === null) && event.newValue !== previous.checkpoint) {
        const next: GameSession = { ...previous, issue: 'conflict' };
        current.current = next;
        setSession(next);
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
    begin: () => commit(beginSession(hanoiScenario, storage, current.current, newRunId())),
    dispatch: event => commit(advanceSession(hanoiScenario, storage, current.current, event)),
    restart: () => {
      const next = restartSession(hanoiScenario, storage, current.current, newRunId(), true);
      commit(next);
      return next.issue === null && next.game?.phase === 'intro';
    },
    reload: () => commit(openSession(hanoiScenario, storage)),
    retry: () => commit(retrySessionSave(hanoiScenario, storage, current.current)),
  };

  return <MiniGameContext.Provider value={value}>{children}</MiniGameContext.Provider>;
}
