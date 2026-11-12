import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, MapPin, RotateCcw } from 'lucide-react';
import { hanoiScenario as story } from '../features/mini-game/content/hanoi';
import { useMiniGame } from '../features/mini-game/MiniGameContext';
import { getCurrentResult } from '../features/mini-game/engine';
import { buildJournal } from '../features/mini-game/journal';
import { ActionButton, actionClass, ConfirmDialog, Narrative, StoryVisual } from '../features/mini-game/components/StoryCard';
import type { GameEvent } from '../features/mini-game/state';
import { CulturalReferences } from '../features/mini-game/components/CulturalReferences';
import { GameAssistantPanel } from '../features/mini-game/components/GameAssistantPanel';

export default function HanoiExperiencePage() {
  const { session, begin, dispatch, restart, reload, retry } = useMiniGame();
  const [params, setParams] = useSearchParams();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [dialog, setDialog] = useState<'restart' | 'reload' | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const game = session.game;
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
    <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-300 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-amber-400">
      <ArrowLeft className="h-4 w-4" /> Về bản đồ
    </Link>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="inline-flex items-center gap-2 uppercase tracking-widest text-amber-300"><MapPin className="h-4 w-4" /> Hà Nội · Trải nghiệm kể chuyện</span>
      <span className="rounded-full border border-amber-500/30 px-3 py-1 text-amber-200">Bản MVP · hội thoại hư cấu</span>
    </div>
    <h1 ref={heading} tabIndex={-1} className="scroll-mt-24 text-3xl font-bold tracking-tight text-white outline-none sm:text-4xl">{title}</h1>
    <p className="text-sm leading-6 text-slate-400">Nhân vật, hội thoại và không gian trải nghiệm hư cấu. Ghi chú văn hóa có nguồn đối chiếu; ảnh có credit riêng. Một hành trình không đại diện cho tất cả người Hà Nội.</p>

    {issueText ? <div role="alert" className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
      <p>{issueText}</p>
      <div className="flex flex-wrap gap-2">
        {session.issue === 'unavailable' && game ? <ActionButton className="border border-amber-500/40" onClick={retry}>Thử lưu lại</ActionButton> : null}
        <ActionButton className="border border-amber-500/40" onClick={() => setDialog('reload')}>Tải lại bản lưu</ActionButton>
      </div>
    </div> : <p role="status" className="text-xs text-slate-400">{game ? 'Tiến trình đã được lưu trên thiết bị này.' : 'Không cần đăng nhập · một lượt chơi trên thiết bị này.'}</p>}

    <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl sm:p-7">
      {!playing ? <>
        <StoryVisual theme="intro" assetId={story.introImageRef} />
        <Narrative blocks={story.intro} />
        <p className="text-sm text-slate-400">Sáng ở Hồ Gươm → bữa trưa → một hoạt động buổi chiều → nhật ký. Không điểm số, không thắng thua.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {!game || game.phase === 'intro'
            ? <ActionButton disabled={blocked} className="bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={() => { begin(); showPlay(); }}>Bắt đầu</ActionButton>
            : <ActionButton disabled={blocked} className="bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={showPlay}>{game.phase === 'completed' ? 'Xem nhật ký' : 'Tiếp tục'}</ActionButton>}
          {game || session.issue === 'invalid' ? <ActionButton className="border border-slate-600" onClick={() => setDialog('restart')}>Chơi lại</ActionButton> : null}
        </div>
      </> : journal ? <>
        <p className="inline-flex items-center gap-2 text-amber-300"><BookOpen className="h-5 w-5" /> Hành trình của riêng bạn</p>
        <ol className="space-y-6">{journal.entries.map((entry, index) => <li key={entry.choiceId} className="space-y-3">
          <h2 className="text-lg font-semibold">{index + 1}. {entry.label}</h2>
          <StoryVisual theme={entry.sceneId} motif={entry.choiceId} assetId={entry.result.imageRef} />
          <Narrative blocks={entry.result.blocks} />
        </li>)}</ol>
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 leading-7"><p>{journal.ending.text}</p></div>
        <section className="space-y-3 border-t border-slate-700 pt-5">
          <h2 className="text-lg font-semibold">Ghi chú văn hóa và nguồn</h2>
          <p className="text-sm text-amber-200">Chỉ gồm những ghi chú thuộc hành trình bạn đã chơi. Truyền thuyết được phân biệt với dữ kiện và khuyến nghị ứng xử.</p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300">{journal.knowledge.map(note => <li key={note.id}><strong>{note.category === 'legend' ? 'Truyền thuyết' : note.category === 'practice' ? 'Ứng xử' : 'Dữ kiện'}: </strong>{note.text}</li>)}</ul>
          <CulturalReferences sourceIds={journal.sourceRefs} /><p className="text-sm text-slate-400">Nguồn ảnh nằm dưới từng hình minh họa. Không có giá, giờ mở cửa hay cam kết dịch vụ trong trải nghiệm này.</p>
        </section>
        <div className="flex flex-wrap gap-3">
          <ActionButton className="inline-flex items-center gap-2 border border-slate-600" onClick={() => setDialog('restart')}><RotateCcw className="h-4 w-4" /> Chơi lại</ActionButton>
          <Link to="/" className={actionClass + ' bg-amber-400 text-slate-950'}>Về bản đồ</Link>
        </div>
      </> : scene ? <>
        <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
          <span>{game?.sceneId === 'morning' ? 'Buổi sáng' : game?.sceneId === 'lunch' ? 'Buổi trưa' : 'Buổi chiều'}</span>
          <span>{result ? 'Kết quả lựa chọn · đọc rồi tiếp tục' : 'Chọn một phương án'}</span>
        </div>
        <StoryVisual theme={game?.sceneId ?? 'intro'} motif={game?.phase === 'result' ? game.choiceId : undefined} assetId={result?.imageRef ?? scene.imageRef} />
        <Narrative blocks={result?.blocks ?? scene.blocks} />
        {result ? <CulturalReferences sourceIds={story.knowledge.filter(note => result.knowledgeIds.includes(note.id)).flatMap(note => note.sourceIds)} /> : null}
        {result ? <ActionButton disabled={blocked} className="w-full bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={() => send('continue')}>{result.continueLabel ?? (scene.id === 'pottery' || scene.id === 'cafe' ? 'Tiếp tục đến nhật ký' : 'Tiếp tục')}</ActionButton>
          : <div className="grid gap-3">{scene.choices.map(choice => <ActionButton key={choice.id} disabled={blocked} className="border border-slate-600 bg-slate-800 text-left text-slate-100 hover:border-amber-400 hover:bg-slate-800/70" onClick={() => send('choose', choice.id)}>{choice.label}</ActionButton>)}</div>}
        <p className="text-xs leading-5 text-slate-500">Lựa chọn đã chốt không đổi trong lượt này. Muốn thử nhánh khác, hãy chơi lại sau hành trình.</p>
      </> : null}
    </div>
    {playing && game ? <><ActionButton className="w-full border border-amber-500/40 bg-amber-500/10 text-amber-200" onClick={() => setAssistantOpen(true)}>Hỏi thêm về cảnh này</ActionButton><GameAssistantPanel key={game.runId} game={game} open={assistantOpen} onClose={() => setAssistantOpen(false)} /></> : null}
    {dialog ? <ConfirmDialog
      title={dialog === 'restart' ? 'Chơi lại từ đầu?' : 'Tải lại tiến trình đã lưu?'}
      confirmLabel={dialog === 'restart' ? 'Xác nhận chơi lại' : 'Xác nhận tải lại'}
      onClose={() => setDialog(null)}
      onConfirm={() => {
        if (dialog === 'restart') { if (restart()) setParams({}); }
        else reload();
        setDialog(null);
      }}>
      {dialog === 'restart' ? 'Lượt chơi và nhật ký hiện tại sẽ được thay bằng một lượt mới. Dữ liệu tài khoản và chat không bị thay đổi.'
        : 'Các bước chỉ đang giữ trong phiên này có thể bị mất. Ứng dụng sẽ đọc lại bản lưu trên thiết bị.'}
    </ConfirmDialog> : null}
  </section>;
}
