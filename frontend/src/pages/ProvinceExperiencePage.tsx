import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { scenarioById, scenarioByProvince } from '../features/mini-game/scenarios';
import type { Scenario } from '../features/mini-game/scenario';
import { useMiniGame } from '../features/mini-game/MiniGameContext';
import { ActionButton, actionClass, ConfirmDialog } from '../features/mini-game/components/StoryCard';
import { ChatGameView } from '../features/mini-game/components/ChatGameView';

export default function ProvinceExperiencePage() {
  const { provinceSlug = '' } = useParams();
  const story = scenarioByProvince(provinceSlug);
  if (!story) {
    return (
      <section className="mx-auto max-w-4xl space-y-5">
        <h1 className="text-3xl font-bold">Địa phương đang được cập nhật</h1>
        <p className="leading-7 text-slate-300">
          Kịch bản trải nghiệm cho tỉnh thành này đang được hoàn thiện. Mời bạn chọn một trong các địa phương đã sẵn sàng.
        </p>
        <Link to="/experiences" className={actionClass + ' inline-flex items-center bg-amber-400 text-slate-950'}>
          Chọn tỉnh trải nghiệm
        </Link>
      </section>
    );
  }
  return <ExperienceStory key={story.id} story={story} />;
}

function ExperienceStory({ story }: { story: Scenario }) {
  const { session, begin, dispatch, restart, reload, retry } = useMiniGame();
  const [dialog, setDialog] = useState<'restart' | 'reload' | 'switch' | null>(null);

  const game = session.game?.scenarioId === story.id ? session.game : null;
  const other = session.game && !game ? scenarioById(session.game.scenarioId) : undefined;
  const blocked = session.issue === 'invalid' || session.issue === 'conflict';

  // Automatically start adventure if no game session exists yet
  useEffect(() => {
    if (!session.game && session.issue === null) {
      begin(story.id);
    }
  }, [story.id, session.game, session.issue, begin]);

  const issueText =
    session.issue === 'invalid'
      ? 'Bản lưu trước đó chưa tương thích với phiên bản mới. Bạn có thể chọn Bắt đầu lại để tiếp tục.'
      : session.issue === 'conflict'
        ? 'Dữ liệu hành trình đã được cập nhật ở một tab khác. Hãy tải lại để đồng bộ tiến trình mới nhất.'
        : session.issue === 'unavailable'
          ? 'Bộ nhớ trình duyệt tạm thời không ghi được. Bạn vẫn có thể tiếp tục chơi bình thường trong phiên này.'
          : null;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-3 pb-4">
      <nav aria-label="Điều hướng trải nghiệm" className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <Link
          to="/experiences"
          className="inline-flex items-center gap-1.5 text-slate-300 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Danh mục trải nghiệm
        </Link>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 uppercase tracking-wider text-amber-300">
            <MapPin className="h-3.5 w-3.5" /> {story.provinceName}
          </span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-amber-200">
            Khám phá cùng AI Bản địa
          </span>
        </div>
      </nav>

      {issueText && (
        <div role="alert" className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          <p>{issueText}</p>
          <div className="flex flex-wrap gap-2">
            {session.issue === 'unavailable' && (
              <ActionButton className="border border-amber-500/40" onClick={retry}>
                Thử lưu lại
              </ActionButton>
            )}
            <ActionButton className="border border-amber-500/40" onClick={() => setDialog('reload')}>
              Tải lại bản lưu
            </ActionButton>
          </div>
        </div>
      )}

      {other && (
        <aside className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p>
            Bạn đang có hành trình dở dang tại <strong>{other.provinceName}</strong>. Bắt đầu tại <strong>{story.provinceName}</strong> sẽ làm mới tiến trình này.
          </p>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              className="bg-amber-400 text-slate-950 hover:bg-amber-300"
              onClick={() => setDialog('switch')}
            >
              Chuyển sang khám phá {story.provinceName}
            </ActionButton>
            <Link
              to={'/experiences/' + other.provinceSlug}
              className="inline-flex min-h-12 items-center rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              Về lại {other.provinceName}
            </Link>
          </div>
        </aside>
      )}

      {game ? (
        <ChatGameView
          story={story}
          game={game}
          dispatch={dispatch}
          onRestart={() => setDialog('restart')}
          blocked={blocked}
        />
      ) : !other ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/50 p-6 text-center text-slate-400">
          <div className="space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent mx-auto" />
            <p className="text-sm">Đang kết nối cùng người bạn bản địa tại {story.provinceName}...</p>
          </div>
        </div>
      ) : null}

      {dialog && (
        <ConfirmDialog
          title={dialog === 'switch' ? 'Chuyển sang ' + story.provinceName + '?' : dialog === 'restart' ? 'Bắt đầu lại chuyến đi?' : 'Tải lại tiến trình đã lưu?'}
          confirmLabel={dialog === 'switch' ? 'Xác nhận chuyển' : dialog === 'restart' ? 'Xác nhận chơi lại' : 'Xác nhận tải lại'}
          onClose={() => setDialog(null)}
          onConfirm={() => {
            if (dialog === 'switch') {
              if (restart(story.id)) {
                begin(story.id);
              }
            } else if (dialog === 'restart') {
              if (restart(story.id)) {
                begin(story.id);
              }
            } else {
              reload();
            }
            setDialog(null);
          }}
        >
          {dialog === 'switch'
            ? 'Hành trình tại ' + (other?.provinceName ?? 'tỉnh trước') + ' sẽ được thay thế bằng trải nghiệm mới tại ' + story.provinceName + '. Bạn có muốn tiếp tục?'
            : dialog === 'restart'
              ? 'Hành trình và các điểm dừng chân tại ' + story.provinceName + ' sẽ được khởi động lại từ đầu.'
              : 'Các bước chưa lưu trong phiên này có thể bị mất. Ứng dụng sẽ đọc lại bản lưu trên thiết bị.'}
        </ConfirmDialog>
      )}
    </section>
  );
}
