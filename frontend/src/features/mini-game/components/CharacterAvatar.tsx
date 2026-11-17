import { useId } from 'react';

export function CharacterAvatar({ name, guide = false, mood = 'warm', small = false }: {
  name: string; guide?: boolean; mood?: 'curious' | 'warm' | 'thoughtful'; small?: boolean;
}) {
  const id = useId();
  const moodName = mood === 'curious' ? 'tò mò' : mood === 'thoughtful' ? 'suy ngẫm' : 'mỉm cười';
  return <span role="img" aria-label={name + ' · ' + moodName} className={'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border ' + (small ? 'h-10 w-10' : 'h-14 w-14') + (guide ? ' border-amber-400/30 bg-amber-400/10' : ' border-sky-400/30 bg-sky-400/10')}>
    <svg aria-hidden="true" viewBox="0 0 64 64" className="h-full w-full">
      <defs><linearGradient id={id} x2="0" y2="1"><stop stopColor={guide ? '#fbbf24' : '#7dd3fc'} /><stop offset="1" stopColor={guide ? '#d97706' : '#0284c7'} /></linearGradient></defs>
      <path d="M7 64q1-20 25-20t25 20" fill={`url(#${id})`} />
      <ellipse cx="32" cy="29" rx="17" ry="20" fill="#f5c6a0" />
      <path d={guide ? 'M15 30V19Q17 4 32 6q18-1 18 21-9-5-13-13-5 12-22 16' : 'M14 31V20Q13 4 32 5q21 1 19 28l-6-7-2-13q-8 9-22 10l-3 11Z'} fill="#30241f" />
      <g fill="none" stroke="#49342d" strokeWidth="2" strokeLinecap="round">
        <path d={mood === 'curious' ? 'M22 24l5-2M37 22l5 2' : 'M22 24h5M37 24h5'} />
        <path d="M25 29v2M39 29v2" />
        <path d={mood === 'warm' ? 'M27 37q5 5 10 0' : mood === 'curious' ? 'M30 38q2-2 4 0' : 'M29 38h6'} />
      </g>
    </svg>
  </span>;
}

export function CharacterCast({ guide, visitor }: { guide: string; visitor: string }) {
  return <div className="grid grid-cols-2 gap-3" aria-label="Hai người bạn đồng hành">
    {[{ name: guide, isGuide: true }, { name: visitor, isGuide: false }].map(({ name, isGuide }) => <div key={name + String(isGuide)} className="flex min-w-0 items-center gap-3 rounded-2xl border border-clay-200 bg-clay-100/70 p-3">
      <CharacterAvatar name={name} guide={isGuide} small />
      <div className="min-w-0"><p className={'break-words font-semibold ' + (isGuide ? 'text-amber-800' : 'text-sky-800')}>{name}</p><p className="mt-1 text-xs leading-5 text-clay-600">{isGuide ? 'Vai của bạn' : 'Bạn đồng hành'}</p></div>
    </div>)}
  </div>;
}
