import type { NarrativeBlock, ChoiceResult, Scenario } from '../scenario.js';
import { hanoiVisuals } from './media.js';
import { culturalSources } from './sources.js';

const fiction = (text: string): NarrativeBlock => ({ text, kind: 'fiction', editorialStatus: 'authored' });
const gameplay = (text: string): NarrativeBlock => ({ text, kind: 'gameplay', editorialStatus: 'authored' });
const culture = (text: string): NarrativeBlock => ({ text, kind: 'culture', editorialStatus: 'source-reviewed' });
const result = (
  title: string, journalLabel: string | null, blocks: readonly NarrativeBlock[],
  knowledgeIds: readonly string[] = [], imageRef: string | null = null, continueLabel?: string,
): ChoiceResult => ({ title, journalLabel, blocks, knowledgeIds, imageRef, continueLabel });

const daySummary = 'Buổi sáng: {morning}. Bữa trưa: {lunch}. Buổi chiều: {afternoon}. ';

export const hanoiScenario: Scenario = {
  id: 'hanoi-one-day',
  version: '0.2.0',
  title: 'Một ngày làm người Hà Nội',
  provinceSlug: 'ha-noi',
  editorialStatus: 'review-ready',
  intro: [
    fiction('Hôm nay, bạn vào vai một người Hà Nội dẫn một người bạn lần đầu khám phá thành phố. Hai bạn không có lịch trình cứng nhắc: chỉ một buổi sáng bên hồ, một bữa trưa và khoảng thời gian cho điều mình thích.'),
    fiction('Người bạn: Mình muốn biết thành phố qua những điều nhỏ thôi. Hôm nay bạn dẫn đường nhé!'),
    gameplay('Chọn hoạt động, đọc kết quả rồi bấm Tiếp tục. Không có điểm số hay lựa chọn thắng thua. Nhân vật, hội thoại và địa điểm phục vụ câu chuyện đều hư cấu; ghi chú văn hóa có nguồn riêng.'),
  ],
  introImageRef: 'hanoi-lake',
  firstSceneId: 'morning',
  scenes: {
    morning: {
      id: 'morning', title: 'Buổi sáng — Hồ Gươm', imageRef: 'hanoi-lake',
      blocks: [fiction('Hai bạn đứng bên hồ. Người bạn cất điện thoại một lúc, nhìn hàng cây và hỏi: Mình đi dạo trước, hay nghe bạn kể một câu chuyện về nơi này?')],
      choices: [
        {
          id: 'morning-walk', label: 'Đi dạo, quan sát đời sống', nextSceneId: 'lunch',
          result: result('Một vòng đi dạo', 'Đi dạo, quan sát đời sống ở Hồ Gươm', [
            fiction('Hai bạn chậm lại bên hàng cây. Người bạn nhận ra một khoảnh khắc đẹp, định chụp một người đang nghỉ bên hồ. Bạn nhẹ nhàng nhắc: Mình hỏi ý kiến họ trước nhé; nếu họ không muốn thì mình giữ khoảnh khắc bằng cách ngắm thôi.'),
            culture('Hướng dẫn ứng xử của Vietnam Tourism khuyên du khách hỏi trước khi chụp người khác và tôn trọng sự riêng tư của họ.'),
            fiction('Người bạn: Ừ, một tấm ảnh đẹp cũng nên bắt đầu bằng sự thoải mái của người trong ảnh.'),
          ], ['morning-walk-note'], 'hanoi-morning-walk', 'Nhắc bạn xin phép — Tiếp tục'),
        },
        {
          id: 'morning-story', label: 'Khám phá câu chuyện về hồ', nextSceneId: 'lunch',
          result: result('Chuyện kể và dấu mốc lịch sử', 'Khám phá câu chuyện về Hồ Gươm', [
            culture('Theo truyền thuyết, sau khi thắng quân Minh, vua Lê Lợi trả gươm báu cho Rùa thần trên hồ. Câu chuyện gắn với tên Hồ Gươm, hay Hoàn Kiếm. Đây là truyền thuyết, không được trình bày như sự kiện đã chứng minh.'),
            culture('Một dữ kiện có thể đối chiếu: khu di tích hồ Hoàn Kiếm và đền Ngọc Sơn được xếp hạng di tích quốc gia đặc biệt năm 2013.'),
            fiction('Người bạn: Vậy mình nhớ hai lớp nhé: câu chuyện dân gian giúp hiểu tên hồ; còn mốc xếp hạng là thông tin từ tư liệu. Bạn gật đầu, rồi hai người tìm một khoảng nghỉ trước bữa trưa.'),
          ], ['morning-story-note', 'morning-history-note'], 'hanoi-lake', 'Phân biệt chuyện kể và dữ kiện — Tiếp tục'),
        },
      ],
    },
    lunch: {
      id: 'lunch', title: 'Buổi trưa — ăn ngoài', imageRef: 'lunch-table',
      blocks: [fiction('Sau một buổi sáng đi cùng nhau, hai bạn đã đói. Không cần tìm một món đại diện cho tất cả mọi người, bạn đưa ra hai gợi ý để người bạn tự chọn: bún chả hay phở?')],
      choices: [
        {
          id: 'lunch-bun-cha', label: 'Bún chả', nextSceneId: 'afternoon',
          result: result('Bữa trưa với bún chả', 'Ăn bún chả', [
            culture('Bún chả kết hợp bún với thịt lợn nướng, nước chấm và rau ăn kèm.'),
            fiction('Người bạn nếm thử một chút, ngừng lại để cảm nhận vị, rồi mới điều chỉnh theo khẩu vị của mình. Bạn không vội chỉ một cách ăn duy nhất: Cứ thử ít trước, thấy hợp thế nào thì mình dùng thế ấy.'),
            fiction('Hai bạn kể thêm vài chuyện vụn vặt. Bữa trưa không trở thành bài kiểm tra; đó chỉ là khoảng thời gian để ăn ngon và hiểu nhau hơn.'),
          ], ['lunch-bun-cha-note'], 'hanoi-bun-cha'),
        },
        {
          id: 'lunch-pho', label: 'Phở', nextSceneId: 'afternoon',
          result: result('Bữa trưa với phở', 'Ăn phở', [
            culture('Phở là món bánh phở dùng với nước dùng; thịt bò và thịt gà là hai lựa chọn thường gặp.'),
            fiction('Người bạn nếm thử một chút nước dùng trước, rồi mới điều chỉnh theo khẩu vị của mình. Bạn nói: Không cần nêm giống mình đâu; cứ thử từ từ để biết bạn thích vị nào.'),
            fiction('Hơi ấm từ bát ăn làm câu chuyện chậm lại. Hai bạn thống nhất rằng khám phá món ăn cũng là dịp lắng nghe cảm nhận của nhau.'),
          ], ['lunch-pho-note'], 'hanoi-pho'),
        },
      ],
    },
    afternoon: {
      id: 'afternoon', title: 'Buổi chiều — dành thời gian cho điều mình thích', imageRef: 'hanoi-lake',
      blocks: [fiction('Buổi chiều còn đủ một khoảng thong thả. Bạn gợi ý một hoạt động trang trí cốc, hoặc ghé quán cà phê để nghỉ chân. Người bạn mỉm cười: Hôm nay mình chọn theo tâm trạng thôi nhé.'),
        gameplay('Không gian thủ công và quán trong truyện là hư cấu, không phải gợi ý đặt dịch vụ hay một lịch trình di chuyển ngoài đời.')],
      choices: [
        {
          id: 'afternoon-pottery', label: 'Trang trí chiếc cốc đã tạo hình sẵn', nextSceneId: 'pottery',
          result: result('Một khoảng thời gian cho đôi tay', null, [
            fiction('Câu chuyện chuyển đến một không gian thủ công hư cấu. Trước mặt hai bạn là chiếc cốc đã tạo hình sẵn và các màu trang trí. Bạn không cần dùng bàn xoay: hôm nay chỉ chọn một họa tiết cho chiếc cốc.'),
            gameplay('Đây là hoạt động minh họa, không chỉ tới một xưởng thực tế, không cam kết thời gian di chuyển, nung hay nhận sản phẩm.'),
          ], [], 'cup-blank'),
        },
        {
          id: 'afternoon-cafe', label: 'Ghé quán cà phê', nextSceneId: 'cafe',
          result: result('Một khoảng nghỉ', null, [
            fiction('Hai bạn ghé một quán cà phê trong câu chuyện. Sau buổi đi chơi, chẳng cần thêm một danh sách phải làm: chỉ chọn ngồi ngắm phố hay dành thời gian trò chuyện.'),
            gameplay('Ảnh quán chỉ minh họa bối cảnh; không xác nhận đây là địa điểm hai nhân vật ghé thăm.'),
          ], [], 'hanoi-cafe'),
        },
      ],
    },
    pottery: {
      id: 'pottery', title: 'Trang trí chiếc cốc', imageRef: 'cup-blank',
      blocks: [fiction('Người bạn xoay nhẹ chiếc cốc trơn trong tay: Những hình khối gọn gàng hay vài nét cây lá sẽ hợp hơn nhỉ?'),
        gameplay('Chọn một trong hai bản minh họa. Họa tiết không được gán ý nghĩa văn hóa hoặc đại diện cho một dòng gốm truyền thống.')],
      choices: [
        {
          id: 'pottery-geometric', label: 'Họa tiết hình học', nextSceneId: 'journal',
          result: result('Chiếc cốc với họa tiết hình học', 'Trang trí cốc bằng họa tiết hình học', [
            fiction('Những nét hình học hiện lên trên bản minh họa chiếc cốc. Người bạn cười: Mình thích nhịp điệu của những hình khối này. Bạn nhìn lại thành quả, thấy vui vì hai người đã dành thời gian làm một điều mới.'),
            gameplay('Hình ảnh chỉ minh họa bước trang trí; không xác nhận cốc đã nung hay được nhận ngay.'),
          ], [], 'cup-geometric'),
        },
        {
          id: 'pottery-leaves', label: 'Họa tiết cây lá', nextSceneId: 'journal',
          result: result('Chiếc cốc với họa tiết cây lá', 'Trang trí cốc bằng họa tiết cây lá', [
            fiction('Những nét cây lá xuất hiện trên bản minh họa chiếc cốc. Người bạn bảo nó khiến mình nhớ hàng cây bên hồ buổi sáng. Đó là liên tưởng riêng của nhân vật, và bạn cũng thấy một ngày đang khép lại thật nhẹ.'),
            gameplay('Hình ảnh chỉ minh họa bước trang trí; không gán ý nghĩa văn hóa, không xác nhận cốc đã nung hay được nhận ngay.'),
          ], [], 'cup-leaves'),
        },
      ],
    },
    cafe: {
      id: 'cafe', title: 'Một khoảng nghỉ ở quán cà phê', imageRef: 'hanoi-cafe',
      blocks: [fiction('Hai bạn chọn một chỗ ngồi dễ chịu. Người bạn hỏi: Mình cứ ngắm phố một lúc, hay kể lại điều thích nhất từ sáng tới giờ?')],
      choices: [
        {
          id: 'cafe-street', label: 'Ngồi nhìn phố', nextSceneId: 'journal',
          result: result('Ngắm phố', 'Ngồi nhìn phố ở quán cà phê', [
            fiction('Hai bạn để câu chuyện lắng xuống, nhìn nhịp người qua lại. Có lúc chẳng ai nói gì, nhưng khoảng im lặng không hề khó xử. Người bạn bảo: Mình thích được ở đây một lúc mà không cần hoàn thành thêm việc gì.'),
          ], [], 'hanoi-cafe'),
        },
        {
          id: 'cafe-chat', label: 'Ngồi trò chuyện', nextSceneId: 'journal',
          result: result('Nhắc lại một ngày', 'Ngồi trò chuyện ở quán cà phê', [
            fiction('Người bạn: Mình nhớ buổi sáng: {morning}. Rồi đến bữa trưa: {lunch}. Mỗi lựa chọn lại làm hôm nay có một sắc thái khác.'),
            fiction('Bạn: Hà Nội có nhiều câu chuyện và nhiều cách cảm nhận. Hôm nay chỉ là một lát cắt nhỏ của hai đứa mình thôi. Người bạn gật đầu, rồi cùng bạn nhắc lại điều muốn giữ trong nhật ký.'),
          ], [], 'hanoi-cafe'),
        },
      ],
    },
  },
  knowledge: [
    { id: 'morning-walk-note', text: 'Hỏi trước khi chụp người khác và tôn trọng sự riêng tư của họ.', category: 'practice', verification: 'source-reviewed', sourceIds: ['tourism-photo-etiquette'] },
    { id: 'morning-story-note', text: 'Theo truyền thuyết, Lê Lợi trả gươm cho Rùa thần; chuyện kể gắn với tên Hồ Gươm/Hoàn Kiếm.', category: 'legend', verification: 'source-reviewed', sourceIds: ['heritage-hoan-kiem'] },
    { id: 'morning-history-note', text: 'Khu di tích hồ Hoàn Kiếm và đền Ngọc Sơn được xếp hạng di tích quốc gia đặc biệt năm 2013.', category: 'fact', verification: 'source-reviewed', sourceIds: ['heritage-hoan-kiem'] },
    { id: 'lunch-bun-cha-note', text: 'Bún chả có bún, thịt lợn nướng, nước chấm và rau ăn kèm; cách điều chỉnh khẩu vị trong truyện là lựa chọn cá nhân.', category: 'fact', verification: 'source-reviewed', sourceIds: ['tourism-hanoi-food'] },
    { id: 'lunch-pho-note', text: 'Phở dùng bánh phở với nước dùng, thường có thịt bò hoặc thịt gà; không chỉ có một cách nêm cho mọi người.', category: 'fact', verification: 'source-reviewed', sourceIds: ['tourism-hanoi-food'] },
  ],
  endingTemplate: fiction(daySummary + 'Hai bạn giữ lại một ngày của riêng mình, không phải chân dung đại diện cho mọi người Hà Nội.'),
  endingByChoice: {
    'pottery-geometric': fiction(daySummary + 'Những hình khối trên chiếc cốc minh họa nhắc hai bạn về niềm vui thử điều mới.'),
    'pottery-leaves': fiction(daySummary + 'Nét cây lá trên chiếc cốc minh họa nối buổi chiều với hàng cây trong ký ức buổi sáng.'),
    'cafe-street': fiction(daySummary + 'Một khoảng lặng nhìn phố là cách hai bạn khép lại ngày khám phá.'),
    'cafe-chat': fiction(daySummary + 'Điều ở lại là câu chuyện hai người vừa cùng nhau kể.'),
  },
  imageRefs: Object.keys(hanoiVisuals),
  sourceRefs: Object.keys(culturalSources),
};
