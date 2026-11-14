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
    <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-300 hover:text-amber-300"><ArrowLeft className="h-4 w-4" /> Về bản đồ</Link>
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Trải nghiệm một ngày</p>
      <h1 ref={pageHeading} tabIndex={-1} className="scroll-mt-24 outline-none text-3xl font-bold tracking-tight text-white sm:text-4xl">Bạn muốn sống một ngày ở đâu?</h1>
      <p className="max-w-3xl text-sm leading-6 text-slate-300">Chọn một tỉnh thành để nhập vai người bản địa, cùng người bạn đồng hành khám phá văn hóa, ẩm thực và lưu lại trang nhật ký hành trình của riêng mình.</p>
      <p id="catalog-availability" className="text-sm leading-6 text-amber-200">Hiện có {ready.length} tỉnh thành đã sẵn sàng trải nghiệm. Các địa phương khác đang tiếp tục được cập nhật.</p>
    </div>

    {currentExperience?.experience ? <aside className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <p className="text-sm text-amber-100">Hành trình đang dở dang tại {currentExperience.name}. {session.unsaved ? 'Đang lưu tạm trên thiết bị.' : 'Bạn có thể tiếp tục bất cứ lúc nào.'}</p>
      <Link to={currentExperience.experience.path + '?view=play'} className={actionClass + ' border border-amber-400/50 text-amber-200'}>{session.game?.phase === 'completed' ? 'Xem nhật ký' : session.game?.phase === 'intro' ? 'Mở lượt chơi' : 'Tiếp tục lượt chơi'}</Link>
    </aside> : null}

    <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 sm:p-5">
      <label htmlFor="province-search" className="block text-sm font-semibold text-slate-100">Tìm tỉnh thành</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" aria-hidden="true" />
        <input id="province-search" type="search" value={query} maxLength={100} placeholder="Ví dụ: Hà Nội hoặc da nang"
          onChange={event => updateSearch(event.target.value)}
          className="min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 py-3 pl-10 pr-3 text-base text-white focus-visible:outline-2 focus-visible:outline-amber-400" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex min-h-12 cursor-pointer items-center gap-3 text-sm text-slate-200">
          <input type="checkbox" checked={readyOnly} onChange={event => updateSearch(query, event.target.checked)} className="h-5 w-5 accent-amber-400" />
          Chỉ hiện tỉnh đã sẵn sàng
        </label>
        <ActionButton disabled={!ready.length} aria-describedby="random-explanation" onClick={() => setRandomProvince(chooseRandomExperience(provinceExperiences))}
          className="inline-flex items-center gap-2 border border-amber-400/50 bg-amber-400 text-slate-950"><Shuffle className="h-4 w-4" /> Chọn tỉnh ngẫu nhiên</ActionButton>
      </div>
      <p id="random-explanation" className="text-xs leading-5 text-slate-400">Gợi ý ngẫu nhiên một địa phương đã sẵn sàng để bạn khám phá ngay.</p>
    </div>

    {randomProvince?.experience ? <aside aria-live="polite" className="space-y-3 rounded-2xl border border-amber-400/50 bg-amber-500/10 p-5">
      <h2 className="text-lg font-semibold text-amber-200">Tỉnh được chọn: {randomProvince.name}</h2>
      <p className="text-sm text-slate-300">{randomProvince.experience.title}</p>
      <div className="flex flex-wrap gap-3">
        <Link to={randomProvince.experience.path} className={actionClass + ' inline-flex items-center bg-amber-400 text-slate-950'}>Khám phá {randomProvince.name}</Link>
        <ActionButton onClick={() => setRandomProvince(null)} className="border border-slate-600 text-slate-200">Bỏ chọn</ActionButton>
      </div>
    </aside> : null}

    <div className="space-y-4">
      <h2 ref={resultsHeading} tabIndex={-1} className="scroll-mt-24 text-xl font-semibold text-white outline-none">Danh sách tỉnh thành</h2>
      <p role="status" className="text-sm text-slate-400">{result.total ? result.total + ' tỉnh thành · Trang ' + result.page + '/' + result.pageCount : 'Không tìm thấy tỉnh phù hợp.'}</p>
      {result.total ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map(province => <li key={province.slug} className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100"><MapPin className="h-5 w-5 shrink-0 text-amber-300" />{province.name}</h3>
          <p className="text-xs text-slate-400">{province.adminUnit}</p>
          <p className="text-sm leading-6 text-slate-300">{province.experience?.title ?? 'Kịch bản trải nghiệm đang được biên tập.'}</p>
          {province.experience ? <Link to={province.experience.path} className={actionClass + ' mt-auto inline-flex items-center justify-center bg-amber-400 text-slate-950'}>Khám phá {province.name}</Link>
            : <span className="mt-auto inline-flex min-h-12 items-center rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-400">Sắp ra mắt</span>}
        </li>)}
      </ul> : <div className="space-y-3 rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-300">
        <p>Không tìm thấy tỉnh phù hợp. Hãy thử tìm tên có dấu, không dấu hoặc tắt bộ lọc.</p>
        <ActionButton onClick={() => updateSearch('', false)} className="border border-slate-600">Xóa tìm kiếm và bộ lọc</ActionButton>
      </div>}
      {result.pageCount > 1 ? <nav aria-label="Phân trang tỉnh thành" className="flex flex-wrap items-center justify-center gap-2">
        <ActionButton disabled={result.page === 1} onClick={() => turnPage(result.page - 1)} className="border border-slate-600">Trang trước</ActionButton>
        {Array.from({ length: result.pageCount }, (_, index) => index + 1).map(page => <ActionButton key={page} aria-label={'Trang ' + page} aria-current={page === result.page ? 'page' : undefined}
          onClick={() => turnPage(page)} className={page === result.page ? 'bg-amber-400 text-slate-950' : 'border border-slate-600 text-slate-200'}>{page}</ActionButton>)}
        <ActionButton disabled={result.page === result.pageCount} onClick={() => turnPage(result.page + 1)} className="border border-slate-600">Trang sau</ActionButton>
      </nav> : null}
    </div>
  </section>;
}
