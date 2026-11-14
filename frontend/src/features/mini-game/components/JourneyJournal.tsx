import { BookHeart, Quote } from 'lucide-react';
import type { Scenario } from '../scenario';
import type { GameState } from '../state';
import type { buildJournal } from '../journal';
import { ExperienceVisual } from './ExperienceVisual';
import { Narrative } from './StoryCard';

export function JourneyJournal({ scenario, game, journal }: { scenario: Scenario; game: GameState; journal: NonNullable<ReturnType<typeof buildJournal>> }) {
  return <div className="space-y-6">
    <header className="rounded-2xl border border-amber-200/40 bg-amber-50 p-5 text-clay-800 sm:p-7">
      <BookHeart aria-hidden="true" className="mb-3 h-6 w-6 text-amber-700" />
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-800">Một ngày, ba điều muốn nhớ</p>
      <p className="mt-2 text-2xl font-bold">{scenario.provinceName}, cùng {scenario.cast?.visitor ?? 'người bạn'}</p>
      <p className="mt-3 text-sm leading-6 text-clay-600">{scenario.cast?.guide ?? 'Bạn'} và {scenario.cast?.visitor ?? 'người bạn'} đã cùng chọn ngày hôm nay. Những trang dưới đây chỉ giữ lại điều hai người thực sự trải nghiệm.</p>
    </header>
    <ol aria-label="Nhật ký hành trình" className="space-y-6">{journal.entries.map((entry, index) => {
      const quote = entry.result.blocks.find(block => block.speaker === scenario.cast?.visitor) ?? entry.result.blocks.find(block => block.speaker);
      return <li key={entry.choiceId} style={{ animationDelay: `${index * 70}ms` }} className="mini-game-journal-entry overflow-hidden rounded-2xl border border-clay-300 bg-clay-100">
        <div className="border-b border-clay-300 bg-amber-50 px-4 py-4 text-clay-900 sm:px-5"><p className="mb-1 text-xs uppercase tracking-widest text-amber-800">{['Buổi sáng', 'Buổi trưa', 'Buổi chiều'][index]}</p><h2 className="text-lg font-semibold">{index + 1}. {entry.label}</h2></div>
        <div className="space-y-4 p-3 sm:p-5">
          <ExperienceVisual theme={entry.sceneId} motif={entry.choiceId} assetId={entry.result.imageRef} selectedMorningChoiceId={game.choices.find(choice => choice.sceneId === 'morning')?.choiceId} />
          {quote ? <blockquote className="flex gap-3 rounded-xl bg-clay-200/70 p-4"><Quote aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-700" /><div><p className="text-sm leading-6 text-clay-800">{quote.text}</p><p className="mt-2 text-xs text-sky-700">— {quote.speaker}</p></div></blockquote> : null}
          <details className="rounded-xl border border-clay-300 p-4"><summary className="cursor-pointer text-sm font-medium text-amber-800 focus-visible:outline-2 focus-visible:outline-amber-400">Đọc lại câu chuyện ở chặng này</summary><div className="pt-4"><Narrative guideName={scenario.cast?.guide} blocks={entry.result.blocks} /></div></details>
        </div>
      </li>;
    })}</ol>
    <div className="rounded-2xl border border-amber-200/40 bg-amber-50 p-5 text-clay-800 sm:p-7"><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-800">Dòng cuối trong sổ</p><p className="leading-7">{journal.ending.text}</p><p className="mt-5 text-right text-sm font-semibold text-amber-900">{scenario.cast?.guide} & {scenario.cast?.visitor}</p></div>
  </div>;
}
