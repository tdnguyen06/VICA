import type { ChoiceSceneId, SceneId } from './scenario.js';

export interface RecordedChoice {
  readonly sceneId: ChoiceSceneId;
  readonly choiceId: string;
}

interface RunData {
  readonly runId: string;
  readonly scenarioId: string;
  readonly scenarioVersion: string;
  readonly revision: number;
  readonly choices: readonly RecordedChoice[];
}

export type GameState = RunData & (
  | { readonly phase: 'intro'; readonly sceneId: 'intro' }
  | { readonly phase: 'choice'; readonly sceneId: ChoiceSceneId }
  | { readonly phase: 'result'; readonly sceneId: ChoiceSceneId; readonly choiceId: string }
  | { readonly phase: 'completed'; readonly sceneId: 'journal' }
);

interface EventOrigin {
  readonly expectedRunId: string;
  readonly expectedSceneId: SceneId;
  readonly expectedRevision: number;
}

export type GameEvent = EventOrigin & (
  | { readonly type: 'start' }
  | { readonly type: 'choose'; readonly choiceId: string }
  | { readonly type: 'continue' }
);

export type RejectionReason = 'scenario_mismatch' | 'stale_event' | 'invalid_action' | 'invalid_choice';

export type TransitionResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly state: GameState; readonly reason: RejectionReason };
