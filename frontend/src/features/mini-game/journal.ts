import type { ChoiceResult, NarrativeBlock, Scenario } from './scenario.js';
import type { GameState, RecordedChoice } from './state.js';

function selectedResult(scenario: Scenario, choice: RecordedChoice): ChoiceResult {
  const result = scenario.scenes[choice.sceneId].choices.find(option => option.id === choice.choiceId)?.result;
  if (!result) throw new Error('Game state references an unknown choice');
  return result;
}

export function renderNarrative(scenario: Scenario, state: GameState, block: NarrativeBlock): NarrativeBlock {
  const label = (sceneId: RecordedChoice['sceneId']) => {
    const choice = state.choices.find(record => record.sceneId === sceneId);
    return choice ? selectedResult(scenario, choice).journalLabel : null;
  };
  const context = {
    morning: label('morning'),
    lunch: label('lunch'),
    afternoon: label('pottery') ?? label('cafe'),
  };
  return {
    ...block,
    text: block.text.replace(/\{(morning|lunch|afternoon)\}/g, (_, key: keyof typeof context) =>
      context[key] ?? '[Chưa trải nghiệm]'),
  };
}

export interface JournalEntry {
  readonly sceneId: RecordedChoice['sceneId'];
  readonly choiceId: string;
  readonly label: string;
  readonly result: ChoiceResult;
}

export function buildJournal(scenario: Scenario, state: GameState) {
  if (state.phase !== 'completed' || state.scenarioId !== scenario.id || state.scenarioVersion !== scenario.version) {
    return null;
  }
  const entries: JournalEntry[] = state.choices.flatMap(choice => {
    const result = selectedResult(scenario, choice);
    if (!result.journalLabel) return [];
    return [{
      ...choice,
      label: result.journalLabel,
      result: { ...result, blocks: result.blocks.map(block => renderNarrative(scenario, state, block)) },
    }];
  });
  const knowledgeIds = new Set(entries.flatMap(entry => entry.result.knowledgeIds));
  const knowledge = scenario.knowledge.filter(note => knowledgeIds.has(note.id));
  const usedSources = new Set(knowledge.flatMap(note => note.sourceIds));

  return {
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    title: scenario.title,
    editorialStatus: scenario.editorialStatus,
    entries,
    knowledge,
    sourceRefs: scenario.sourceRefs.filter(id => usedSources.has(id)),
    imageRefs: entries.flatMap(entry => entry.result.imageRef ? [entry.result.imageRef] : []),
    ending: renderNarrative(scenario, state, scenario.endingTemplate),
  };
}
