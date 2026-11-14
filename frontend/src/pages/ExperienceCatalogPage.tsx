import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Search } from 'lucide-react';
import { provinceExperiences } from '../features/mini-game/catalog-data';
import { getCatalogPage } from '../features/mini-game/catalog';
import { useMiniGame } from '../features/mini-game/MiniGameContext';
import { ActionButton, actionClass } from '../features/mini-game/components/StoryCard';
import { ProvinceLuckyWheel } from '../features/mini-game/components/ProvinceLuckyWheel';

export default function ExperienceCatalogPage() {
  const [params, setParams] = useSearchParams();
  const { session } = useMiniGame();
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
      <p className="max-w-3xl text-sm leading-6 text-clay-700">Chọn một tỉnh thành để nhập vai người bản địa, cùng người bạn đồng hành khám phá văn hóa, ẩm thực và lưu lại trang nhật ký hành trình của riêng mình.</p>
      <p id="catalog-availability" className="text-sm leading-6 text-amber-800">Hiện có {ready.length} tỉnh thành đã sẵn sàng trải nghiệm: {ready.map(province => province.name).join(', ')}. Các địa phương khác đang tiếp tục được cập nhật.</p>
    </div>

    {currentExperience?.experience ? <aside className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 clay-soft">
      <p className="text-sm text-amber-900">Hành trình đang dở dang tại {currentExperience.name}. {session.unsaved ? 'Có bước chưa lưu trên thiết bị.' : session.issue ? 'Bản lưu cần được kiểm tra trong trải nghiệm.' : 'Bạn có thể tiếp tục bất cứ lúc nào.'}</p>
      <Link to={currentExperience.experience.path + '?view=play'} className={actionClass + ' border border-amber-400/50 text-amber-800'}>{session.game?.phase === 'completed' ? 'Xem nhật ký' : session.game?.phase === 'intro' ? 'Mở lượt chơi' : 'Tiếp tục lượt chơi'}</Link>
    </aside> : null}

    {/* Vòng quay may mắn hiển thị trực tiếp và nổi bật */}
    <ProvinceLuckyWheel allProvinces={provinceExperiences} />

    <div className="space-y-4 rounded-2xl border border-clay-300 bg-clay-100/70 p-4 sm:p-5 clay-soft">
      <label htmlFor="province-search" className="block text-sm font-semibold text-clay-900">Tìm kiếm tỉnh thành</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-clay-600" aria-hidden="true" />
        <input id="province-search" type="search" value={query} maxLength={100} placeholder="Ví dụ: Hà Nội hoặc da nang"
          onChange={event => updateSearch(event.target.value)}
          className="min-h-12 w-full rounded-xl border border-clay-400 bg-clay-50 py-3 pl-10 pr-3 text-base text-clay-900 focus-visible:outline-2 focus-visible:outline-amber-400 clay-soft" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex min-h-12 cursor-pointer items-center gap-3 text-sm text-clay-800">
          <input type="checkbox" checked={readyOnly} onChange={event => updateSearch(query, event.target.checked)} className="h-5 w-5 accent-amber-400" />
          Chỉ hiện tỉnh đã sẵn sàng kịch bản ({ready.length} tỉnh)
        </label>
      </div>
    </div>
    <div className="space-y-4">
      <h2 ref={resultsHeading} tabIndex={-1} className="scroll-mt-24 text-xl font-semibold text-clay-900 outline-none">Danh sách tỉnh thành</h2>
      <p role="status" className="text-sm text-clay-600">{result.total ? result.total + ' tỉnh thành · Trang ' + result.page + '/' + result.pageCount : 'Không tìm thấy tỉnh phù hợp.'}</p>
      {result.total ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map(province => <li key={province.slug} className="flex flex-col gap-3 rounded-2xl border border-clay-300 bg-clay-100/60 p-5 clay-soft">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-clay-900"><MapPin className="h-5 w-5 shrink-0 text-amber-700" />{province.name}</h3>
          <p className="text-xs text-clay-600">{province.adminUnit}</p>
          <p className="text-sm leading-6 text-clay-700">{province.experience?.title ?? 'Kịch bản trải nghiệm đang được biên tập.'}</p>
          {province.experience ? <Link to={province.experience.path} className={actionClass + ' mt-auto inline-flex items-center justify-center bg-amber-400 text-clay-900'}>Khám phá {province.name}</Link>
            : <span className="mt-auto inline-flex min-h-12 items-center rounded-xl border border-clay-300 px-4 py-3 text-sm text-clay-600">Sắp ra mắt</span>}
        </li>)}
      </ul> : <div className="space-y-3 rounded-2xl border border-dashed border-clay-300 p-6 text-sm text-clay-700">
        <p>Không tìm thấy tỉnh phù hợp. Hãy thử tìm tên có dấu, không dấu hoặc tắt bộ lọc.</p>
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
