import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, MapPin, RotateCcw } from 'lucide-react';
import { scenarioById, scenarioByProvince } from '../features/mini-game/scenarios';
import type { Scenario } from '../features/mini-game/scenario';
import { useMiniGame } from '../features/mini-game/MiniGameContext';
import { getCurrentResult } from '../features/mini-game/engine';
import { renderNarrative, buildJournal } from '../features/mini-game/journal';
import { ActionButton, actionClass, ConfirmDialog, Narrative } from '../features/mini-game/components/StoryCard';
import { ExperienceVisual } from '../features/mini-game/components/ExperienceVisual';
import type { GameEvent } from '../features/mini-game/state';
import { CulturalReferences } from '../features/mini-game/components/CulturalReferences';
import { GameAssistantPanel } from '../features/mini-game/components/GameAssistantPanel';

export default function ProvinceExperiencePage() {
  const { provinceSlug = '' } = useParams();
  const story = scenarioByProvince(provinceSlug);
  if (!story) return <section className="mx-auto max-w-3xl space-y-5">
    <h1 className="text-3xl font-bold">Tỉnh này chưa có trải nghiệm</h1>
    <p className="leading-7 text-clay-700">Chọn một tỉnh có kịch bản đã sẵn sàng trong danh sách. Tiến trình hiện tại không bị thay thế.</p>
    <Link to="/experiences" className={actionClass + ' inline-flex items-center bg-amber-400 text-clay-900'}>Chọn tỉnh trải nghiệm</Link>
  </section>;
  return <ExperienceStory key={story.id} story={story} />;
}

