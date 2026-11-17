import { ArrowUpRight, Coffee, Compass, Mail, Paintbrush, UtensilsCrossed } from 'lucide-react';
import { useId } from 'react';
import type { ChoiceScene, Scenario, ScenarioChoice } from '../scenario';
import { getChoicePresentation } from '../immersion';
import { ActionButton } from './StoryCard';
import { CharacterAvatar } from './CharacterAvatar';

export function ImmersiveChoices({ scenario, scene, disabled, onChoose }: {
  scenario: Scenario; scene: ChoiceScene; disabled: boolean; onChoose: (id: string) => void;
}) {
  const id = useId();
  const Icon = scene.id === 'lunch' ? UtensilsCrossed : scene.id === 'pottery' ? Paintbrush : scene.id === 'creative' ? Mail : scene.id === 'cafe' || scene.id === 'pause' ? Coffee : Compass;
  return <div className="space-y-3" role="group" aria-label="Bạn chọn cách dẫn câu chuyện">
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Bạn muốn nói gì với {scenario.cast?.visitor ?? 'người bạn'}?</p>
    {scene.choices.map((choice, index) => {
      const presentation = getChoicePresentation(scenario, scene.id, choice);
      return <ActionButton key={choice.id} disabled={disabled} aria-label={choice.label} aria-describedby={id + choice.id} onClick={() => onChoose(choice.id)} className="group flex w-full items-start gap-3 border border-clay-300 bg-clay-200/60 text-left text-clay-900 transition-colors hover:border-amber-400 hover:bg-amber-400/5 motion-reduce:transition-none">
        <span aria-hidden="true" className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-700"><Icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className="block text-xs font-normal text-clay-600">0{index + 1} · {choice.label}</span><span id={id + choice.id} className="mt-1 block text-sm leading-6">“{presentation.speech}”</span><span className="mt-2 block text-xs font-normal leading-5 text-clay-600">{presentation.detail}</span></span>
        <ArrowUpRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-clay-600 group-hover:text-amber-700" />
      </ActionButton>;
    })}
  </div>;
}

export function PlayerEcho({ scenario, scene, choice }: { scenario: Scenario; scene: ChoiceScene; choice: ScenarioChoice }) {
  return <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3">
    <CharacterAvatar name={scenario.cast?.guide ?? 'Bạn'} guide small />
    <div className="min-w-0"><p className="text-xs text-amber-700">{scenario.cast?.guide ?? 'Bạn'} · lời bạn vừa chọn</p><p className="mt-1 text-sm leading-6 text-clay-800">“{getChoicePresentation(scenario, scene.id, choice).speech}”</p></div>
  </div>;
}
