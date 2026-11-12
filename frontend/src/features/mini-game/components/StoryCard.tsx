import { useId, useRef, useEffect, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { NarrativeBlock } from '../scenario';

export const actionClass = 'min-h-12 rounded-xl px-5 py-3 font-semibold text-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400 disabled:opacity-50 disabled:cursor-not-allowed';

export function ActionButton({ children, className = '', onClick, onKeyDown, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} type="button" className={actionClass + ' ' + className}
    onClick={event => { if (event.detail < 2) onClick?.(event); }}
    onKeyDown={event => { if (event.repeat) event.preventDefault(); else onKeyDown?.(event); }}>
    {children}
  </button>;
}

export function Narrative({ blocks }: { blocks: readonly NarrativeBlock[] }) {
  return <div className="space-y-4 leading-7 text-slate-200">
    {blocks.map((block, index) => <p key={index} className={block.kind === 'cultural-placeholder' ? 'rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200' : ''}>
      {block.text}
    </p>)}
  </div>;
}

export function StoryVisual({ theme, motif, src = null, alt = '' }: {
  theme: string; motif?: string; src?: string | null; alt?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const gradientId = useId();
  const cup = theme === 'pottery';
  return <figure className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
    {src && failedSrc !== src
      ? <img src={src} alt={alt} className="aspect-[16/9] w-full object-cover" onError={() => setFailedSrc(src)} />
      : <svg viewBox="0 0 640 300" className="aspect-[16/9] max-h-72 w-full" role="img"
          aria-label={cup ? (motif === 'pottery-leaves' ? 'Minh họa cốc họa tiết cây lá' : 'Minh họa cốc họa tiết hình học') : 'Minh họa bố cục thẻ truyện, chưa có ảnh tư liệu'}>
          <defs><linearGradient id={gradientId} x2="1" y2="1"><stop stopColor="#172554" /><stop offset="1" stopColor="#0f172a" /></linearGradient></defs>
          <rect width="640" height="300" fill={`url(#${gradientId})`} />
          <circle cx="480" cy="72" r="36" fill="#fbbf24" opacity=".75" />
          {cup ? <g fill="none" strokeWidth="5">
            <path d="M245 80 H385 L372 225 Q315 247 258 225 Z" fill="#e2e8f0" stroke="#94a3b8" />
            <path d="M385 105 C455 88 451 191 378 190" stroke="#e2e8f0" />
            {motif === 'pottery-leaves'
              ? <g stroke="#047857"><path d="M315 215 V112 M315 171 Q273 156 278 133 Q309 133 315 171 M315 186 Q353 167 350 145 Q322 148 315 186" /></g>
              : <g stroke="#b45309"><path d="M275 120 L296 150 L275 180 L296 210 M325 120 L346 150 L325 180 L346 210" /></g>}
          </g> : <g>
            <path d="M0 220 Q160 180 320 220 T640 220 V300 H0" fill="#164e63" />
            <path d="M70 205 V136 H138 V205 M170 205 V112 H246 V205 M273 205 V148 H336 V205" fill="#334155" />
            <path d="M50 136 L104 98 L158 136 M150 112 L208 74 L266 112" fill="#92400e" />
            <path d="M380 240 Q455 185 545 240" fill="none" stroke="#fbbf24" strokeWidth="7" opacity=".7" />
          </g>}
        </svg>}
    <figcaption className="border-t border-slate-700 px-4 py-2 text-xs text-slate-400">
      {src && failedSrc !== src ? alt : 'Minh họa placeholder · chưa phải ảnh tư liệu'}
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
    className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 backdrop:bg-black/70">
    <h2 id={id} className="text-xl font-bold">{title}</h2>
    <div id={id + '-description'} className="my-4 text-sm leading-6 text-slate-300">{children}</div>
    <div className="flex flex-wrap justify-end gap-3">
      <ActionButton className="border border-slate-600" onClick={onClose}>Hủy</ActionButton>
      <ActionButton className="bg-amber-400 text-slate-950" onClick={onConfirm}>{confirmLabel}</ActionButton>
    </div>
  </dialog>;
}
