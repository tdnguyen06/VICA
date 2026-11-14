import { useId, useState } from 'react';
import type { Scenario } from '../scenario';
import type { GameState } from '../state';
import './creative-moment.css';

type ResultState = Extract<GameState, { phase: 'result' }>;
export function CreativeMoment({ scenario, game }: { scenario: Scenario; game: GameState }) {
  if (game.phase !== 'result' || (game.sceneId !== 'pottery' && game.sceneId !== 'creative')) return null;
  return <CreativeIllustration key={`${scenario.id}:${game.runId}:${game.choiceId}`} scenario={scenario} game={game} />;
}
function CreativeIllustration({ scenario, game }: { scenario: Scenario; game: ResultState }) {
  const [iteration, setIteration] = useState(0);
  const illustrationId = useId();
  const revealed = iteration > 0;
  const pottery = game.sceneId === 'pottery';
  const leaves = game.choiceId === 'pottery-leaves';
  const colour = game.choiceId.endsWith('-postcard-colour');
  const guide = scenario.cast?.guide ?? 'Bạn';
  const visitor = scenario.cast?.visitor ?? 'Người bạn đồng hành';
  const choice = scenario.scenes[game.sceneId]?.choices.find(option => option.id === game.choiceId);
  const morning = game.choices.find(record => record.sceneId === 'morning');
  const morningLabel = morning ? scenario.scenes.morning?.choices.find(option => option.id === morning.choiceId)?.label : undefined;
  const memory = morning ? scenario.recallByChoice?.[morning.choiceId] ?? morningLabel : undefined;
  const message = memory ? `Mình còn nhớ ${memory}. Hẹn một ngày khác cùng ${guide} nhé.` : `Một ngày ở ${scenario.provinceName}, được cùng ${guide} chọn từng điều nhỏ. Hẹn một ngày khác nhé.`;
  return <section aria-label={pottery ? 'Phác thảo chiếc cốc' : 'Lời nhắn trên bưu thiếp'} className="space-y-4 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4 sm:p-5">
    <div><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Một chút tự tay làm</p><h2 className="mt-2 text-lg font-semibold text-clay-900">{pottery ? 'Thử đặt nét vẽ lên chiếc cốc' : 'Giữ lại một lời nhắn'}</h2>{choice ? <p className="mt-1 text-sm text-clay-700">Lựa chọn đã chốt: {choice.label}</p> : null}</div>
    <div id={illustrationId} className="overflow-hidden rounded-xl border border-clay-300 bg-clay-50/70 p-4">
      {pottery ? <svg viewBox="0 0 320 210" role="img" aria-label={revealed ? leaves ? 'Phác thảo số chiếc cốc với họa tiết cây lá đã chọn' : 'Phác thảo số chiếc cốc với họa tiết hình học đã chọn' : 'Phác thảo chiếc cốc trơn đang chờ đặt họa tiết đã chọn'} className="mx-auto w-full max-w-xs">
        <ellipse cx="154" cy="187" rx="88" ry="10" fill="#020617" />
        <path d="M94 44 H214 L202 164 Q154 190 106 164 Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="3" />
        <path d="M214 66 C266 56 264 132 207 134" fill="none" stroke="#cbd5e1" strokeWidth="11" />
        <ellipse cx="154" cy="44" rx="60" ry="9" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
        {revealed ? <g key={iteration} className="creative-moment-motif" fill="none" stroke={leaves ? '#047857' : '#b45309'} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          {leaves ? <><path d="M153 161 V76" /><path d="M153 116 C124 115 119 91 128 85 C148 86 155 98 153 116" /><path d="M153 142 C181 139 189 113 180 105 C162 109 152 122 153 142" /><path d="M153 145 C133 144 125 132 127 121" /></> : <><path d="M119 84 L137 107 L119 130 L137 153" /><path d="M155 84 L173 107 L155 130 L173 153" /><path d="M114 73 H190 M119 165 H185" /></>}
        </g> : null}
      </svg> : <div className="mx-auto max-w-sm rounded-lg border border-amber-200 bg-amber-50 p-5 text-clay-800 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">{scenario.provinceName}</p><p className="mt-2 text-lg font-semibold">Một ngày của {guide} và {visitor}</p>
        {colour ? <div aria-label="Các dải màu minh họa cho hướng bưu thiếp đã chọn" className="my-4 flex h-8 gap-1">{['#164e63', '#b45309', '#fbbf24', '#64748b'].map(value => <span key={value} className="flex-1 rounded" style={{backgroundColor:value}} />)}</div> : <div className="my-4 rounded-lg border border-amber-200 bg-white/60 p-3 text-sm leading-6">{morningLabel ?? 'Kỷ niệm trong hành trình'}</div>}
        <div aria-live="polite" className="min-h-24 text-sm leading-7">{revealed ? <div key={iteration} className="creative-moment-message"><p>{message}</p><p className="mt-3 text-right font-semibold">— {visitor}</p></div> : <p className="text-clay-600">Một khoảng giấy dành cho lời nhắn của hai người.</p>}</div>
      </div>}
    </div>
    <button type="button" aria-controls={illustrationId} onClick={() => setIteration(previous => previous + 1)} className="min-h-12 w-full rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-400/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400 motion-reduce:transition-none">{pottery ? 'Đặt họa tiết lên cốc' : 'Viết lời nhắn lên bưu thiếp'}</button>
    <p role="status" className="text-xs leading-6 text-clay-600">{revealed ? 'Có thể chạm lại để xem minh họa. Lựa chọn và tiến trình không thay đổi.' : 'Thao tác minh họa tùy chọn; bạn vẫn có thể tiếp tục hành trình.'}</p>
    <p className="text-xs leading-6 text-clay-600">{pottery ? 'Đây là phác thảo số, không phải ảnh sản phẩm nhân vật đã làm. Không xác nhận cốc đã nung hay được nhận ngay; họa tiết không được gán ý nghĩa văn hóa truyền thống.' : 'Đây là bố cục và lời nhắn hư cấu trong game, không phải ảnh bưu thiếp nhân vật đã làm. Nội dung chỉ gợi lại chặng sáng thực sự đã chọn.'}</p>
  </section>;
}
