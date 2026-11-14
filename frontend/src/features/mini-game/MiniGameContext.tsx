import { createContext, useContext } from 'react';
import type { GameSession } from './session';
import type { GameEvent } from './state';

export interface MiniGameContextValue {
  session: GameSession;
  begin: (scenarioId: string) => void;
  dispatch: (event: GameEvent) => void;
  restart: (scenarioId: string) => boolean;
  reload: () => void;
  retry: () => void;
}

export const MiniGameContext = createContext<MiniGameContextValue | null>(null);

export function useMiniGame() {
  const context = useContext(MiniGameContext);
  if (!context) throw new Error('Mini-game must be rendered within MiniGameProvider');
  return context;
}