function ExperienceStory({ story }: { story: Scenario }) {
  const { session, begin, dispatch, restart, reload, retry } = useMiniGame();
  const [params, setParams] = useSearchParams();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [dialog, setDialog] = useState<'restart' | 'reload' | 'switch' | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const game = session.game?.scenarioId === story.id ? session.game : null;
  const other = session.game && !game ? scenarioById(session.game.scenarioId) : undefined;
  const playing = params.get('view') === 'play' && game !== null && game.phase !== 'intro';
  const blocked = session.issue === 'invalid' || session.issue === 'conflict';
  const result = game ? getCurrentResult(story, game) : null;
  const journal = game ? buildJournal(story, game) : null;
  const scene = game && game.phase !== 'intro' && game.phase !== 'completed' ? story.scenes[game.sceneId] : null;
  const title = !playing ? story.title : journal ? 'Nhật ký một ngày' : result?.title ?? scene?.title ?? story.title;
  const focusKey = playing ? game?.revision : 'intro';

  useEffect(() => { heading.current?.focus(); }, [focusKey]);

  const send = (type: 'choose' | 'continue', choiceId?: string) => {
    if (!game) return;
    const origin = { expectedRunId: game.runId, expectedSceneId: game.sceneId, expectedRevision: game.revision };
    const event: GameEvent = type === 'choose'
      ? { ...origin, type, choiceId: choiceId ?? '' } : { ...origin, type };
    dispatch(event);
  };
  const showPlay = () => setParams({ view: 'play' });
  const issueText = session.issue === 'invalid'
    ? 'Tiến trình đã lưu bị hỏng hoặc không tương thích. Dữ liệu cũ vẫn được giữ; bạn có thể xác nhận chơi lại.'
    : session.issue === 'conflict'
      ? 'Bản lưu đã thay đổi ở nơi khác. Hãy tải lại bản lưu trước khi tiếp tục; tiến trình chưa lưu trong phiên này có thể mất.'
      : session.issue === 'unavailable'
        ? 'Chưa lưu được tiến trình. Bạn vẫn có thể chơi trong phiên này; tải lại hoặc đóng trình duyệt có thể mất các bước chưa lưu.'
        : null;

  return <section className="mx-auto max-w-3xl space-y-5 pb-8">
    <nav aria-label="Điều hướng trải nghiệm" className="flex flex-wrap items-center gap-x-5 gap-y-2">
    <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-clay-700 hover:text-amber-700 focus-visible:outline-2 focus-visible:outline-amber-400">
      <ArrowLeft className="h-4 w-4" /> Về bản đồ
    </Link>
    <Link to="/experiences" className="inline-flex min-h-11 items-center text-sm text-amber-700 hover:text-amber-800">Chọn tỉnh trải nghiệm</Link>
    </nav>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="inline-flex items-center gap-2 uppercase tracking-widest text-amber-700"><MapPin className="h-4 w-4" /> {story.provinceName} · Trải nghiệm kể chuyện</span>
      <span className="rounded-full border border-amber-500/30 px-3 py-1 text-amber-800">Bản MVP · hội thoại hư cấu</span>
    </div>
    <h1 ref={heading} tabIndex={-1} className="scroll-mt-24 text-3xl font-bold tracking-tight text-clay-900 outline-none sm:text-4xl">{title}</h1>
    {story.cast ? <>
      <p className="text-sm text-clay-700"><strong className="text-amber-700">{story.cast.guide} · vai của bạn</strong><span className="mx-3 text-clay-400">/</span><strong className="text-sky-700">{story.cast.visitor} · bạn đồng hành</strong></p>
      <ol aria-label="Các chặng trong ngày" className="grid grid-cols-3 gap-2 text-xs">
        {[story.provinceSlug === 'ha-noi' ? 'Hồ Gươm' : 'Buổi sáng', 'Bữa trưa', 'Buổi chiều'].map((label, index) => {
          const current = journal ? 3 : !playing || game?.sceneId === 'morning' ? 0 : game?.sceneId === 'lunch' ? 1 : 2;
          return <li key={label} aria-current={current === index ? 'step' : undefined} className={'rounded-xl border px-3 py-2 ' + (current === index ? 'border-amber-400/60 bg-amber-400/10 text-amber-800' : current > index ? 'border-clay-400 text-clay-700' : 'border-clay-200 text-clay-500')}>{index + 1}. {label}</li>;
        })}
      </ol>
      <p className="text-xs leading-6 text-clay-600">{story.cast.guide} và {story.cast.visitor} là nhân vật hư cấu. Ghi chú văn hóa và ảnh có nguồn riêng; đây là một ngày của hai người, không đại diện cho mọi cư dân {story.provinceName}.</p>
    </> : <p className="text-sm leading-6 text-clay-600">Nhân vật, hội thoại và không gian trải nghiệm hư cấu. Ghi chú văn hóa có nguồn đối chiếu; ảnh có credit riêng. Một hành trình không đại diện cho tất cả người ở {story.provinceName}.</p>}

    {issueText ? <div role="alert" className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-6 text-amber-900 clay-soft">
      <p>{issueText}</p>
      <div className="flex flex-wrap gap-2">
        {session.issue === 'unavailable' && game ? <ActionButton className="border border-amber-500/40" onClick={retry}>Thử lưu lại</ActionButton> : null}
        <ActionButton className="border border-amber-500/40" onClick={() => setDialog('reload')}>Tải lại bản lưu</ActionButton>
      </div>
    </div> : <p role="status" className="text-xs text-clay-600">{game ? 'Tiến trình đã được lưu trên thiết bị này.' : 'Không cần đăng nhập · một lượt chơi trên thiết bị này.'}</p>}

    {other ? <aside className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 clay-soft"><p>Lượt hiện tại ở {other.provinceName}. Xem giới thiệu tỉnh khác không thay lượt. Bắt đầu tại {story.provinceName} sẽ cần xác nhận thay lượt và nhật ký hiện tại.</p><Link to={"/experiences/" + other.provinceSlug + "?view=play"} className="inline-flex min-h-12 items-center font-semibold underline">Về lượt hiện tại ở {other.provinceName}</Link></aside> : null}
    <div className="space-y-6 rounded-3xl border border-clay-200 bg-clay-100/70 p-4  sm:p-7 clay-soft">
      {!playing ? <>
        <ExperienceVisual selectedMorningChoiceId={game?.choices.find(choice => choice.sceneId === 'morning')?.choiceId} theme="intro" assetId={story.introImageRef} />
        <Narrative guideName={story.cast?.guide} blocks={story.intro} />
        <p className="text-sm text-clay-600">{story.provinceSlug === 'ha-noi' ? 'Sáng ở Hồ Gươm' : 'Buổi sáng ở ' + story.provinceName} → bữa trưa → một hoạt động buổi chiều → nhật ký. Không điểm số, không thắng thua.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {!game || game.phase === 'intro'
            ? <ActionButton disabled={blocked} className="bg-amber-400 text-clay-900 hover:bg-amber-300" onClick={() => { if (other) setDialog('switch'); else { begin(story.id); showPlay(); } }}>Bắt đầu</ActionButton>
            : <ActionButton disabled={blocked} className="bg-amber-400 text-clay-900 hover:bg-amber-300" onClick={showPlay}>{game.phase === 'completed' ? 'Xem nhật ký' : 'Tiếp tục'}</ActionButton>}
          {game || session.issue === 'invalid' ? <ActionButton className="border border-clay-400" onClick={() => setDialog('restart')}>Chơi lại</ActionButton> : null}
        </div>
      </> : journal ? <>
        <p className="inline-flex items-center gap-2 text-amber-700"><BookOpen className="h-5 w-5" /> Hành trình của riêng bạn</p>
        <ol className="space-y-6">{journal.entries.map((entry, index) => <li key={entry.choiceId} className="space-y-3">
          <h2 className="text-lg font-semibold">{index + 1}. {entry.label}</h2>
          <ExperienceVisual selectedMorningChoiceId={game?.choices.find(choice => choice.sceneId === 'morning')?.choiceId} theme={entry.sceneId} motif={entry.choiceId} assetId={entry.result.imageRef} />
          <Narrative guideName={story.cast?.guide} blocks={entry.result.blocks} />
        </li>)}</ol>
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 leading-7 clay-soft"><p>{journal.ending.text}</p></div>
        <section className="space-y-3 border-t border-clay-300 pt-5">
          <h2 className="text-lg font-semibold">Ghi chú văn hóa và nguồn</h2>
          <p className="text-sm text-amber-800">Chỉ gồm những ghi chú thuộc hành trình bạn đã chơi. Truyền thuyết được phân biệt với dữ kiện và khuyến nghị ứng xử.</p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-clay-700">{journal.knowledge.map(note => <li key={note.id}><strong>{note.category === 'legend' ? 'Truyền thuyết' : note.category === 'practice' ? 'Ứng xử' : 'Dữ kiện'}: </strong>{note.text}</li>)}</ul>
          <CulturalReferences sourceIds={journal.sourceRefs} /><p className="text-sm text-clay-600">Nguồn ảnh nằm dưới từng hình minh họa. Không có giá, giờ mở cửa hay cam kết dịch vụ trong trải nghiệm này.</p>
        </section>
        <div className="flex flex-wrap gap-3">
          <ActionButton className="inline-flex items-center gap-2 border border-clay-400" onClick={() => setDialog('restart')}><RotateCcw className="h-4 w-4" /> Chơi lại</ActionButton>
          <Link to="/" className={actionClass + ' bg-amber-400 text-clay-900'}>Về bản đồ</Link>
        </div>
      </> : scene ? <>
        <div className="flex items-center justify-between gap-3 text-sm text-clay-600">
          <span>{game?.sceneId === 'morning' ? 'Buổi sáng' : game?.sceneId === 'lunch' ? 'Buổi trưa' : 'Buổi chiều'}</span>
          <span>{result ? 'Kết quả lựa chọn · đọc rồi tiếp tục' : 'Chọn một phương án'}</span>
        </div>
        <ExperienceVisual selectedMorningChoiceId={game?.choices.find(choice => choice.sceneId === 'morning')?.choiceId} theme={game?.sceneId ?? 'intro'} motif={game?.phase === 'result' ? game.choiceId : undefined} assetId={result?.imageRef ?? scene.imageRef} />
        <Narrative guideName={story.cast?.guide} blocks={result?.blocks ?? scene.blocks.map(block => game ? renderNarrative(story, game, block) : block)} />
        {result ? <CulturalReferences sourceIds={story.knowledge.filter(note => result.knowledgeIds.includes(note.id)).flatMap(note => note.sourceIds)} /> : null}
        {result ? <ActionButton disabled={blocked} className="w-full bg-amber-400 text-clay-900 hover:bg-amber-300" onClick={() => send('continue')}>{result.continueLabel ?? (scene.choices.every(choice => choice.nextSceneId === 'journal') ? 'Tiếp tục đến nhật ký' : 'Tiếp tục')}</ActionButton>
          : <div className="grid gap-3">{scene.choices.map(choice => <ActionButton key={choice.id} disabled={blocked} className="border border-clay-400 bg-clay-200 text-left text-clay-900 hover:border-amber-400 hover:bg-clay-200/70" onClick={() => send('choose', choice.id)}>{choice.label}</ActionButton>)}</div>}
        <p className="text-xs leading-5 text-clay-500">Lựa chọn đã chốt không đổi trong lượt này. Muốn thử nhánh khác, hãy chơi lại sau hành trình.</p>
      </> : null}
    </div>
    {playing && game ? <><ActionButton className="w-full border border-amber-500/40 bg-amber-500/10 text-amber-800" onClick={() => setAssistantOpen(true)}>Hỏi thêm về cảnh này</ActionButton><GameAssistantPanel key={game.runId} scenario={story} game={game} open={assistantOpen} onClose={() => setAssistantOpen(false)} /></> : null}
    {dialog ? <ConfirmDialog
      title={dialog === 'switch' ? 'Chuyển sang ' + story.provinceName + '?' : dialog === 'restart' ? 'Chơi lại từ đầu?' : 'Tải lại tiến trình đã lưu?'}
      confirmLabel={dialog === 'switch' ? 'Xác nhận thay lượt' : dialog === 'restart' ? 'Xác nhận chơi lại' : 'Xác nhận tải lại'}
      onClose={() => setDialog(null)}
      onConfirm={() => {
        if (dialog === 'switch') { if (restart(story.id)) { begin(story.id); showPlay(); } }
        else if (dialog === 'restart') { if (restart(story.id)) setParams({}); }
        else reload();
        setDialog(null);
      }}>
      {dialog === 'switch' ? 'Lượt chơi và nhật ký ở tỉnh hiện tại sẽ được thay bằng lượt mới tại ' + story.provinceName + '. Dữ liệu tài khoản và chat không bị thay đổi.' : dialog === 'restart' ? 'Lượt chơi và nhật ký hiện tại sẽ được thay bằng một lượt mới. Dữ liệu tài khoản và chat không bị thay đổi.'
        : 'Các bước chỉ đang giữ trong phiên này có thể bị mất. Ứng dụng sẽ đọc lại bản lưu trên thiết bị.'}
    </ConfirmDialog> : null}
  </section>;
}
