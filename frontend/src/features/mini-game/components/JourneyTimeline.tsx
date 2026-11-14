import { Check, Sun, Sunrise, Sunset } from 'lucide-react';
import type { GameState } from '../state';

export function JourneyTimeline({ game, provinceName, isHanoi }: { game: GameState | null; provinceName: string; isHanoi: boolean }) {
  const started = game !== null && game.phase !== 'intro';
  const current = !started ? 0 : game.phase === 'completed' ? 3 : game.sceneId === 'morning' ? 0 : game.sceneId === 'lunch' ? 1 : 2;
  const steps = [
    { label: 'Buổi sáng', detail: isHanoi ? 'Hồ Gươm' : provinceName, Icon: Sunrise },
    { label: 'Buổi trưa', detail: 'Bữa trưa', Icon: Sun },
    { label: 'Buổi chiều', detail: 'Trải nghiệm cùng bạn', Icon: Sunset },
  ];
  return <div className="rounded-2xl border border-clay-200 bg-clay-100/60 px-2 py-4 sm:px-4">
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute top-5 right-[16.6667%] left-[16.6667%] h-0.5 overflow-hidden bg-clay-300">
        <div className="mini-game-timeline-fill h-full origin-left bg-amber-400" style={{ transform: `scaleX(${Math.min(current, 2) / 2})` }} />
      </div>
      <ol aria-label="Các chặng trong ngày" className="relative grid grid-cols-3 gap-2">
      {steps.map(({ label, detail, Icon }, index) => {
        const complete = current > index;
        const active = started && current === index;
        return <li key={label} aria-current={active ? 'step' : undefined} data-state={complete ? 'complete' : active ? 'current' : 'upcoming'} className="relative min-w-0 text-center">
          <span className={'mini-game-timeline-node relative mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border ' + (complete ? 'border-amber-400/60 bg-amber-400 text-clay-900' : active ? 'border-amber-400 bg-clay-100 text-amber-700 shadow-[0_0_0_5px_rgba(251,191,36,0.12)]' : 'border-clay-300 bg-clay-100 text-clay-600')}>
            {complete ? <Check aria-hidden="true" className="h-5 w-5" /> : <Icon aria-hidden="true" className="h-5 w-5" />}
          </span>
          <span className={'block text-xs font-semibold sm:text-sm ' + (active ? 'text-amber-800' : complete ? 'text-clay-800' : 'text-clay-600')}>{label}</span>
          <span className="mt-1 block break-words text-[11px] leading-4 text-clay-600 sm:text-xs">{detail}</span>
          <span className="sr-only">{complete ? 'Đã trải nghiệm' : active ? 'Đang trải nghiệm' : 'Sắp tới'}</span>
        </li>;
      })}
      </ol>
    </div>
  </div>;
}