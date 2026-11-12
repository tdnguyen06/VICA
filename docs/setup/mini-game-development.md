# Mini-game Hà Nội — phát triển và nghiệm thu

## Phạm vi đã triển khai

- Trải nghiệm “Một ngày làm người Hà Nội”: sáng Hồ Gươm → bữa trưa → gốm hoặc cà phê → nhật ký.
- 16 hành trình chính; chọn → đọc kết quả → Tiếp tục. Không điểm số, quay lại hoặc đổi lựa chọn trong cùng lượt.
- Hai lối vào: thẻ Khám phá và nút riêng trên thẻ Hà Nội. Tỉnh khác không có kịch bản.
- Một lượt lưu trên thiết bị, riêng khóa `vica:minigame:hanoi:current`. Không ghi auth/chat.
- Nội dung kịch bản, lõi trạng thái, lưu/khôi phục, giao diện và Assistant tách module.
- Kịch bản `hanoi-one-day` phiên bản `0.2.0`: hội thoại biên tập, ghi chú văn hóa đối chiếu nguồn, lời kết theo lựa chọn thực tế.
- Save cũ khác phiên bản không được tự chuyển đổi hoặc xóa. Người chơi phải xác nhận chơi lại để thay thế.
- Họa tiết cốc là minh họa SVG trong dự án, không gán ý nghĩa văn hóa. Không gian thủ công/quán trong truyện là hư cấu; không phải địa chỉ dịch vụ đã xác minh.

## Chạy và kiểm tra (tại thư mục frontend)

```powershell
npm.cmd run test:mini-game
npm.cmd run build
node node_modules/oxlint/bin/oxlint --deny-warnings src/features/mini-game src/pages/HanoiExperiencePage.tsx src/pages/HomePage.tsx tests/mini-game
npm.cmd run dev
```

Chơi tại `/experiences/ha-noi`. Chạy thông thường sử dụng cấu hình API của frontend; gửi câu hỏi có thể gọi LLM thật và phát sinh chi phí.

## QA cô lập, không cần backend/database/API key

```powershell
npm.cmd run dev:mini-game-qa
```

Mở `http://127.0.0.1:15176/__qa`.

- Cấu hình chỉ dành cho QA, buộc API về middleware giả lập cùng origin dù có `.env.local`.
- Không chuyển tiếp bất kỳ đường dẫn `/api/` nào tới backend thật.
- Geo dùng registry thật với định danh tọa độ giả lập: vĩ độ 20–22 trả Hà Nội, còn lại Đà Nẵng. Đây không phải kiểm chứng PostGIS.
- Bản đồ vẫn dùng MapLibre và GeoJSON hiện có; nền QA đơn giản, font có thể tải từ máy chủ demo MapLibre.
- Có nút giả lập AI thành công/lỗi/chậm, save hỏng, ghi storage thất bại và không truy cập được storage.
- “Xóa save QA” chỉ xóa khóa mini-game của origin cổng 15176; không xóa dữ liệu module khác.
- Chế độ lỗi áp dụng toàn server QA, cho tới khi chọn lại “AI giả lập thành công” để về chế độ bình thường.
- Xem `/__qa/requests` để kiểm tra ngữ cảnh và việc không gửi Authorization; không lưu token thật.
- Ảnh QA hỏng phải hiện minh họa dự phòng và vẫn chơi được.
- Không triển khai server QA ra môi trường public. Dừng bằng Ctrl+C sau khi kiểm tra.

## Assistant theo cảnh

- Tái sử dụng endpoint public hiện có `POST /api/v1/assistant/chat` và kiểu ChatRequest, không sửa contract/backend.
- Ngữ cảnh cảnh, giai đoạn và lựa chọn đã chơi được đính kèm trong message. Backend chưa có trường sceneContext có cấu trúc.
- Mỗi lượt game dùng một guest conversation riêng trong bộ nhớ. Không đọc/lưu guest session hoặc lịch sử chat thông thường; không gửi Authorization/cookie.
- Token guest của game chỉ được gửi trong X-Guest-Token cho conversation của chính lượt đó.
- Đóng AI hủy request và bỏ qua phản hồi đến muộn; timeout 30 giây. AI không phát sự kiện gameplay.
- Tải lại trang sẽ mất hội thoại AI nhưng giữ tiến trình game đã lưu. Chơi lại tạo conversation mới.
- Nếu sau này muốn lưu chat game, dùng tài khoản, hoặc bổ sung contract riêng, phối hợp owner Assistant trước.

