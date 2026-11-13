import React from 'react';
import { BookOpen, ChevronRight, MapPin } from 'lucide-react';
import type { CultureEntrySummary } from '../../api/cultureApi';
import { VerificationBadge } from './VerificationBadge';

const CATEGORY_LABEL: Record<string, string> = {
  TANGIBLE: 'Vật thể',
  INTANGIBLE: 'Phi vật thể',
};

interface EntryCardProps {
  entry: CultureEntrySummary;
  onOpen: (id: number) => void;
}

export const EntryCard: React.FC<EntryCardProps> = ({ entry, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(entry.id)}
    className="group flex w-full gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-left transition hover:border-amber-500/50 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
  >
    {entry.thumbnailUrl && (
      <img src={entry.thumbnailUrl} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
    )}
    <div className="min-w-0 flex-1 space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <VerificationBadge status={entry.verificationStatus} />
        {entry.category && CATEGORY_LABEL[entry.category] && (
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
            {CATEGORY_LABEL[entry.category]}
          </span>
        )}
      </div>
      <h4 className="font-semibold text-slate-100 group-hover:text-amber-300">{entry.name}</h4>
      {entry.summary && <p className="line-clamp-2 text-xs text-slate-400">{entry.summary}</p>}
      <div className="flex items-center gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <BookOpen className="h-3 w-3" aria-hidden="true" /> {entry.sourceCount} nguồn
        </span>
        {entry.coordinate && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" aria-hidden="true" /> Có vị trí
          </span>
        )}
      </div>
    </div>
    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-600 group-hover:text-amber-400" aria-hidden="true" />
  </button>
);