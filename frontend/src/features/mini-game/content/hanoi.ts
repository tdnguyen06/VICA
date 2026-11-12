import type { NarrativeBlock, ChoiceResult, Scenario } from '../scenario.js';
import { hanoiVisuals } from './media.js';

const fiction = (text: string): NarrativeBlock => ({ text, kind: 'fiction', editorialStatus: 'draft' });
const gameplay = (text: string): NarrativeBlock => ({ text, kind: 'gameplay', editorialStatus: 'draft' });
const placeholder = (text: string): NarrativeBlock => ({
  text: '[PLACEHOLDER CHƯA KIỂM CHỨNG] ' + text,
  kind: 'cultural-placeholder',
  editorialStatus: 'draft',
});
const result = (
  title: string,
  journalLabel: string | null,
  blocks: readonly NarrativeBlock[],
  knowledgeIds: readonly string[] = [],
  imageRef: string | null = null,
): ChoiceResult => ({ title, journalLabel, blocks, knowledgeIds, imageRef });

export const hanoiScenario: Scenario = {
  id: 'hanoi-one-day',
  version: '0.1.0-draft',
  title: 'Một ngày làm người Hà Nội',
  provinceSlug: 'ha-noi',
  editorialStatus: 'development-placeholder',
  intro: [
    fiction('Bạn vào vai một người Hà Nội dẫn một người bạn khám phá thành phố. Nhân vật và hội thoại đều là hư cấu.'),
    gameplay('Chọn một hoạt động, đọc kết quả rồi bấm Tiếp tục. Đây là bản khung thử logic, chưa phải nội dung demo hoàn chỉnh.'),
  ],
  introImageRef: 'hanoi-lake',
  firstSceneId: 'morning',
  scenes: {
    morning: {
      id: 'morning', title: 'Buổi sáng — Hồ Gươm', imageRef: 'hanoi-lake',
      blocks: [fiction('Bạn: Sáng nay mình đi dạo hay tìm hiểu câu chuyện về hồ?')],
      choices: [
        {
          id: 'morning-walk', label: 'Đi dạo, quan sát đời sống', nextSceneId: 'lunch',
          result: result('Một vòng đi dạo', 'Đi dạo, quan sát đời sống ở Hồ Gươm', [
            fiction('Hai bạn dành thời gian quan sát nhịp sống quanh hồ.'),
            placeholder('Tình huống xin phép trước khi chụp ảnh người khác sẽ được biên tập sau; đợt này không thêm lựa chọn.'),
          ], ['morning-walk-note'], 'hanoi-morning-walk'),
        },
        {
          id: 'morning-story', label: 'Khám phá câu chuyện về hồ', nextSceneId: 'lunch',
          result: result('Lắng nghe câu chuyện', 'Khám phá câu chuyện về Hồ Gươm', [
            fiction('Người bạn muốn biết đâu là chuyện kể và đâu là dữ kiện lịch sử.'),
            placeholder('Câu chuyện về hồ, nguồn và tương tác phân biệt truyền thuyết với lịch sử chưa được biên tập.'),
          ], ['morning-story-note'], 'hanoi-lake'),
        },
      ],
    },
    lunch: {
      id: 'lunch', title: 'Buổi trưa — ăn ngoài', imageRef: 'lunch-table',
      blocks: [fiction('Bạn: Trưa nay mình thử bún chả hay phở?')],
      choices: [
        {
          id: 'lunch-bun-cha', label: 'Bún chả', nextSceneId: 'afternoon',
          result: result('Bữa trưa với bún chả', 'Ăn bún chả', [
            fiction('Người bạn nếm thử một chút rồi điều chỉnh theo khẩu vị của mình.'),
            placeholder('Tư liệu về bún chả sẽ bổ sung sau; không coi một cách ăn là chuẩn cho mọi người.'),
          ], ['lunch-bun-cha-note'], 'hanoi-bun-cha'),
        },
        {
          id: 'lunch-pho', label: 'Phở', nextSceneId: 'afternoon',
          result: result('Bữa trưa với phở', 'Ăn phở', [
            fiction('Người bạn nếm thử một chút rồi điều chỉnh theo khẩu vị của mình.'),
            placeholder('Tư liệu về phở sẽ bổ sung sau; không coi một cách ăn là chuẩn cho mọi người.'),
          ], ['lunch-pho-note'], 'hanoi-pho'),
        },
      ],
    },
    afternoon: {
      id: 'afternoon', title: 'Buổi chiều', imageRef: 'hanoi-lake',
      blocks: [fiction('Bạn: Mình thử trang trí cốc hay ghé quán cà phê?')],
      choices: [
        {
          id: 'afternoon-pottery', label: 'Trang trí chiếc cốc đã tạo hình sẵn', nextSceneId: 'pottery',
          result: result('Chuyển sang hoạt động gốm', null, [
            fiction('Hai bạn chọn hoạt động trang trí một chiếc cốc đã tạo hình sẵn.'),
            placeholder('Địa điểm và chuyển cảnh chưa chốt; chưa mô tả dịch vụ thực tế.'),
          ], [], 'cup-blank'),
        },
        {
          id: 'afternoon-cafe', label: 'Ghé quán cà phê', nextSceneId: 'cafe',
          result: result('Một khoảng nghỉ', null, [
            fiction('Hai bạn ghé một quán cà phê trong câu chuyện hư cấu.'),
          ], [], 'hanoi-cafe'),
        },
      ],
    },
    pottery: {
      id: 'pottery', title: 'Trang trí chiếc cốc', imageRef: 'cup-blank',
      blocks: [gameplay('Chọn một họa tiết cho chiếc cốc đã tạo hình sẵn. Kết quả dùng minh họa SVG, không phải ảnh sản phẩm thực tế.')],
      choices: [
        {
          id: 'pottery-geometric', label: 'Họa tiết hình học', nextSceneId: 'journal',
          result: result('Chiếc cốc với họa tiết hình học', 'Trang trí cốc bằng họa tiết hình học', [
            fiction('Người bạn: Những hình khối này làm chiếc cốc trông thật vui mắt.'),
            gameplay('Đây là kết quả minh họa bước trang trí, không phải xác nhận cốc đã nung hoặc có thể nhận ngay.'),
          ], [], 'cup-geometric'),
        },
        {
          id: 'pottery-leaves', label: 'Họa tiết cây lá', nextSceneId: 'journal',
          result: result('Chiếc cốc với họa tiết cây lá', 'Trang trí cốc bằng họa tiết cây lá', [
            fiction('Người bạn: Mình thích những nét cây lá trên chiếc cốc này.'),
            gameplay('Đây là kết quả minh họa bước trang trí, không gán ý nghĩa văn hóa và không xác nhận cốc đã nung hoặc có thể nhận ngay.'),
          ], [], 'cup-leaves'),
        },
      ],
    },
    cafe: {
      id: 'cafe', title: 'Một khoảng nghỉ ở quán cà phê', imageRef: 'hanoi-cafe',
      blocks: [fiction('Hai bạn chọn cách tận hưởng khoảng nghỉ này.')],
      choices: [
        {
          id: 'cafe-street', label: 'Ngồi nhìn phố', nextSceneId: 'journal',
          result: result('Ngắm phố', 'Ngồi nhìn phố ở quán cà phê', [
            fiction('Hai bạn ngồi nhìn phố và tận hưởng một khoảng nghỉ.'),
          ], [], 'hanoi-cafe'),
        },
        {
          id: 'cafe-chat', label: 'Ngồi trò chuyện', nextSceneId: 'journal',
          result: result('Nhắc lại một ngày', 'Ngồi trò chuyện ở quán cà phê', [
            fiction('Người bạn: Sáng mình đã {morning}; trưa thì {lunch}. Giờ được ngồi trò chuyện cũng thật dễ chịu.'),
          ], [], 'hanoi-cafe'),
        },
      ],
    },
  },
  knowledge: [
    { id: 'morning-walk-note', text: '[PLACEHOLDER] Tình huống tôn trọng người được chụp ảnh, chưa biên tập.', verification: 'unverified-placeholder', sourceIds: [] },
    { id: 'morning-story-note', text: '[PLACEHOLDER] Truyền thuyết và dữ kiện lịch sử về hồ, chưa xác minh tư liệu.', verification: 'unverified-placeholder', sourceIds: [] },
    { id: 'lunch-bun-cha-note', text: '[PLACEHOLDER] Nội dung văn hóa bún chả chưa có tư liệu đã duyệt.', verification: 'unverified-placeholder', sourceIds: [] },
    { id: 'lunch-pho-note', text: '[PLACEHOLDER] Nội dung văn hóa phở chưa có tư liệu đã duyệt.', verification: 'unverified-placeholder', sourceIds: [] },
  ],
  endingTemplate: fiction('Một ngày khép lại: {morning}; {lunch}; rồi {afternoon}. Hai bạn giữ lại những kỷ niệm của riêng hành trình này.'),
  imageRefs: Object.keys(hanoiVisuals),
  sourceRefs: [],
};
