import { useEffect, useRef, useState } from 'react';
import { SourceCitationList } from '../../../components/Chat/SourceCitationList';
import type { Scenario } from '../scenario';
import { createSceneAssistant } from '../assistant/assistant';
import type { SceneCitation } from '../assistant/assistant';
import { createBrowserAssistantTransport } from '../assistant/browserTransport';
import type { GameState } from '../state';
import { ActionButton, actionClass } from './StoryCard';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';

interface Message { id: number; question: string; content: string; citations: SceneCitation[]; error: boolean; }
export function GameAssistantPanel({ scenario, game, open, onClose }: { scenario: Scenario; game: GameState; open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const user = useAuthStore(state => state.user);
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

  const close = () => { request.current.sequence++; client.cancel(); setBusy(false); onClose(); };
  const ask = async () => {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    const id = ++request.current.sequence;
    const reply = await client.ask(scenario, game, text);
    if (id !== request.current.sequence) return;
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
    className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-clay-300 bg-clay-50 p-5 text-clay-900 backdrop:bg-black/70 sm:p-6 clay-soft">
    <div className="flex items-start justify-between gap-3">
      <h2 id="scene-assistant-title" className="text-xl font-bold">Hỏi thêm về cảnh này</h2>
      <ActionButton onClick={close} className="shrink-0 border border-clay-400">Đóng AI</ActionButton>
    </div>
    <p className="my-3 text-sm leading-6 text-clay-600">{scenario.provinceName} · {game.phase === 'completed' ? 'Nhật ký' : game.phase === 'intro' ? 'Mở đầu' : scenario.scenes[game.sceneId]?.title}. AI chỉ giải thích, không chọn hoặc chuyển cảnh. Hội thoại riêng của lượt chơi, không lưu sau khi tải lại trang.</p>
    <p className="text-xs text-amber-800">Câu trả lời AI có thể sai. Đối chiếu nguồn; đóng cửa sổ bất cứ lúc nào để chơi tiếp.</p>
    <div aria-live="polite" aria-busy={busy} className="my-5 space-y-4">
      {messages.map(message => <article key={message.id} className="space-y-3 rounded-xl border border-clay-300 p-4 text-sm leading-6">
        <p className="font-semibold text-amber-800">Bạn: {message.question}</p>
        <p className={'whitespace-pre-wrap break-words ' + (message.error ? 'text-red-800' : 'text-clay-800')}>{message.content}</p>
        <SourceCitationList citations={message.citations} messageId={'game-' + message.id} />
      </article>)}
      {busy ? <p role="status" className="text-sm text-clay-700">AI đang giải thích… Bạn vẫn có thể đóng để chơi tiếp.</p> : null}
    </div>
    {!user ? <div className="space-y-3 rounded-xl border border-white/70 bg-clay-pink/60 p-4 text-sm leading-6 clay-soft">
      <p className="font-semibold text-clay-900">Đăng nhập để hỏi Trợ lý AI</p>
      <p className="text-clay-700">Bạn vẫn chơi được bình thường. Hỏi đáp với AI chỉ dành cho tài khoản đã đăng nhập.</p>
      <Link to="/login" onClick={close} className={actionClass + ' inline-flex bg-amber-400 text-clay-900'}>Đăng nhập</Link>
    </div> : <form onSubmit={event => { event.preventDefault(); void ask(); }} className="space-y-3">
      <label htmlFor="scene-question" className="block text-sm font-semibold">Câu hỏi của bạn</label>
      <textarea id="scene-question" value={question} maxLength={500} rows={3} disabled={busy}
        onChange={event => setQuestion(event.target.value)} required
        className="w-full resize-y rounded-xl border border-clay-400 bg-clay-100 p-3 text-base focus-visible:outline-2 focus-visible:outline-amber-400 clay-soft" />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-clay-600">{question.length}/500</span>
        <button type="submit" disabled={busy || !question.trim()} className={actionClass + ' bg-amber-400 text-clay-900'}>Gửi câu hỏi</button>
      </div>
    </form>}
  </dialog>;
}
