import type { ChoiceSceneId, NarrativeBlock, Scenario, ScenarioChoice } from './scenario.js';
import type { GameState } from './state.js';
export interface ChoicePresentation { readonly speech: string; readonly detail: string; }
export type CharacterMood = 'curious' | 'warm' | 'thoughtful';
function matches(scenario: Scenario, state: GameState) { return state.scenarioId === scenario.id && state.scenarioVersion === scenario.version; }
function selected(scenario: Scenario, state: GameState, sceneId: ChoiceSceneId) {
  const record = state.choices.find(choice => choice.sceneId === sceneId);
  return record ? scenario.scenes[sceneId]?.choices.find(choice => choice.id === record.choiceId) : undefined;
}
function memory(scenario: Scenario, state: GameState, sceneId: ChoiceSceneId) {
  const choice = selected(scenario, state, sceneId);
  return choice ? scenario.recallByChoice?.[choice.id] ?? choice.result.journalLabel ?? choice.label : null;
}
function fiction(text: string, speaker?: string): NarrativeBlock { return { text, speaker, kind: 'fiction', editorialStatus: 'authored' }; }

/** Presentation only: IDs, labels, routes and the saved choice remain unchanged. */
export function getChoicePresentation(scenario: Scenario, sceneId: ChoiceSceneId, choice: ScenarioChoice): ChoicePresentation {
  const first = (scenario.scenes[sceneId]?.choices.findIndex(candidate => candidate.id === choice.id) ?? -1) === 0;
  if (choice.id === 'morning-walk') return { speech: 'Đi một vòng hồ với mình nhé.', detail: 'Đi chậm lại, nhìn những điều đang diễn ra quanh mình.' };
  if (choice.id === 'morning-story') return { speech: 'Để mình kể bạn nghe chuyện tên hồ nhé.', detail: 'Cùng nghe chuyện kể và phân biệt với những dấu mốc có tư liệu.' };
  switch (sceneId) {
    case 'morning': return { speech: `Mình cùng khám phá ${choice.label} nhé.`, detail: first ? 'Dành buổi sáng cho một góc nhìn mới về nơi này.' : 'Đổi hướng một chút, biết đâu lại có chuyện để nhớ.' };
    case 'lunch': return { speech: `Trưa nay mình thử ${choice.label} nhé?`, detail: 'Nếm một chút trước, rồi tự điều chỉnh cho vừa khẩu vị.' };
    case 'afternoon':
      if (choice.nextSceneId === 'pottery') return { speech: 'Mình thử trang trí một chiếc cốc nhé.', detail: 'Bắt đầu từ chiếc cốc đã tạo hình sẵn, chọn một hướng họa tiết.' };
      if (choice.nextSceneId === 'creative') return { speech: 'Mình làm một tấm bưu thiếp để nhớ hôm nay nhé.', detail: 'Lấy cảm hứng từ chặng sáng hai người đã thực sự chọn.' };
      return { speech: choice.nextSceneId === 'cafe' ? 'Mình ghé cà phê, ngồi nghỉ một lát nhé.' : 'Mình dành một khoảng nghỉ cho hai đứa nhé.', detail: 'Chưa cần đi thêm đâu cả, cứ ở lại với khoảnh khắc này.' };
    case 'pottery': return { speech: first ? 'Mình thử những hình khối gọn gàng nhé.' : 'Mình chọn vài nét cây lá nhé.', detail: 'Một hướng trang trí để hình dung cùng nhau; không phải cốc đã nung xong.' };
    case 'creative': return { speech: first ? 'Mình giữ lại khung cảnh buổi sáng nhé.' : 'Mình kể buổi sáng bằng màu sắc nhé.', detail: 'Ý tưởng bưu thiếp lấy từ hoạt động sáng đã chọn.' };
    case 'cafe': case 'pause': return { speech: first ? 'Mình ngồi ngắm một lát, không cần vội nhé.' : 'Mình kể nhau nghe điều nhớ nhất hôm nay nhé.', detail: first ? 'Để câu chuyện có một khoảng lặng.' : 'Nhắc lại những chuyện hai người đã trải nghiệm.' };
  }
}
const morningAtmosphere: Readonly<Record<string, string>> = {
  'ha-noi': 'Trong câu chuyện, bạn đứng cạnh người bạn đồng hành bên hồ, để buổi sáng bắt đầu bằng một lời rủ.',
  'hai-phong': 'Hai người nhìn quanh thành phố, chờ bạn chọn điểm bắt đầu cho buổi sáng.',
  'quang-ninh': 'Người bạn đồng hành bước chậm lại, dành buổi sáng này để cùng bạn quan sát.',
  'ninh-binh': 'Hai người để lại một khoảng trống trong lịch trình, dành chỗ cho điều sắp khám phá.',
  'thua-thien-hue': 'Trong câu chuyện, người bạn đồng hành hạ giọng, chờ bạn bắt đầu một cuộc khám phá.',
  'da-nang': 'Bạn quay sang người bạn đồng hành; một lời rủ sẽ quyết định buổi sáng của hai người.',
  'quang-nam': 'Hai người đi cạnh nhau, để câu chuyện mở ra từ điều bạn muốn cùng khám phá.',
  'khanh-hoa': 'Người bạn đồng hành cất điện thoại một lát, chờ nghe bạn muốn bắt đầu từ đâu.',
  'lam-dong': 'Hai người dừng lại, để buổi sáng có thời gian cho một cuộc trò chuyện.',
  'ho-chi-minh': 'Giữa câu chuyện về thành phố, hai người dành riêng một ngày để khám phá cùng nhau.',
  'can-tho': 'Người bạn đồng hành nhìn sang bạn, để chuyến đi bắt đầu bằng một lựa chọn chung.',
};
/** Fictional scene-setting, not an additional cultural fact. */
export function getSceneAtmosphere(scenario: Scenario, state: GameState): string {
  if (!matches(scenario, state)) return '';
  const guide = scenario.cast?.guide ?? 'Bạn', visitor = scenario.cast?.visitor ?? 'người bạn đồng hành';
  if (state.phase === 'intro') return `Hôm nay, bạn nhập vai ${guide}, cùng ${visitor} dành một ngày ở ${scenario.provinceName}.`;
  if (state.phase === 'completed') return 'Một ngày đã khép lại. Những điều nằm trong nhật ký là những điều hai người đã thực sự chọn.';
  if (state.sceneId === 'morning') return morningAtmosphere[scenario.provinceSlug] ?? 'Hai người đứng cạnh nhau, chờ một lời rủ để bắt đầu buổi sáng.';
  const morning = memory(scenario, state, 'morning');
  if (state.sceneId === 'lunch') return morning ? `${visitor} vẫn nhắc ${morning}, khi hai người dừng lại để chọn bữa trưa.` : 'Hai người dừng câu chuyện một chút, dành thời gian ăn cùng nhau.';
  const lunch = memory(scenario, state, 'lunch');
  if (state.sceneId === 'afternoon') return lunch ? `Nhắc ${lunch}, ${visitor} mỉm cười: buổi chiều vẫn còn để hai người cùng chọn.` : 'Hai người để buổi chiều mở ra theo điều mình đang muốn làm.';
  if (state.sceneId === 'pottery' || state.sceneId === 'creative') return `${guide} kéo ghế lại gần ${visitor}; lần này, hai người cùng hình dung một dấu nhớ cho ngày hôm nay.`;
  return morning && lunch ? `${visitor} mở lại câu chuyện về ${morning}, rồi cả ${lunch}.` : 'Hai người ngồi lại, để những câu chuyện trong ngày có thời gian lắng xuống.';
}
export function getCharacterMood(block: NarrativeBlock): CharacterMood {
  if (/\?|nhỉ|vì sao|tại sao|thế nào|có gì/i.test(block.text)) return 'curious';
  if (/cười|cảm ơn|lần sau|hẹn|vui|thích|cùng nhau|nhớ/i.test(block.text)) return 'warm';
  return 'thoughtful';
}
export function getFarewell(scenario: Scenario, state: GameState): { title: string; blocks: readonly NarrativeBlock[] } | null {
  if (!matches(scenario, state) || state.phase !== 'result') return null;
  const choice = scenario.scenes[state.sceneId]?.choices.find(candidate => candidate.id === state.choiceId);
  if (!choice || choice.nextSceneId !== 'journal' || !state.choices.some(record => record.sceneId === state.sceneId && record.choiceId === choice.id)) return null;
  const guide = scenario.cast?.guide ?? 'Bạn', visitor = scenario.cast?.visitor ?? 'Người bạn';
  const remembrance = [memory(scenario, state, 'morning'), memory(scenario, state, 'lunch')].filter(Boolean).join(', rồi cả ');
  const finalLine = state.sceneId === 'pottery' ? 'Mình giữ lại ý tưởng trang trí này. Chiếc cốc trong câu chuyện còn những bước khác trước khi thành một món đồ mang về.' : state.sceneId === 'creative' ? 'Mình sẽ giữ ý tưởng bưu thiếp này cùng những chuyện hôm nay.' : /chat/.test(choice.id) ? 'Mình muốn ghi lại cuộc trò chuyện này trước khi quên mất những chi tiết nhỏ.' : 'Khoảng lặng cuối ngày cũng là một điều mình muốn nhớ.';
  return { title: 'Một lời hẹn trước khi về', blocks: [fiction(remembrance ? `Mình sẽ nhớ ${remembrance}.` : 'Mình muốn giữ lại những điều hai đứa vừa trải nghiệm.', visitor), fiction(finalLine, visitor), fiction('Mình ghi lại nhé. Lần sau gặp nhau, hai đứa lại chọn một ngày khác.', guide)] };
}
export function getScenePrompts(scenario: Scenario, state: GameState): readonly string[] {
  if (!matches(scenario, state) || state.phase === 'intro') return [];
  if (state.phase === 'completed') return ['Mình nên đối chiếu những thông tin văn hóa trong nhật ký bằng cách nào?', 'Làm thế nào để kể lại trải nghiệm này mà không coi nó đại diện cho mọi người địa phương?'];
  const choice = state.phase === 'result' ? scenario.scenes[state.sceneId]?.choices.find(candidate => candidate.id === state.choiceId) : undefined;
  if (state.sceneId === 'morning') return choice ? [`Giải thích thêm về “${choice.label}”, và nói rõ điều gì có nguồn đối chiếu.`, 'Làm thế nào phân biệt truyền thuyết với dữ kiện lịch sử?'] : ['Làm thế nào quan sát đời sống địa phương một cách tôn trọng?', 'Khi nghe một câu chuyện địa phương, mình nên đối chiếu nguồn ra sao?'];
  if (state.sceneId === 'lunch') return choice ? [`“${choice.label}” thường có những thành phần nào? Nói rõ nếu có nhiều biến thể.`, 'Mình nên thử và điều chỉnh khẩu vị thế nào mà vẫn tôn trọng người cùng ăn?'] : ['Khi thử món ăn mới, mình nên bắt đầu như thế nào?', 'Vì sao cùng một món có thể có nhiều cách ăn và biến thể?'];
  if (state.sceneId === 'pottery') return ['Trang trí cốc tạo hình sẵn khác với tự nặn và nung cốc như thế nào?', 'Vì sao không nên tự gán ý nghĩa văn hóa cho một họa tiết?'];
  if (state.sceneId === 'creative') return ['Khi dùng ảnh để gợi ý làm bưu thiếp, mình nên ghi nguồn như thế nào?', 'Làm thế nào giữ một kỷ niệm mà không thêm những chi tiết mình chưa trải nghiệm?'];
  return ['Mình nên tìm hiểu thêm điều gì từ những hoạt động đã chọn hôm nay?', 'Làm thế nào phân biệt trải nghiệm cá nhân với nhận xét chung về một địa phương?'];
}
