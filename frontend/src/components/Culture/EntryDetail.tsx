import React from 'react';
import { ArrowLeft, Box, CalendarClock, MapPin } from 'lucide-react';
import { useCultureEntry } from '../../hooks/useProvinceCulture';
import { VerificationBadge } from './VerificationBadge';
import { SourceList } from './SourceList';
import { ErrorState, LoadingState } from './QueryStates';

interface EntryDetailProps {
  id: number;
  onBack: () => void;
}

export const EntryDetail: React.FC<EntryDetailProps> = ({ id, onBack }) => {
  const { data: entry, isPending, isError, refetch } = useCultureEntry(id);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs font-medium text-clay-600 hover:text-amber-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Quay lại danh sách
      </button>

      {isPending && <LoadingState rows={3} />}
      {isError && <ErrorState onRetry={() => void refetch()} />}

      {entry && (
        <article className="space-y-4">
          <header className="space-y-2">
            <VerificationBadge status={entry.verificationStatus} />
            <h3 className="text-lg font-bold text-clay-900">{entry.name}</h3>
            <div className="flex flex-wrap gap-3 text-xs text-clay-600">
              {entry.historicalPeriod && (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> {entry.historicalPeriod}
                </span>
              )}
              {entry.coordinate && (
                <span className="inline-flex items-center gap-1 font-mono">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {entry.coordinate.latitude.toFixed(4)}, {entry.coordinate.longitude.toFixed(4)}
                </span>
              )}
            </div>
          </header>

          {entry.verificationStatus === 'LEGEND' && (
            <p className="rounded-lg border border-amber-300/50 bg-amber-50/30 p-2.5 text-xs text-amber-800">
              Đây là nội dung truyền thuyết, dân gian. Nguồn bên dưới ghi nhận câu chuyện, không xác nhận đây là sự kiện lịch sử.
            </p>
          )}

          {entry.media.filter((m) => m.mediaType === 'IMAGE').map((m) => (
            <figure key={m.id} className="overflow-hidden rounded-xl border border-clay-200">
              <img src={m.url} alt={m.caption ?? entry.name} loading="lazy" className="w-full object-cover" />
              {(m.caption || m.credit) && (
                <figcaption className="bg-clay-50 px-2.5 py-1.5 text-[11px] text-clay-600">
                  {m.caption}{m.caption && m.credit ? ' · ' : ''}{m.credit && `Ảnh: ${m.credit}`}
                </figcaption>
              )}
            </figure>
          ))}

          <p className="whitespace-pre-line text-sm leading-relaxed text-clay-800">{entry.description}</p>

          {entry.media.some((m) => m.mediaType === 'MODEL_3D') && (
            <button
              type="button"
              disabled
              title="3D Viewer là phần mở rộng sau MVP"
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-clay-300 px-3 py-1.5 text-xs text-clay-500"
            >
              <Box className="h-3.5 w-3.5" aria-hidden="true" /> Xem 3D (sau MVP)
            </button>
          )}

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-clay-600">Nguồn tham khảo</h4>
            <SourceList sources={entry.sources} />
          </section>
        </article>
      )}
    </div>
  );
};