import React, { useEffect, useState } from 'react';
import { Landmark, X, Sparkles, Utensils, Calendar, MapPin, Users, BookOpen } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useCultureEntries, useCultureOverview } from '../../hooks/useProvinceCulture';
import type { EntryType } from '../../api/cultureApi';
import { EntryCard } from './EntryCard';
import { EntryDetail } from './EntryDetail';
import { EmptyState, ErrorState, LoadingState } from './QueryStates';

type TabKey = 'OVERVIEW' | EntryType;

const TABS: { key: TabKey; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'OVERVIEW', label: 'Tổng quan & Lối sống', icon: BookOpen },
  { key: 'HERITAGE', label: 'Di sản', icon: Landmark },
  { key: 'CUISINE', label: 'Món ăn đặc trưng', icon: Utensils },
  { key: 'FESTIVAL', label: 'Lễ hội & Phong tục', icon: Calendar },
  { key: 'FIGURE', label: 'Danh nhân', icon: Users },
  { key: 'PLACE', label: 'Địa danh', icon: MapPin },
];

/**
 * Province Detail Drawer (Người 2 – Cultural Exploration).
 * Cho phép người dùng soi sâu vào từng tỉnh để khám phá di sản, món ăn đặc trưng,
 * lễ hội, phong tục tập quán và lối sống văn hóa.
 */
export const ProvinceDetailDrawer: React.FC = () => {
  const slug = useAppStore((s) => s.currentProvince);
  const isOpen = useAppStore((s) => s.isCultureDrawerOpen);
  const setIsCultureDrawerOpen = useAppStore((s) => s.setIsCultureDrawerOpen);
  const openAssistantWithPrompt = useAppStore((s) => s.openAssistantWithPrompt);

  const [tab, setTab] = useState<TabKey>('OVERVIEW');
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);

  // Reset view whenever another province is selected.
  useEffect(() => {
    setTab('OVERVIEW');
    setOpenEntryId(null);
  }, [slug]);

  // Esc closes the drawer.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCultureDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, setIsCultureDrawerOpen]);

  const overview = useCultureOverview(slug);
  const entries = useCultureEntries(slug, tab === 'OVERVIEW' ? null : tab);

  if (!isOpen || !slug) return null;

  const province = overview.data?.province;
  const changeTab = (key: TabKey) => {
    setTab(key);
    setOpenEntryId(null);
  };

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="province-drawer-title"
      className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-lg flex-col border-l border-slate-800 bg-slate-950/98 text-slate-100 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-300"
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-800 p-4 bg-slate-900/60">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">
            <Landmark className="h-3.5 w-3.5" aria-hidden="true" /> Khám phá Tri thức Văn hóa
          </p>
          <h2 id="province-drawer-title" className="truncate text-xl font-extrabold text-white">
            {province?.name ?? slug}
          </h2>
          {province && <p className="text-xs text-slate-400 mt-0.5">{province.adminUnit}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const prompt = `Giới thiệu chi tiết nét đẹp văn hóa, di sản, ẩm thực và phong tục tập quán của ${province?.name || slug}`;
              openAssistantWithPrompt(prompt, slug);
            }}
            title="Mở Trợ lý AI để đàm thoại về địa phương này"
            className="rounded-lg px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Hỏi AI</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCultureDrawerOpen(false)}
            aria-label="Đóng bảng khám phá văn hóa"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Navigation tabs: 3 cột x 2 hàng để luôn thấy đủ 6 tab */}
      <nav
        className="grid grid-cols-3 gap-1 border-b border-slate-800/80 bg-slate-900/40 p-2"
        aria-label="Loại nội dung"
      >
        {TABS.map((t) => {
          const count = t.key !== 'OVERVIEW' ? overview.data?.counts[t.key] : undefined;
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => changeTab(t.key)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition ${
                active
                  ? 'bg-amber-500/15 font-bold text-amber-300 ring-1 ring-amber-500/40'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t.label}</span>
              {count !== undefined && count > 0 && (
                <span className="shrink-0 rounded-full bg-slate-800 px-1.5 text-[10px] text-slate-400">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {openEntryId !== null ? (
          <EntryDetail id={openEntryId} onBack={() => setOpenEntryId(null)} />
        ) : tab === 'OVERVIEW' ? (
          <>
            {overview.isPending && <LoadingState rows={4} />}
            {overview.isError && <ErrorState onRetry={() => void overview.refetch()} />}
            {overview.data && (
              <div className="space-y-5">
                {overview.data.overview ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" /> Bản sắc & Tổng quan Văn hóa
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">
                      {overview.data.overview}
                    </p>
                  </div>
                ) : (
                  <EmptyState message="Chưa có dữ liệu tổng quan cho địa phương này." />
                )}

                {/* Highlights section */}
                {overview.data.highlights.length > 0 && (
                  <section className="space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Các Điểm Nổi Bật Tiêu Biểu
                    </h3>
                    <div className="space-y-2">
                      {overview.data.highlights.map((e) => (
                        <EntryCard key={e.id} entry={e} onOpen={setOpenEntryId} />
                      ))}
                    </div>
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
              <EmptyState message="Chưa có nội dung thuộc chuyên mục này cho địa phương." />
            )}
            {entries.data && entries.data.length > 0 && (
              <div className="space-y-2.5">
                {entries.data.map((e) => (
                  <EntryCard key={e.id} entry={e} onOpen={setOpenEntryId} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <footer className="border-t border-slate-800 p-3 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
        <span>VICA Cultural Intelligence</span>
        <button
          type="button"
          onClick={() => {
            const prompt = `Kể về các truyền thuyết, phong tục và món ăn đặc sản tiêu biểu của ${province?.name || slug}`;
            openAssistantWithPrompt(prompt, slug);
          }}
          className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Trò chuyện với Trợ lý AI</span>
        </button>
      </footer>
    </aside>
  );
};
