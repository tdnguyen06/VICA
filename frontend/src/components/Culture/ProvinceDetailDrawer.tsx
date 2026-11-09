import React, { useEffect, useState } from 'react';
import { Landmark, X } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useCultureEntries, useCultureOverview } from '../../hooks/useProvinceCulture';
import type { EntryType } from '../../api/cultureApi';
import { EntryCard } from './EntryCard';
import { EntryDetail } from './EntryDetail';
import { EmptyState, ErrorState, LoadingState } from './QueryStates';

type TabKey = 'OVERVIEW' | EntryType;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'OVERVIEW', label: 'Tổng quan' },
  { key: 'HERITAGE', label: 'Di sản' },
  { key: 'CUISINE', label: 'Ẩm thực' },
  { key: 'FESTIVAL', label: 'Lễ hội' },
  { key: 'FIGURE', label: 'Nhân vật' },
  { key: 'PLACE', label: 'Địa điểm' },
];

/**
 * Province Detail Drawer (Người 2 – Cultural).
 * Reads the selected province slug that the map (Người 1) writes into appStore.currentProvince.
 */
export const ProvinceDetailDrawer: React.FC = () => {
  const slug = useAppStore((s) => s.currentProvince);
  const setCurrentProvince = useAppStore((s) => s.setCurrentProvince);
  const [tab, setTab] = useState<TabKey>('OVERVIEW');
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);

  // Reset view whenever another province is selected.
  useEffect(() => {
    setTab('OVERVIEW');
    setOpenEntryId(null);
  }, [slug]);

  // Esc closes the drawer.
  useEffect(() => {
    if (!slug) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCurrentProvince(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slug, setCurrentProvince]);

  const overview = useCultureOverview(slug);
  const entries = useCultureEntries(slug, tab === 'OVERVIEW' ? null : tab);

  if (!slug) return null;

  const province = overview.data?.province;
  const changeTab = (key: TabKey) => {
    setTab(key);
    setOpenEntryId(null);
  };

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="province-drawer-title"
      className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-slate-800 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-md"
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-800 p-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            <Landmark className="h-3.5 w-3.5" aria-hidden="true" /> Tri thức văn hóa địa phương
          </p>
          <h2 id="province-drawer-title" className="truncate text-xl font-bold text-white">
            {province?.name ?? (overview.isError ? slug : 'Đang tải…')}
          </h2>
          {province && <p className="text-xs text-slate-400">{province.adminUnit}</p>}
        </div>
        <button
          type="button"
          onClick={() => setCurrentProvince(null)}
          aria-label="Đóng"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 px-2" aria-label="Loại nội dung">
        {TABS.map((t) => {
          const count = t.key !== 'OVERVIEW' ? overview.data?.counts[t.key] : undefined;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => changeTab(t.key)}
              aria-current={active ? 'page' : undefined}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition ${
                active ? 'border-amber-400 font-semibold text-amber-300' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
              {count !== undefined && <span className="ml-1 text-xs text-slate-500">({count})</span>}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-y-auto p-4">
        {openEntryId !== null ? (
          <EntryDetail id={openEntryId} onBack={() => setOpenEntryId(null)} />
        ) : tab === 'OVERVIEW' ? (
          <>
            {overview.isPending && <LoadingState rows={4} />}
            {overview.isError && <ErrorState onRetry={() => void overview.refetch()} />}
            {overview.data && (
              <div className="space-y-4">
                {overview.data.overview ? (
                  <p className="text-sm leading-relaxed text-slate-200">{overview.data.overview}</p>
                ) : (
                  <EmptyState message="Chưa có phần giới thiệu văn hóa đã kiểm duyệt cho địa phương này." />
                )}
                {overview.data.highlights.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nổi bật</h3>
                    {overview.data.highlights.map((e) => (
                      <EntryCard key={e.id} entry={e} onOpen={setOpenEntryId} />
                    ))}
                  </section>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {entries.isPending && <LoadingState />}
            {entries.isError && <ErrorState onRetry={() => void entries.refetch()} />}
            {entries.data && entries.data.length === 0 && (
              <EmptyState message="Chưa có nội dung đã kiểm duyệt cho mục này." />
            )}
            {entries.data && entries.data.length > 0 && (
              <div className="space-y-2">
                {entries.data.map((e) => (
                  <EntryCard key={e.id} entry={e} onOpen={setOpenEntryId} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};