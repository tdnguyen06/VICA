export type ChoiceSceneId = 'morning' | 'lunch' | 'afternoon' | 'pottery' | 'cafe' | 'creative' | 'pause';
export type SceneId = 'intro' | ChoiceSceneId | 'journal';

export interface NarrativeBlock {
  readonly text: string;
  readonly speaker?: string;
  readonly kind: 'fiction' | 'gameplay' | 'culture' | 'cultural-placeholder';
  readonly editorialStatus: 'draft' | 'authored' | 'source-reviewed';
}

export interface KnowledgeNote {
  readonly id: string;
  readonly text: string;
  readonly verification: 'unverified-placeholder' | 'source-reviewed';
  readonly category?: 'fact' | 'legend' | 'practice';
  readonly sourceIds: readonly string[];
}

export interface ChoiceResult {
  readonly title: string;
  readonly blocks: readonly NarrativeBlock[];
  // No image/source URL is invented for this development scaffold.
  readonly imageRef: string | null;
  readonly knowledgeIds: readonly string[];
  readonly journalLabel: string | null;
  readonly continueLabel?: string;
}

export interface ScenarioChoice {
  readonly id: string;
  readonly label: string;
  readonly result: ChoiceResult;
  readonly nextSceneId: ChoiceSceneId | 'journal';
}

export interface ChoiceScene {
  readonly id: ChoiceSceneId;
  readonly title: string;
  readonly imageRef: string | null;
  readonly blocks: readonly NarrativeBlock[];
  readonly choices: readonly ScenarioChoice[];
}

export interface Scenario {
  readonly id: string;
  readonly version: string;
  readonly title: string;
  readonly provinceSlug: string;
  readonly provinceName: string;
  readonly editorialStatus: 'development-placeholder' | 'review-ready';
  readonly cast?: { readonly guide: string; readonly visitor: string };
  readonly intro: readonly NarrativeBlock[];
  readonly introImageRef: string | null;
  readonly firstSceneId: ChoiceSceneId;
  readonly scenes: Readonly<Partial<Record<ChoiceSceneId, ChoiceScene>>>;
  readonly knowledge: readonly KnowledgeNote[];
  readonly recallByChoice?: Readonly<Record<string, string>>;
  readonly endingTemplate: NarrativeBlock;
  readonly endingByChoice?: Readonly<Record<string, NarrativeBlock>>;
  readonly imageRefs: readonly string[];
  readonly sourceRefs: readonly string[];
}
