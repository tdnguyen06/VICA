# Demo mini-game 11 tỉnh — 13/11/2026

## Phiên bản và develop

- Nhánh: feat/mini-game; HEAD trước/sau đợt triển khai: 6549c66. Các bổ sung đa tỉnh, ảnh và biên tập chưa commit/push.
- Đã git fetch origin trước khi làm. Develop mới nhất lúc kiểm tra: 6f3bc33, merge PR #10 (auth). Chưa merge PR auth vào nhánh này; không chạy backend/migration/database. Nhánh hiện tại đã có develop trước đó qua merge 6549c66 (3d6882b, PR #8).

## Phạm vi đã hoàn thiện để demo local

- 11 kịch bản chơi từ mở đầu đến nhật ký, 16 tổ hợp chính mỗi tỉnh, tổng 176 hành trình. Tên tỉnh theo registry hiện có của VICA, không khẳng định là bộ địa giới hành chính hiện hành.
- Danh sách /experiences mặc định lọc 11 tỉnh sẵn sàng, 9 mục/trang. Có tìm không dấu, phân trang, random trên tất cả 11 tỉnh; bỏ lọc để xem 63 tỉnh. Random/xem giới thiệu không tự thay lượt.
- Cả 11 thẻ tỉnh tương ứng trên bản đồ có nút Trải nghiệm một ngày. Tỉnh chưa có kịch bản và các mục hiển thị chủ quyền không có nút chơi.
- Mỗi tỉnh có hai nhân vật được đặt tên, phần giới thiệu quan hệ, lời thoại tách lời kể, ba chặng trong ngày và ghi chú văn hóa riêng. Hội thoại mới tự biên tập, không lấy từ nguồn văn hóa hoặc nhờ LLM dịch vụ tạo.
- Hà Nội giữ gốm/cà phê; mười tỉnh khác giữ bưu thiếp/khoảng nghỉ như phạm vi đã triển khai. Không thêm điểm số, quiz, tiền hay chỉ số nhân vật. Chọn → đọc kết quả → Tiếp tục, không quay lại đổi lựa chọn.
- Cảnh nói chuyện và lời kết dùng kỷ niệm đúng lựa chọn sáng/trưa. Nhật ký có ba hoạt động thực tế theo thứ tự; không lộ nội dung nhánh chưa chơi.
- Một lượt hiện tại trên thiết bị, không cần đăng nhập. ID/đồ thị/version giữ nguyên (Hà Nội 0.2.0, tỉnh khác 1.0.0); bản lưu cũ giữ lựa chọn, đọc nội dung biên tập mới. Khóa legacy vica:minigame:hanoi:current vẫn dùng cho toàn module.
- Hai lối vào dùng cùng tiến trình. Chuyển tỉnh hoặc chơi lại cần xác nhận; không xóa auth/chat. Lỗi đọc/ghi, save hỏng, xung đột tab và sự kiện muộn có kiểm tra trong lõi.
- Assistant tùy chọn có ngữ cảnh tỉnh/cảnh/lựa chọn và tên hai nhân vật, guest conversation tách theo scenario/run. Không điều khiển cốt truyện; lỗi AI không chặn chơi. Chỉ test AI giả lập trong đợt này.

## Nhân vật

| Tỉnh trong registry | Vai người chơi | Bạn đồng hành |
| --- | --- | --- |
| Hà Nội | An | Linh |
| Hải Phòng | Huy | Mai |
| Quảng Ninh | Khánh | Vy |
| Ninh Bình | Bình | Chi |
| Thừa Thiên Huế | Duy | Ngọc |
| Đà Nẵng | Nam | Hà |
| Quảng Nam | Phúc | Trang |
| Khánh Hòa | Hải | Yến |
| Lâm Đồng | Sơn | Thảo |
| TP. Hồ Chí Minh | Quân | Nhi |
| Cần Thơ | Tín | Hân |

## Ảnh và nguồn

