import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SourceCitationList } from '../../../components/Chat/SourceCitationList';
import { useAuthStore } from '../../../stores/authStore';
import type { Scenario } from '../scenario';
import { createSceneAssistant } from '../assistant/assistant';
import type { SceneCitation } from '../assistant/assistant';
import { createBrowserAssistantTransport } from '../assistant/browserTransport';
import type { GameState } from '../state';
import { getScenePrompts } from '../immersion';
import { ActionButton, actionClass } from './StoryCard';

interface Props { scenario: Scenario; game: GameState; open: boolean; onClose: () => void; }
interface Message { id: number; question: string; content: string; citations: SceneCitation[]; error: boolean; }

export function GameAssistantPanel(props: Props) {
  const account = useAuthStore(state => state.user?.username ?? null);
  // A different account owns a fresh client and transcript. Unmount cancels the old request.
  return <SceneAssistantDialog key={account ?? 'guest'} {...props} account={account} />;
}

function SceneAssistantDialog({ scenario, game, open, onClose, account }: Props & { account: string | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const [client] = useState(() => createSceneAssistant(createBrowserAssistantTransport()));
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  const request = useRef({ sequence: 0 });

  useEffect(() => {
    const lifecycle = request.current;
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
    return () => { lifecycle.sequence++; client.cancel(); };
  }, [open, client]);

  useEffect(() => {
    const element = transcript.current;
    if (open && element) element.scrollTo({ top: element.scrollHeight, behavior: 'instant' });
  }, [messages, busy, open]);

  const close = () => { request.current.sequence++; client.cancel(); setBusy(false); onClose(); };
  const ask = async () => {
    const text = question.trim();
    // Check the live owner too: logout can happen before React commits the next render.
    if (!account || useAuthStore.getState().user?.username !== account || !text || busy) return;
    setBusy(true);
    const id = ++request.current.sequence;
    const reply = await client.ask(scenario, game, text);
    if (id !== request.current.sequence || useAuthStore.getState().user?.username !== account) return;
    if (reply.status === 'answered' || reply.status === 'error') {
      setMessages(previous => [...previous, {
        id: ++sequence.current, question: text, content: reply.status === 'answered' ? reply.content : reply.message,
        citations: reply.status === 'answered' ? reply.citations : [], error: reply.status === 'error',
      }]);
      setQuestion('');
      setBusy(false);
    } else if (reply.status !== 'busy') setBusy(false);
  };

  return <dialog ref={dialog} aria-labelledby="scene-assistant-title" onCancel={event => { event.preventDefault(); close(); }}
    className="m-auto h-[min(90dvh,48rem)] max-h-[90dvh] w-[calc(100%-1rem)] max-w-xl overflow-hidden rounded-2xl border border-clay-300 bg-clay-50 text-clay-900 backdrop:bg-black/70 open:flex open:flex-col sm:w-[calc(100%-2rem)] clay-soft">
    <header className="shrink-0 border-b border-clay-300 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h2 id="scene-assistant-title" className="text-lg font-bold sm:text-xl">Hỏi thêm về cảnh này</h2><p className="mt-2 text-xs leading-5 text-clay-600">{scenario.provinceName} · {game.phase === 'completed' ? 'Nhật ký' : game.phase === 'intro' ? 'Mở đầu' : scenario.scenes[game.sceneId]?.title}</p></div>
        <ActionButton onClick={close} className="shrink-0 border border-clay-400">Đóng AI</ActionButton>
      </div>
      <p className="mt-3 text-xs leading-5 text-amber-800">AI có thể sai; hãy đối chiếu nguồn. Đóng cửa sổ bất cứ lúc nào để chơi tiếp.</p>
    </header>
    <div ref={transcript} aria-live="polite" aria-busy={busy} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
      {messages.length === 0 ? <div className="space-y-3">
        <p className="text-sm leading-6 text-clay-700">AI chỉ giải thích, không chọn hoặc chuyển cảnh. Hội thoại riêng của lượt chơi không được giữ sau khi tải lại trang hoặc đổi tài khoản.</p>
        {account ? <div className="grid gap-2">{getScenePrompts(scenario, game).map(prompt => <ActionButton key={prompt} disabled={busy} className="border border-clay-300 bg-clay-100 text-left text-xs font-normal leading-6 text-sky-800 hover:border-sky-600" onClick={() => setQuestion(prompt)}>{prompt}</ActionButton>)}</div> : null}
      </div> : null}
      {messages.map(message => <article key={message.id} className="space-y-3 rounded-xl border border-clay-300 p-4 text-sm leading-6">
        <p className="font-semibold text-amber-800">Bạn: {message.question}</p>
        <p className={'whitespace-pre-wrap break-words ' + (message.error ? 'text-red-800' : 'text-clay-800')}>{message.content}</p>
        <SourceCitationList citations={message.citations} messageId={'game-' + message.id} />
      </article>)}
      {busy ? <p role="status" className="text-sm leading-6 text-clay-700 motion-safe:animate-pulse">AI đang giải thích… Bạn vẫn có thể đóng để chơi tiếp.</p> : null}
    </div>
    {account ? <form onSubmit={event => { event.preventDefault(); void ask(); }} className="shrink-0 space-y-2 border-t border-clay-300 bg-clay-50 p-4 sm:p-5">
      <label htmlFor="scene-question" className="block text-sm font-semibold">Câu hỏi của bạn</label>
      <textarea id="scene-question" value={question} maxLength={500} rows={2} disabled={busy}
        onChange={event => setQuestion(event.target.value)} required
        className="w-full resize-none rounded-xl border border-clay-400 bg-clay-100 p-3 text-base focus-visible:outline-2 focus-visible:outline-amber-600" />
      <div className="flex items-center justify-between gap-3"><span className="text-xs text-clay-600">{question.length}/500</span><button type="submit" disabled={busy || !question.trim()} className={actionClass + ' bg-amber-400 text-clay-900'}>Gửi câu hỏi</button></div>
    </form> : <div className="shrink-0 space-y-3 border-t border-clay-300 bg-clay-pink/30 p-4 text-sm leading-6 sm:p-5">
      <p className="font-semibold">Đăng nhập để hỏi Trợ lý AI</p>
      <p className="text-clay-700">Bạn vẫn chơi được bình thường. Hỏi đáp với AI chỉ dành cho tài khoản đã đăng nhập.</p>
      <Link to="/login" onClick={close} className={actionClass + ' inline-flex items-center bg-amber-400 text-clay-900'}>Đăng nhập</Link>
    </div>}
  </dialog>;
}
