import { useEffect, useRef, useState } from 'react';
import { SourceCitationList } from '../../../components/Chat/SourceCitationList';
import { hanoiScenario } from '../content/hanoi';
import { createSceneAssistant } from '../assistant/assistant';
import type { SceneCitation } from '../assistant/assistant';
import { createBrowserAssistantTransport } from '../assistant/browserTransport';
import type { GameState } from '../state';
import { ActionButton, actionClass } from './StoryCard';

interface Message { id: number; question: string; content: string; citations: SceneCitation[]; error: boolean; }
export function GameAssistantPanel({ game, open, onClose }: { game: GameState; open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
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
    const reply = await client.ask(hanoiScenario, game, text);
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
    className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-5 text-slate-100 backdrop:bg-black/70 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <h2 id="scene-assistant-title" className="text-xl font-bold">Hỏi thêm về cảnh này</h2>
      <ActionButton onClick={close} className="shrink-0 border border-slate-600">Đóng AI</ActionButton>
    </div>
    <p className="my-3 text-sm leading-6 text-slate-400">Hà Nội · {game.phase === 'completed' ? 'Nhật ký' : game.phase === 'intro' ? 'Mở đầu' : hanoiScenario.scenes[game.sceneId].title}. AI chỉ giải thích, không chọn hoặc chuyển cảnh. Hội thoại riêng của lượt chơi, không lưu sau khi tải lại trang.</p>
    <p className="text-xs text-amber-200">Câu trả lời AI có thể sai. Đối chiếu nguồn; đóng cửa sổ bất cứ lúc nào để chơi tiếp.</p>
    <div aria-live="polite" aria-busy={busy} className="my-5 space-y-4">
      {messages.map(message => <article key={message.id} className="space-y-3 rounded-xl border border-slate-700 p-4 text-sm leading-6">
        <p className="font-semibold text-amber-200">Bạn: {message.question}</p>
        <p className={'whitespace-pre-wrap break-words ' + (message.error ? 'text-red-200' : 'text-slate-200')}>{message.content}</p>
        <SourceCitationList citations={message.citations} messageId={'game-' + message.id} />
      </article>)}
      {busy ? <p role="status" className="text-sm text-slate-300">AI đang giải thích… Bạn vẫn có thể đóng để chơi tiếp.</p> : null}
    </div>
    <form onSubmit={event => { event.preventDefault(); void ask(); }} className="space-y-3">
      <label htmlFor="scene-question" className="block text-sm font-semibold">Câu hỏi của bạn</label>
      <textarea id="scene-question" value={question} maxLength={500} rows={3} disabled={busy}
        onChange={event => setQuestion(event.target.value)} required
        className="w-full resize-y rounded-xl border border-slate-600 bg-slate-900 p-3 text-base focus-visible:outline-2 focus-visible:outline-amber-400" />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400">{question.length}/500</span>
        <button type="submit" disabled={busy || !question.trim()} className={actionClass + ' bg-amber-400 text-slate-950'}>Gửi câu hỏi</button>
      </div>
    </form>
  </dialog>;
}
