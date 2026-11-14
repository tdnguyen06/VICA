# Mini-game: lớp trải nghiệm nhập vai

Phần trình bày dùng chung cho 11 kịch bản. Không thay đồ thị lựa chọn, ID,
phiên bản kịch bản hoặc định dạng bản lưu hiện có.

## Các phần bổ sung

- Avatar minh họa hư cấu và biểu cảm theo lời thoại, phân biệt vai người chơi và bạn đồng hành.
- Thẻ lựa chọn giữ tên hoạt động, thêm câu nói trong vai người dẫn đường.
- Lời dẫn theo cảnh và ký ức chỉ lấy từ lựa chọn đã thực hiện.
- Lời hẹn cuối ngày xuất hiện sau kết quả cuối; người chơi chủ động ghi vào nhật ký.
- Nhật ký ba chặng có ảnh thật, trích lời nhân vật, phần đọc lại và nguồn hiện có.
- Minh họa số cốc/bưu thiếp cho kết quả đã chọn. Thao tác xem minh họa không tạo
  nhánh mới, không thay lựa chọn, không chặn Tiếp tục; có thể xem lại.
- Hỏi thêm có câu hỏi gợi ý để điền vào ô nhập; chỉ gửi sau khi người chơi bấm Gửi.
- Timeline/hiệu ứng giữ hỗ trợ giảm chuyển động; ảnh nhánh chỉ hiện sau lựa chọn.

## Tích hợp develop

Giao diện dùng các token claymorphism chung. Game vẫn chơi không cần đăng nhập;
Hỏi thêm yêu cầu tài khoản theo chính sách Assistant. Mỗi tài khoản có client và
hội thoại riêng trong lượt, hủy request cũ khi đăng xuất/đổi tài khoản.
Không có nhạc nền trong phiên bản này.

## Nguồn tài nguyên

- Ảnh thật: giữ các metadata/credit hiện có trong `frontend/public/mini-game/`.
- Avatar và vật kỷ niệm: minh họa bằng mã trong component, không dùng ảnh người thật.
- Lời dẫn/lời nói bổ sung: hư cấu, biên tập bằng mã dữ liệu, không sinh bởi LLM.

## Kiểm chứng

Chạy `npm.cmd run test:mini-game`, `npm.cmd run build` trong `frontend`.
Kiểm tra browser: tuyến Hà Nội và tỉnh khác đến nhật ký; mở/đóng AI không đổi lượt;
khách được chơi nhưng cần đăng nhập để hỏi; đăng xuất/đổi tài khoản không giữ hội thoại
cũ hoặc nhận phản hồi đến muộn; ảnh lỗi; reload và chơi lại; bố cục điện thoại và
reduced motion. Kiểm tra bằng browser không thay thế kiểm tra trên điện thoại thật.
