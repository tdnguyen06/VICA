import { TransitionImage } from './StoryMotion';
import { useId, useRef, useEffect, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { NarrativeBlock } from '../scenario';
import { hanoiVisuals } from '../content/media';
import { CharacterAvatar } from './CharacterAvatar';
import { getCharacterMood } from '../immersion';

export const actionClass = 'min-h-12 rounded-xl px-5 py-3 font-semibold text-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400 disabled:opacity-50 disabled:cursor-not-allowed';

export function ActionButton({ children, className = '', onClick, onKeyDown, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} type="button" className={actionClass + ' ' + className}
    onClick={event => { if (event.detail < 2) onClick?.(event); }}
    onKeyDown={event => { if (event.repeat) event.preventDefault(); else onKeyDown?.(event); }}>
    {children}
  </button>;
}

export function Narrative({ blocks, guideName = 'An' }: { blocks: readonly NarrativeBlock[]; guideName?: string }) {
  const notes = blocks.filter(block => block.kind === 'gameplay');
  return <div className="space-y-5 leading-7 text-clay-800">
    {blocks.filter(block => block.kind !== 'gameplay').map((block, index) => block.speaker ? <div key={index} className={'flex items-start gap-3 ' + (block.speaker === guideName ? 'sm:mr-8' : 'flex-row-reverse sm:ml-8')}>
      <CharacterAvatar name={block.speaker} guide={block.speaker === guideName} mood={getCharacterMood(block)} small />
      <div className={'min-w-0 flex-1 rounded-2xl border p-4 clay-soft ' + (block.speaker === guideName ? 'rounded-tl-sm border-amber-400/20 bg-amber-400/5' : 'rounded-tr-sm border-sky-400/20 bg-sky-400/5')}>
        <p className={'mb-1 text-xs font-bold ' + (block.speaker === guideName ? 'text-amber-700' : 'text-sky-700')}>{block.speaker}{block.speaker === guideName ? ' · vai của bạn' : ''}</p><p className="break-words">{block.text}</p>
      </div>
    </div> : block.kind === 'culture' ? <aside key={index} aria-label="Góc khám phá" className="rounded-2xl border border-clay-300 bg-clay-200/60 p-4 text-sm leading-6 text-clay-700"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Góc khám phá</p><p>{block.text}</p></aside>
      : <p key={index} className={block.kind === 'cultural-placeholder' ? 'rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-800' : 'text-sm leading-7 text-clay-700 sm:text-base'}>{block.text}</p>)}
    {notes.length ? <details className="rounded-xl border border-clay-200 px-4 py-3 text-xs leading-6 text-clay-600"><summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400">Lưu ý về trải nghiệm và minh họa</summary><div className="mt-2 space-y-2">{notes.map((note, index) => <p key={index}>{note.text}</p>)}</div></details> : null}
  </div>;
}

export function StoryVisual({ theme, motif, assetId, src = null, alt = '' }: {
  theme: string; motif?: string; assetId?: string | null; src?: string | null; alt?: string;
}) {
  const asset = assetId ? hanoiVisuals[assetId] : undefined;
  const photo = asset?.kind === 'photo' ? asset : null;
  const imageSrc = src ?? photo?.src ?? null;
  const description = alt || asset?.alt || 'Minh họa bố cục thẻ truyện';
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const gradientId = useId();
  const hasImage = imageSrc !== null && failedSrc !== imageSrc;
  const cup = theme === 'pottery' || asset?.id.startsWith('cup-');
  const leaves = asset?.id === 'cup-leaves' || motif === 'pottery-leaves';
  const geometric = asset?.id === 'cup-geometric' || motif === 'pottery-geometric';
  const table = asset?.id === 'lunch-table';

  return <figure className="overflow-hidden rounded-2xl border border-clay-300 bg-clay-100">
    <div className={cup ? "aspect-[4/3] w-full overflow-hidden bg-white" : "aspect-[16/9] w-full overflow-hidden"}>
      {hasImage ? <TransitionImage src={imageSrc} alt={description} loading="lazy" decoding="async"
        width={photo?.width} height={photo?.height}
        className={cup ? "h-full w-full object-contain" : "h-full w-full object-cover"} style={{ objectPosition: photo?.objectPosition }}
        onError={() => setFailedSrc(imageSrc)} />
        : <svg viewBox="0 0 640 300" className="h-full w-full" role="img"
            aria-label={asset?.kind === 'svg' ? description : 'Minh họa dự phòng khi chưa có hoặc không tải được ảnh'}>
          <defs><linearGradient id={gradientId} x2="1" y2="1"><stop stopColor="#172554" /><stop offset="1" stopColor="#0f172a" /></linearGradient></defs>
          <rect width="640" height="300" fill={`url(#${gradientId})`} />
          <circle cx="480" cy="72" r="36" fill="#fbbf24" opacity=".75" />
          {cup ? <g fill="none" strokeWidth="5">
            <ellipse cx="320" cy="246" rx="95" ry="12" fill="#020617" opacity=".4" />
            <path d="M245 80 H385 L372 225 Q315 247 258 225 Z" fill="#e2e8f0" stroke="#94a3b8" />
            <path d="M385 105 C455 88 451 191 378 190" stroke="#e2e8f0" />
            {leaves ? <g stroke="#047857"><path d="M315 215 V112 M315 171 Q273 156 278 133 Q309 133 315 171 M315 186 Q353 167 350 145 Q322 148 315 186" /></g>
              : geometric ? <g stroke="#b45309"><path d="M275 120 L296 150 L275 180 L296 210 M325 120 L346 150 L325 180 L346 210" /></g> : null}
          </g> : table ? <g>
            <ellipse cx="320" cy="215" rx="190" ry="46" fill="#78350f" />
            <path d="M245 145 Q260 225 320 225 Q380 225 395 145 Z" fill="#e2e8f0" />
            <ellipse cx="320" cy="145" rx="75" ry="20" fill="#94a3b8" />
            <path d="M430 115 L448 220 M445 112 L462 218" stroke="#fbbf24" strokeWidth="6" />
          </g> : <g>
            <path d="M0 220 Q160 180 320 220 T640 220 V300 H0" fill="#164e63" />
            <path d="M70 205 V136 H138 V205 M170 205 V112 H246 V205 M273 205 V148 H336 V205" fill="#334155" />
            <path d="M50 136 L104 98 L158 136 M150 112 L208 74 L266 112" fill="#92400e" />
            <path d="M380 240 Q455 185 545 240" fill="none" stroke="#fbbf24" strokeWidth="7" opacity=".7" />
          </g>}
        </svg>}
    </div>
    <figcaption className="space-y-2 border-t border-clay-300 px-4 py-3 text-xs leading-5 text-clay-600">
      <p>{hasImage ? photo?.caption ?? alt : asset?.kind === 'svg' ? asset.caption : 'Không tải được ảnh hoặc chưa có ảnh · hiển thị minh họa dự phòng.'}</p>
      {photo ? <details>
        <summary className="cursor-pointer text-amber-700 focus-visible:outline-2 focus-visible:outline-amber-400">Nguồn ảnh và quyền sử dụng</summary>
        <div className="mt-2 space-y-1 break-words">
          <p>Ảnh: {photo.author} · <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Wikimedia Commons</a></p>
          <p>Giấy phép: {photo.licenseUrl ? <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{photo.license}</a> : photo.license}</p>
          <p>{photo.changes}</p>
          <p>Đối chiếu metadata nguồn ngày {photo.reviewedOn}; không xác minh dịch vụ hoặc nội dung văn hóa trong truyện.</p>
        </div>
      </details> : asset?.kind === 'svg' ? <p>Minh họa bằng mã SVG trong dự án VICA, không phải ảnh tư liệu.</p> : null}
    </figcaption>
  </figure>;
}


export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onClose }: {
  title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} aria-labelledby={id} aria-describedby={id + '-description'}
    onCancel={event => { event.preventDefault(); onClose(); }}
    className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-clay-300 bg-clay-100 p-6 text-clay-900 backdrop:bg-black/70">
    <h2 id={id} className="text-xl font-bold">{title}</h2>
    <div id={id + '-description'} className="my-4 text-sm leading-6 text-clay-700">{children}</div>
    <div className="flex flex-wrap justify-end gap-3">
      <ActionButton className="border border-clay-400" onClick={onClose}>Hủy</ActionButton>
      <ActionButton className="bg-amber-400 text-clay-900" onClick={onConfirm}>{confirmLabel}</ActionButton>
    </div>
  </dialog>;
}