- Hà Nội: 9 mục ảnh thật; các cốc có sẵn chỉ tham khảo hình dáng/họa tiết, không khẳng định là gốm Hà Nội hoặc sản phẩm An–Linh vừa làm. Ảnh trước bữa trưa chỉ gợi ý, chưa chốt món.
- Ngoài Hà Nội: 40 mục lựa chọn sáng/trưa có JPEG local, 39 ảnh nguồn khác nhau, phủ cả 100 tham chiếu ảnh. Nhánh chiều dùng ảnh chặng sáng đã chơi làm cảm hứng/ký ức.
- Đã thay bối cảnh Nhà cổ Bình Thủy bằng ảnh đúng Nhà thờ họ Dương/Bình Thủy, và thay ba ảnh bối cảnh món ăn bằng ảnh món tham khảo.
- Giới hạn còn lại: Bảo tàng Hải Phòng dùng ảnh Nhà hát làm bối cảnh thành phố, ghi rõ không phải bảo tàng. Một số ảnh món chụp ngoài tỉnh/khác biến thể: cơm cháy Đông Hà, cơm gà Việt Nam chưa xác nhận Hội An, xíu mại trong bánh mì tại Houston không phải cách phục vụ Đà Lạt, cùng các giới hạn ghi ngay dưới từng ảnh. Không gọi toàn bộ bộ ảnh là ảnh địa phương đã xác minh.
- Nguồn/giấy phép/credit/hash: frontend/public/mini-game/hanoi/CREDITS.md và frontend/public/mini-game/regions/CREDITS.md. Metadata trong content/media.ts và regional-media.ts. Ảnh lỗi có dự phòng; không chặn tiếp tục.
- Dữ kiện và truyền thuyết được giữ nguyên nguồn hiện có; hội thoại/nhân vật và góc thủ công/chỗ nghỉ hư cấu không được trình bày là dịch vụ thật.

## Cấu trúc

- content/regions/*.ts: thông tin lựa chọn, dữ kiện, nguồn và hình ảnh theo tỉnh.
- content/regional-narratives.ts: toàn bộ nội dung mới cho mười tỉnh (cast, mở đầu, đối thoại, ký ức và kết thúc). Đã bỏ các đoạn hội thoại cũ không còn dùng.
- content/regional-builder.ts: chỉ ghép dữ liệu thành scene graph chung, đặt đúng người nói; không sao chép toàn bộ truyện Hà Nội sang các tỉnh.
- engine.ts, journal.ts, storage.ts, session.ts, adventure.ts: lõi/nhật ký/lưu và chuyển lượt. regional-photo.ts: ảnh theo lựa chọn.
- ProvinceExperiencePage.tsx, StoryCard.tsx: trang chơi và trình bày người nói. ExperienceCatalogPage.tsx: chọn tỉnh. MapViewer.tsx: lối vào theo registry kịch bản.

## Kiểm thử và bằng chứng

- 330/330 test đạt, không skip: 176 hành trình, tên nhân vật, hội thoại, ký ức đúng nhánh/không lộ nhánh khác, journal, save/restore, chống bấm lặp/đến muộn, ảnh/hash/credit, catalog và Assistant giả lập.
- Build/typecheck frontend đạt; lint toàn bộ mini-game, các trang game và test đạt. MapViewer có 4 cảnh báo lint kế thừa từ develop, không thuộc các dòng nối nút game. Build còn cảnh báo chunk ứng dụng lớn.
- Browser Edge QA: đã chơi trọn một lượt ở từng tỉnh, đủ 11/11 tới nhật ký với ba mục; ảnh các lượt kiểm tra tải được. Nhánh bưu thiếp, bảng màu, nghỉ/ngắm cảnh và trò chuyện đều được chạy ở các tỉnh khác nhau. Hà Nội đi dạo/phở/cốc hình học.
- Browser: tìm da nang ra Đà Nẵng, filter 11 tỉnh/2 trang, random chọn Huế khi đang lọc Đà Nẵng và giữ nguyên lượt Hà Nội. Reload nhật ký Hà Nội đúng màn hình.
- Khung 390 × 844 (375px phần nội dung): Cần Thơ không tràn ngang, reload tại kết quả Nhà cổ Bình Thủy đúng cảnh. Hỏi thêm giả lập thành công/503, đóng AI quay về đúng kết quả, vẫn hoàn thành Bình Thủy/bánh xèo/trò chuyện dù AI lỗi.
- Bằng chứng ngoài repo tại workspace Codex: game-11-provinces-browser-qa.json, game-can-tho-mobile.jpg, game-11-provinces-catalog.jpg. Không chứa secrets hoặc credentials thật.

## Chạy demo

```powershell
cd D:\Codex_Hackathon_141126\VICA\frontend
npm.cmd run dev:mini-game-qa
```

Mở http://127.0.0.1:15176/experiences. API dùng middleware QA, không chuyển tới backend thật kể cả khi có .env.local. /__qa có các chế độ lỗi, /__qa/hanoi-photos xem bốn ảnh Hà Nội vừa thay. Ctrl+C dừng server. Không deploy cấu hình QA.

Kiểm thử: npm.cmd run test:mini-game; build: npm.cmd run build. Không cần thêm dependency hay database cho gameplay.

## Giới hạn nghiệm thu

Demo gameplay 11 tỉnh hoàn tất về kỹ thuật ở local. Chưa kiểm tra bản cài điện thoại thật, chưa đo thời lượng bằng người chơi thực tế, chưa gọi LLM thật, chưa tích hợp PR auth mới nhất. Cảm giác nhập vai/nội dung và ảnh tham khảo cần nhóm review trước nghiệm thu phát hành. Không tuyên bố đây là production đã kiểm chứng.