## Nội dung và nguồn

Nguồn được quản lý tại `src/features/mini-game/content/sources.ts`; nguồn ảnh và quyền sử dụng tại `content/media.ts` và `public/mini-game/hanoi/CREDITS.md`.

- Cục Di sản văn hóa: truyền thuyết Lê Lợi trả gươm và mốc xếp hạng di tích năm 2013.
- Vietnam Tourism: xin phép khi chụp ảnh người khác; thành phần cơ bản của phở/bún chả.
- Truyền thuyết, dữ kiện, khuyến nghị ứng xử và hội thoại hư cấu được phân biệt.
- Không có nguồn/ảnh/URL placeholder trong nội dung chơi hiện tại. Ảnh quán là ảnh minh họa, không khẳng định là quán trong truyện.
- Nhóm vẫn cần duyệt giọng văn và tính phù hợp của trải nghiệm trước nghiệm thu; trạng thái review-ready không thay thế review của nhóm.

## Kết quả kiểm tra ngày 12/11/2026

| Kiểm tra | Kết quả |
| --- | --- |
| Bộ test Node + TypeScript | 113 pass, 0 fail |
| 16 tổ hợp và nhật ký chính xác | Tự động kiểm tra đủ 16 |
| Chặn chọn lại, sai cảnh, tiếp tục sớm, hành động lặp/đến muộn | Pass test lõi |
| Save hỏng/khác phiên bản, mất quyền ghi/đọc, xung đột, restart | Pass test storage/session |
| AI riêng từng lượt, lỗi/timeout, hủy, credential và citation không hợp lệ | Pass test với transport giả lập |
| Typecheck và production build | Pass; cảnh báo chunk lớn của ứng dụng hiện có |
| Lint các file mini-game và trang tích hợp liên quan | Pass |
| Edge, viewport 360×800 và 390×844 | Không tràn ngang ở các cảnh đã kiểm; ảnh tải đúng, nút Bắt đầu cao 48px |
| Chơi trên trình duyệt: sáng câu chuyện → phở → cà phê trò chuyện → nhật ký | Đúng lựa chọn, đúng nguồn và thứ tự |
| Reload kết quả buổi sáng | Giữ màn hình kết quả, không tự chuyển cảnh |
| Hai lối vào | Thẻ Khám phá có liên kết; click Hà Nội trên bản đồ → nút trải nghiệm mở lại cùng nhật ký |
| Hủy chơi lại và xác nhận thay save hỏng | Hủy giữ nhật ký; xác nhận mới thay lượt |
| Storage ghi thất bại | Hiện chưa lưu; vẫn chọn và đọc kết quả trong phiên |
| Ảnh lỗi | Fallback hiển thị, không chặn nội dung |
| AI qua UI với backend giả lập | Thành công, lượt hỏi tiếp dùng guest token riêng, không Authorization; lỗi 503 có thông báo; đóng khi đang chờ giữ nhật ký |

## Cần kiểm chứng trước nghiệm thu cuối

- Điện thoại thật/browser mục tiêu và bản cài nếu nhóm có mobile wrapper: bàn phím, vùng an toàn, đóng/mở app, bộ nhớ và nút Back. Responsive desktop không thay thế bước này.
- Chơi thử có người đọc để đo mục tiêu 3–5 phút, không tính hỏi thêm AI. Chưa xác nhận bằng đo thực tế.
- Với owner Assistant, chạy một lượt E2E có kiểm soát trên backend thật sau khi thống nhất việc dùng API key/chi phí: CORS, guest lifecycle, chất lượng trả lời và nguồn trích dẫn. Lượt triển khai này không gọi LLM thật.
- Smoke test trên môi trường tích hợp khi có bản deploy; QA giả lập không chứng minh cấu hình triển khai hoặc database.
- Kiểm tra thủ công đầy đủ các cảnh ở mobile, nút của tỉnh ngoài Hà Nội, đóng/mở tab mới và chế độ storage bị chặn. Những trường hợp lõi liên quan đã có test tự động; bảng trên chỉ ghi các thao tác UI thực sự đã thực hiện.
