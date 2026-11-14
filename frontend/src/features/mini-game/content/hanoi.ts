import type { NarrativeBlock, ChoiceResult, Scenario } from '../scenario.js';
import { hanoiVisuals } from './media.js';
import { culturalSources } from './sources.js';

const fiction = (text: string): NarrativeBlock => ({ text, kind: 'fiction', editorialStatus: 'authored' });
const say = (speaker: 'An' | 'Linh', text: string): NarrativeBlock => ({ ...fiction(text), speaker });
const gameplay = (text: string): NarrativeBlock => ({ text, kind: 'gameplay', editorialStatus: 'authored' });
const culture = (text: string): NarrativeBlock => ({ text, kind: 'culture', editorialStatus: 'source-reviewed' });
const result = (
  title: string, journalLabel: string | null, blocks: readonly NarrativeBlock[],
  knowledgeIds: readonly string[] = [], imageRef: string | null = null, continueLabel?: string,
): ChoiceResult => ({ title, journalLabel, blocks, knowledgeIds, imageRef, continueLabel });

const daySummary = 'Linh ghi lại {morningMemory}, rồi {lunchMemory}. ';

export const hanoiScenario: Scenario = {
  id: 'hanoi-one-day',
  version: '0.2.0',
  title: 'Một ngày làm người Hà Nội',
  provinceSlug: 'ha-noi', provinceName: 'Hà Nội',
  cast: { guide: 'An', visitor: 'Linh' },
  editorialStatus: 'review-ready',
  intro: [
    fiction("Bạn là An, sống ở Hà Nội. Hôm nay Linh, một người bạn lâu ngày mới gặp, nhờ bạn dẫn đi chơi. Hai người hẹn nhau bên Hồ Gươm, để trống cả ngày cho những điều bất chợt."),
            say("An", "Hôm nay mình dẫn đường. Nhưng đi đâu thì hai đứa cùng chọn nhé."),
    say("Linh", "Được! Mình muốn về có chuyện để kể, chứ không chỉ có một máy đầy ảnh."),
            fiction("Bạn quyết định thay An. Linh sẽ cùng bạn đi từ buổi sáng bên hồ, qua một bữa trưa, đến khoảng thời gian cuối ngày."),
    gameplay('Chọn hoạt động, đọc kết quả rồi bấm Tiếp tục. Không có điểm số hay lựa chọn thắng thua. Nhân vật, hội thoại và địa điểm phục vụ câu chuyện đều hư cấu; ghi chú văn hóa có nguồn riêng.'),
  ],
  introImageRef: 'hanoi-lake',
  firstSceneId: 'morning',
  scenes: {
    morning: {
      id: 'morning', title: 'Buổi sáng — Hồ Gươm', imageRef: 'hanoi-lake',
      blocks: [fiction("Linh đứng lại bên lan can, nhìn từ mặt nước sang hàng cây. Điện thoại vừa giơ lên đã hạ xuống."),
            say("Linh", "Ở đây có gì mà An thích nhất?"),
            say("An", "Có hôm mình chỉ đi dạo thôi. Có hôm lại muốn ngồi nghe chuyện về hồ."),
            say("Linh", "Vậy sáng nay mình bắt đầu từ đâu?")],
      choices: [
        {
          id: 'morning-walk', label: 'Đi dạo, quan sát đời sống', nextSceneId: 'lunch',
          result: result('Một vòng đi dạo', 'Đi dạo, quan sát đời sống ở Hồ Gươm', [
            fiction("Hai người men theo hàng cây. Linh dừng trước một người đang ngồi nghỉ, xoay điện thoại để lấy khung hình."),
            say("Linh", "Khoảnh khắc này đẹp quá. Mình chụp được không nhỉ?"),
            say("An", "Hỏi người ta trước đã. Không tiện thì mình chụp mặt hồ cũng đẹp mà."),
            fiction("Linh hạ máy, bước tới xin phép. An đứng chờ bên cạnh, không giục."),
            culture('Hướng dẫn ứng xử của Vietnam Tourism khuyên du khách hỏi trước khi chụp người khác và tôn trọng sự riêng tư của họ.'),
            say("Linh", "Suýt nữa mình chỉ lo lấy ảnh đẹp."),
            say("An", "Đi chậm một chút cũng được. Mình đang đi chơi mà."),
            fiction("Linh cất máy. Lần này, hai người đi thêm một đoạn mà chẳng ai nhắc đến chụp ảnh."),
          ], ['morning-walk-note'], 'hanoi-morning-walk', 'Nhắc bạn xin phép — Tiếp tục'),
        },
        {
          id: 'morning-story', label: 'Khám phá câu chuyện về hồ', nextSceneId: 'lunch',
          result: result('Chuyện kể và dấu mốc lịch sử', 'Khám phá câu chuyện về Hồ Gươm', [
            say('Linh', 'Sao cùng một hồ mà mình nghe gọi cả Hồ Gươm lẫn Hoàn Kiếm?'),
            say('An', 'Có một truyền thuyết gắn với tên ấy. Mình kể Linh nghe nhé.'),
            culture('Theo truyền thuyết, sau khi thắng quân Minh, vua Lê Lợi trả gươm báu cho Rùa thần trên hồ. Câu chuyện gắn với tên Hồ Gươm, hay Hoàn Kiếm. Đây là truyền thuyết, không được trình bày như sự kiện đã chứng minh.'),
            culture('Một dữ kiện có thể đối chiếu: khu di tích hồ Hoàn Kiếm và đền Ngọc Sơn được xếp hạng di tích quốc gia đặc biệt năm 2013.'),
            say("Linh", "Vậy chuyện trả gươm là truyền thuyết. Còn mốc 2013 là thông tin mình tra được từ tư liệu?"),
            say("An", "Ừ. Nghe chuyện vẫn hay, chỉ cần nhớ mình đang nghe chuyện gì."),
            say("Linh", "Giờ nhìn ra hồ mình có cái để nghĩ rồi, chứ không chỉ nhìn một khoảng nước."),
          ], ['morning-story-note', 'morning-history-note'], 'hanoi-lake', 'Phân biệt chuyện kể và dữ kiện — Tiếp tục'),
        },
      ],
    },
    lunch: {
      id: 'lunch', title: 'Buổi trưa — ăn ngoài', imageRef: 'lunch-table',
      blocks: [fiction("Rời bờ hồ, An nghe tiếng Linh thở dài phía sau. Tưởng bạn mỏi chân, An quay lại."),
            say("Linh", "Không phải mỏi. Mình đói rồi."),
            say("An", "Thế thì nghỉ ăn trưa. Bún chả hay phở?"),
            say("Linh", "Món nào An cũng có chuyện để kể à?"),
            say("An", "Có thể. Nhưng cho mình ăn trước đã.")],
      choices: [
        {
          id: 'lunch-bun-cha', label: 'Bún chả', nextSceneId: 'afternoon',
          result: result('Bữa trưa với bún chả', 'Ăn bún chả', [
            culture('Bún chả kết hợp bún với thịt lợn nướng, nước chấm và rau ăn kèm.'),
            fiction("Linh nhìn phần bún, rau và chả vừa được đặt xuống, rồi đưa mắt sang An."),
            say("Linh", "Mình cứ ăn theo An nhé?"),
            say("An", "Cứ thử một ít trước xem có vừa miệng không. Mình thích thế nào thì thêm thế ấy."),
            fiction("Linh nếm một chút rồi mới điều chỉnh phần của mình."),
            say("Linh", "Thế này vừa với mình rồi. An đừng nhìn bát mình để chấm điểm nhé."),
            say("An", "Mình đang bận ăn, có nhìn đâu."),
            fiction("Linh bật cười. Câu chuyện chuyển từ món ăn sang những chuyện chưa kịp kể cho nhau buổi sáng."),
          ], ['lunch-bun-cha-note'], 'hanoi-bun-cha'),
        },
        {
          id: 'lunch-pho', label: 'Phở', nextSceneId: 'afternoon',
          result: result('Bữa trưa với phở', 'Ăn phở', [
            culture('Phở là món bánh phở dùng với nước dùng; thịt bò và thịt gà là hai lựa chọn thường gặp.'),
            fiction("Linh cầm thìa, nhìn những thứ đặt cạnh bát phở rồi chần chừ."),
            say("An", "Nếm nước dùng trước xem sao."),
            fiction("Linh thử một chút, nghĩ ngợi rồi mới điều chỉnh theo khẩu vị."),
            say("Linh", "Mình thêm khác An có sao không?"),
            say("An", "Bát của Linh mà. Ăn thấy ngon là được."),
            fiction("Hơi nóng khiến Linh phải chờ thêm một nhịp mới ăn tiếp. An tranh thủ kể một chuyện cũ, còn Linh vừa nghe vừa gật đầu."),
            say("Linh", "Lần sau nhớ rủ mình ăn cùng nữa nhé."),
          ], ['lunch-pho-note'], 'hanoi-pho'),
        },
      ],
    },
    afternoon: {
      id: 'afternoon', title: 'Buổi chiều — dành thời gian cho điều mình thích', imageRef: 'hanoi-lake',
      blocks: [fiction("Bữa trưa xong, Linh ngả lưng rồi lật cuốn sổ nhỏ mang theo. Trang giấy vẫn còn trống."),
            say("Linh", "Mình mới ghi mỗi tên An. Hình như nãy giờ mải nói chuyện quá."),
            say("An", "Chiều mình làm gì đó bằng tay nhé? Trang trí một chiếc cốc. Hoặc ghé cà phê, ngồi nghỉ cho đúng nghĩa."),
            say("Linh", "Cho mình chọn nốt buổi chiều nhé."),
        gameplay('Không gian thủ công và quán trong truyện là hư cấu, không phải gợi ý đặt dịch vụ hay một lịch trình di chuyển ngoài đời.')],
      choices: [
        {
          id: 'afternoon-pottery', label: 'Trang trí chiếc cốc đã tạo hình sẵn', nextSceneId: 'pottery',
          result: result('Một khoảng thời gian cho đôi tay', null, [
            fiction("Buổi chiều, câu chuyện chuyển đến một góc thủ công. Trên bàn là hai chiếc cốc trơn đã tạo hình sẵn và màu trang trí."),
            say("Linh", "May quá, mình tưởng phải tự nặn từ một cục đất."),
            say("An", "Hôm nay chỉ trang trí thôi. Thử chọn một họa tiết xem."),
            fiction("An kéo ghế sang cạnh Linh. Hai người nhìn chiếc cốc một lúc trước khi bắt đầu."),
            gameplay('Đây là hoạt động minh họa, không chỉ tới một xưởng thực tế, không cam kết thời gian di chuyển, nung hay nhận sản phẩm.'),
          ], [], 'cup-blank'),
        },
        {
          id: 'afternoon-cafe', label: 'Ghé quán cà phê', nextSceneId: 'cafe',
          result: result('Một khoảng nghỉ', null, [
            fiction("Hai người ghé một quán cà phê trong câu chuyện. Linh đặt túi xuống, kéo ghế lại gần cửa sổ."),
            say("Linh", "Cuối cùng cũng được ngồi mà không phải tính đi đâu tiếp."),
            say("An", "Ừ. Mình nghỉ ở đây một lúc."),
            gameplay('Ảnh quán chỉ minh họa bối cảnh; không xác nhận đây là địa điểm hai nhân vật ghé thăm.'),
          ], [], 'hanoi-cafe'),
        },
      ],
    },
    pottery: {
      id: 'pottery', title: 'Trang trí chiếc cốc', imageRef: 'cup-blank',
      blocks: [fiction("Linh xoay chiếc cốc trơn, thử hình dung một nét vẽ trên thành cốc."),
            say("Linh", "Hình khối gọn gàng, hay vài cành lá nhỉ?"),
            say("An", "Mình cũng chưa quyết được. Linh chọn trước đi."),
        gameplay('Chọn một trong hai hướng trang trí. Ảnh cốc là mẫu có sẵn để tham khảo, không phải thành phẩm của nhân vật. Họa tiết không được gán ý nghĩa văn hóa hoặc đại diện cho một dòng gốm truyền thống.')],
      choices: [
        {
          id: 'pottery-geometric', label: 'Họa tiết hình học', nextSceneId: 'journal',
          result: result('Chiếc cốc với họa tiết hình học', 'Trang trí cốc bằng họa tiết hình học', [
            fiction("Linh chọn những hình khối nối nhau quanh thành cốc, rồi nghiêng đầu hình dung bố cục cùng An."),
            say("Linh", "Mình cứ muốn thêm một nét nữa. Nhưng dừng ở đây có khi đẹp hơn."),
            say("An", "Ừ, chừa một khoảng trống nữa."),
            fiction("Linh đặt cọ xuống. An nhìn những nét vừa chọn, thấy buổi chiều đã có một dấu nhớ khác hẳn buổi sáng."),
            gameplay('Ảnh sản phẩm có sẵn chỉ gợi ý hướng trang trí; không xác nhận cốc đã nung hay được nhận ngay.'),
          ], [], 'cup-geometric'),
        },
        {
          id: 'pottery-leaves', label: 'Họa tiết cây lá', nextSceneId: 'journal',
          result: result('Chiếc cốc với họa tiết cây lá', 'Trang trí cốc bằng họa tiết cây lá', [
            fiction("Linh chọn hướng trang trí cây lá, rồi chỉ cho An phần họa tiết mình muốn thử trên cốc."),
            say("Linh", "Mình không vẽ giống lá thật lắm nhỉ?"),
            say("An", "Nhưng nhìn vào là biết Linh thích một chiếc cốc có cây lá."),
            say("Linh", "Ừ, thế là đủ rồi."),
            fiction("Hai người đặt chiếc cốc lại trên bàn. Đây mới là ý tưởng trang trí, chưa phải một món đồ đã nung xong để mang về."),
            gameplay('Ảnh sản phẩm có sẵn chỉ gợi ý hướng trang trí; không gán ý nghĩa văn hóa, không xác nhận cốc đã nung hay được nhận ngay.'),
          ], [], 'cup-leaves'),
        },
      ],
    },
    cafe: {
      id: 'cafe', title: 'Một khoảng nghỉ ở quán cà phê', imageRef: 'hanoi-cafe',
      blocks: [fiction("Từ chỗ ngồi, Linh nhìn ra phố rồi mở cuốn sổ. An hỏi bạn có định ghi gì không."),
            say("Linh", "Mình đang phân vân. Ngồi nhìn thế này cũng thích, mà nói chuyện với An thì mình lại quên viết."),
            say("An", "Vậy mình cứ chọn điều muốn làm lúc này thôi.")],
      choices: [
        {
          id: 'cafe-street', label: 'Ngồi nhìn phố', nextSceneId: 'journal',
          result: result('Ngắm phố', 'Ngồi nhìn phố ở quán cà phê', [
            fiction("Linh khép sổ. Hai người ngồi nhìn người qua lại; có lúc An định nói gì rồi lại thôi."),
            say("Linh", "An có thấy phải đưa mình đi thêm chỗ nào nữa không?"),
            say("An", "Không. Mình ngồi đây cũng là đang chơi cùng nhau mà."),
            fiction("Linh tựa lưng vào ghế. Một lúc sau, bạn chỉ một chi tiết ngoài phố cho An, rồi cả hai lại im lặng. Lần này không ai thấy cần lấp đầy khoảng trống."),
          ], [], 'hanoi-cafe'),
        },
        {
          id: 'cafe-chat', label: 'Ngồi trò chuyện', nextSceneId: 'journal',
          result: result('Nhắc lại một ngày', 'Ngồi trò chuyện ở quán cà phê', [
            say("Linh", "Mình cứ nhớ {morningMemory}. Rồi cả {lunchMemory} nữa."),
            say("An", "Linh nhớ toàn những lúc mình chẳng có kế hoạch gì."),
            say("Linh", "Chắc vì thế mà mình thấy giống đi chơi với bạn hơn là chạy cho đủ một lịch trình."),
            fiction("An kéo cuốn sổ về giữa bàn. Hai người cùng chọn vài điều muốn giữ lại trước khi ra về."),
            say("An", "Lần sau mình lại đi một ngày khác. Chưa cần hẹn sẽ đi đâu."),
            say("Linh", "Nhưng vẫn để An dẫn đường nhé."),
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
  endingTemplate: fiction(daySummary + 'Cuốn sổ không ghi hết Hà Nội. Nó giữ lại một ngày An và Linh đã cùng chọn.'),
  endingByChoice: {
    'pottery-geometric': fiction(daySummary + 'Cuối trang, Linh phác vài hình khối của chiếc cốc: chừa một khoảng trống cũng là một cách làm xong. An hẹn lần tới lại dành thời gian ngồi cùng nhau.'),
    'pottery-leaves': fiction(daySummary + 'Cuối trang là vài nét cây lá của chiếc cốc còn ở bước trang trí. Linh viết thêm: Không cần vẽ thật khéo mới có một thứ đáng nhớ.'),
    'cafe-street': fiction(daySummary + 'Buổi chiều ở quán cà phê, hai người đã chọn ngồi nhìn phố. Linh để trống mấy dòng cuối: có những lúc không cần ghi hết. An khép sổ, rủ bạn thong thả ra về.'),
    'cafe-chat': fiction(daySummary + 'Sau cuộc trò chuyện ở quán cà phê, Linh viết: Hôm nay An dẫn đường, nhưng hai đứa cùng chọn ngày của mình. Cuốn sổ khép lại, còn lời hẹn lần sau thì để mở.'),
  },
  recallByChoice: {
    'morning-walk': 'lúc hai đứa hạ điện thoại xuống để xin phép chụp ảnh bên hồ',
    'morning-story': 'câu chuyện trả gươm và cách phân biệt truyền thuyết với tư liệu bên hồ',
    'lunch-bun-cha': 'bữa bún chả mình nếm thử rồi mới điều chỉnh cho vừa miệng',
    'lunch-pho': 'bát phở mình thử nước dùng trước khi nêm thêm',
  },
  imageRefs: Object.keys(hanoiVisuals),
  sourceRefs: Object.keys(culturalSources),
};
