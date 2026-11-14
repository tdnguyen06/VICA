import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Search, Shuffle } from 'lucide-react';
import { provinceExperiences } from '../features/mini-game/catalog-data';
import { chooseRandomExperience, getCatalogPage } from '../features/mini-game/catalog';
import type { ProvinceExperience } from '../features/mini-game/catalog';
import { useMiniGame } from '../features/mini-game/MiniGameContext';
import { ActionButton, actionClass } from '../features/mini-game/components/StoryCard';

export default function ExperienceCatalogPage() {
  const [params, setParams] = useSearchParams();
  const { session } = useMiniGame();
  const [randomProvince, setRandomProvince] = useState<ProvinceExperience | null>(null);
  const pageHeading = useRef<HTMLHeadingElement>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { pageHeading.current?.focus(); }, []);
  const query = (params.get('q') ?? '').slice(0, 100);
  const readyOnly = params.get('ready') !== '0';
  const result = getCatalogPage(provinceExperiences, query, Number(params.get('page') ?? 1), readyOnly);
  const ready = provinceExperiences.filter(province => province.status === 'ready');
  const currentExperience = session.game ? ready.find(province => province.experience?.scenarioId === session.game?.scenarioId) : null;
  const updateSearch = (value: string, onlyReady = readyOnly) => {
    const next = new URLSearchParams();
    if (value) next.set('q', value);
    next.set('ready', onlyReady ? '1' : '0');
    setParams(next, { replace: true });
  };
  const turnPage = (page: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(page));
    setParams(next);
    resultsHeading.current?.focus();
  };

  return <section className="mx-auto max-w-5xl space-y-6 pb-8">
    <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-clay-700 hover:text-amber-700"><ArrowLeft className="h-4 w-4" /> Về bản đồ</Link>
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Trải nghiệm một ngày</p>
      <h1 ref={pageHeading} tabIndex={-1} className="scroll-mt-24 outline-none text-3xl font-bold tracking-tight text-clay-900 sm:text-4xl">Bạn muốn sống một ngày ở đâu?</h1>
      <p className="max-w-3xl text-sm leading-6 text-clay-700">Chọn tỉnh thành, nhập vai dẫn một người bạn khám phá và giữ lại nhật ký của riêng mình. Không điểm số, không thắng thua.</p>
      <p id="catalog-availability" className="text-sm leading-6 text-amber-800">Danh sách theo bộ dữ liệu {provinceExperiences.length} tỉnh thành hiện có của VICA. Hiện có {ready.length} tỉnh có kịch bản: {ready.map(province => province.name).join(', ')}. Những tỉnh khác chưa thể chơi.</p>
    </div>

    {currentExperience?.experience ? <aside className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 clay-soft">
      <p className="text-sm text-amber-900">Lượt hiện tại: {currentExperience.name}. {session.unsaved ? 'Có bước chưa lưu trên thiết bị.' : session.issue ? 'Bản lưu cần được kiểm tra trong trải nghiệm.' : 'Chọn tỉnh không thay thế tiến trình của bạn.'}</p>
      <Link to={currentExperience.experience.path + '?view=play'} className={actionClass + ' border border-amber-400/50 text-amber-800'}>{session.game?.phase === 'completed' ? 'Xem nhật ký' : session.game?.phase === 'intro' ? 'Mở lượt chơi' : 'Tiếp tục lượt chơi'}</Link>
    </aside> : null}

    <div className="space-y-4 rounded-2xl border border-clay-300 bg-clay-100/70 p-4 sm:p-5 clay-soft">
      <label htmlFor="province-search" className="block text-sm font-semibold text-clay-900">Tìm tỉnh thành</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-clay-600" aria-hidden="true" />
        <input id="province-search" type="search" value={query} maxLength={100} placeholder="Ví dụ: Hà Nội hoặc da nang"
          onChange={event => updateSearch(event.target.value)}
          className="min-h-12 w-full rounded-xl border border-clay-400 bg-clay-50 py-3 pl-10 pr-3 text-base text-clay-900 focus-visible:outline-2 focus-visible:outline-amber-400 clay-soft" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex min-h-12 cursor-pointer items-center gap-3 text-sm text-clay-800">
          <input type="checkbox" checked={readyOnly} onChange={event => updateSearch(query, event.target.checked)} className="h-5 w-5 accent-amber-400" />
          Chỉ tỉnh có trải nghiệm
        </label>
        <ActionButton disabled={!ready.length} aria-describedby="random-explanation" onClick={() => setRandomProvince(chooseRandomExperience(provinceExperiences))}
          className="inline-flex items-center gap-2 border border-amber-400/50 bg-amber-400 text-clay-900"><Shuffle className="h-4 w-4" /> Chọn tỉnh ngẫu nhiên</ActionButton>
      </div>
      <p id="random-explanation" className="text-xs leading-5 text-clay-600">Ngẫu nhiên trong toàn bộ tỉnh có kịch bản, không giới hạn ở trang hay kết quả tìm kiếm. {ready.length === 1 ? 'Hiện chỉ có ' + ready[0]?.name + ' nên kết quả luôn là ' + ready[0]?.name + '.' : ''}</p>
    </div>

    {randomProvince?.experience ? <aside aria-live="polite" className="space-y-3 rounded-2xl border border-amber-400/50 bg-amber-500/10 p-5 clay-soft">
      <h2 className="text-lg font-semibold text-amber-800">Tỉnh được chọn: {randomProvince.name}</h2>
      <p className="text-sm text-clay-700">{randomProvince.experience.title}. Bạn chưa bắt đầu hoặc thay lượt chơi khi chọn ngẫu nhiên.</p>
      <div className="flex flex-wrap gap-3">
        <Link to={randomProvince.experience.path} className={actionClass + ' inline-flex items-center bg-amber-400 text-clay-900'}>Khám phá {randomProvince.name}</Link>
        <ActionButton onClick={() => setRandomProvince(null)} className="border border-clay-400 text-clay-800">Bỏ chọn</ActionButton>
      </div>
    </aside> : null}

    <div className="space-y-4">
      <h2 ref={resultsHeading} tabIndex={-1} className="scroll-mt-24 text-xl font-semibold text-clay-900 outline-none">Danh sách tỉnh thành</h2>
      <p role="status" className="text-sm text-clay-600">{result.total ? result.total + ' tỉnh thành · Trang ' + result.page + '/' + result.pageCount : 'Không tìm thấy tỉnh phù hợp.'}</p>
      {result.total ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map(province => <li key={province.slug} className="flex flex-col gap-3 rounded-2xl border border-clay-300 bg-clay-100/60 p-5 clay-soft">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-clay-900"><MapPin className="h-5 w-5 shrink-0 text-amber-700" />{province.name}</h3>
          <p className="text-xs text-clay-600">{province.adminUnit}</p>
          <p className="text-sm leading-6 text-clay-700">{province.experience?.title ?? 'Kịch bản của tỉnh này chưa được biên tập và kiểm chứng.'}</p>
          {province.experience ? <Link to={province.experience.path} className={actionClass + ' mt-auto inline-flex items-center justify-center bg-amber-400 text-clay-900'}>Khám phá {province.name}</Link>
            : <span className="mt-auto inline-flex min-h-12 items-center rounded-xl border border-clay-300 px-4 py-3 text-sm text-clay-600">Chưa có trải nghiệm</span>}
        </li>)}
      </ul> : <div className="space-y-3 rounded-2xl border border-dashed border-clay-300 p-6 text-sm text-clay-700">
        <p>Thử tên có dấu hoặc không dấu, hoặc bỏ bộ lọc để xem danh sách.</p>
        <ActionButton onClick={() => updateSearch('', false)} className="border border-clay-400">Xóa tìm kiếm và bộ lọc</ActionButton>
      </div>}
      {result.pageCount > 1 ? <nav aria-label="Phân trang tỉnh thành" className="flex flex-wrap items-center justify-center gap-2">
        <ActionButton disabled={result.page === 1} onClick={() => turnPage(result.page - 1)} className="border border-clay-400">Trang trước</ActionButton>
        {Array.from({ length: result.pageCount }, (_, index) => index + 1).map(page => <ActionButton key={page} aria-label={'Trang ' + page} aria-current={page === result.page ? 'page' : undefined}
          onClick={() => turnPage(page)} className={page === result.page ? 'bg-amber-400 text-clay-900' : 'border border-clay-400 text-clay-800'}>{page}</ActionButton>)}
        <ActionButton disabled={result.page === result.pageCount} onClick={() => turnPage(result.page + 1)} className="border border-clay-400">Trang sau</ActionButton>
      </nav> : null}
    </div>
  </section>;
}
