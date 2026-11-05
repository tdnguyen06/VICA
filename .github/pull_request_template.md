### 📌 Tổng quan thay đổi
Pull Request này bổ sung và hoàn thiện toàn diện hệ thống bản đồ số di sản văn hóa Việt Nam: hiển thị đầy đủ 63 tỉnh/thành phố và 2 quần đảo Hoàng Sa - Trường Sa, giải quyết triệt để các vấn đề hiển thị nhãn chữ, vị trí địa lý, tích hợp ảnh di tích thực tế và liên kết không gian quét 3D di sản.

---

### 🚀 Tính năng & Cải tiến mới (feat)
- [x] **Dữ liệu địa lý 63 tỉnh thành & Biển đảo:** Bổ sung `vietnam_provinces.geojson` và `vietnam_province_labels.geojson` với 65 tọa độ tâm nội tiếp độc lập (Polylabel).
- [x] **Chủ quyền biển đảo thiêng liêng:** Tích hợp dữ liệu chi tiết cho Quần đảo Hoàng Sa, Quần đảo Trường Sa, Đảo Bạch Long Vĩ, Côn Đảo, Phú Quốc, Lý Sơn.
- [x] **100% Ảnh tư liệu thực tế:** Thay thế toàn bộ hình ảnh minh họa bằng ảnh chụp thực tế di tích lịch sử, văn hóa từ Wikimedia Commons & Cục Di sản Văn hóa.
- [x] **Liên kết không gian quét 3D thực tế:** Tích hợp liên kết trải nghiệm 3D Tiles / LiDAR / Photogrammetry (Óc Eo – Ba Thê 3D Tiles, Cố đô Huế LiDAR, Văn Miếu 3D, Yên Tử VR360...).
- [x] **Backend Cultural Sites API:** Bổ sung Entity, DTO, Repository, Service, Controller và các migration Flyway V2, V3 với dữ liệu 63 di tích tiêu biểu.

---

### 🛠 Sửa lỗi & Tối ưu hóa giao diện (fix)
- [x] **Xóa bỏ lỗi lặp tên tỉnh ("1 tỉ chữ Quảng Ninh"):** Nhãn chữ được tách biệt hoàn toàn khỏi đa giác đảo và tile bản đồ, mỗi tỉnh chỉ hiển thị đúng 1 nhãn duy nhất tại tâm.
- [x] **Hiển thị đầy đủ mọi tỉnh nhỏ:** Tắt các lớp ẩn ngầm và chữ đen của Carto OSM; cấu hình `text-allow-overlap: true` giúp các tỉnh nhỏ ở Đồng bằng sông Hồng (Nam Định, Ninh Bình, Hưng Yên, Hà Nam, Bắc Ninh...) luôn hiển thị rõ ràng.
- [x] **Nhãn chữ trắng nằm gọn trong ruột tỉnh:** Áp dụng thuật toán Polylabel kết hợp `text-max-width: 4.5em` tự động xuống dòng và viền halo đen `#020617` đậm nét, chữ không bị tràn ra ngoài tỉnh.
- [x] **Sửa lỗi hiển thị ảnh biển đảo:** Khắc phục lỗi 404 và gán đúng ảnh thực tế đặc trưng cho Bạch Long Vĩ, Hoàng Sa, Trường Sa (không bị fallback về Hoàng thành Thăng Long).
- [x] **Loại bỏ tính năng phóng to ảnh (Lightbox):** Tối ưu giao diện thẻ di tích gọn gàng, giảm dung lượng bundle frontend xuống còn 1.53MB.

---

### 🧪 Checklist kiểm thử (Verification)
- [x] `npm run build` ở frontend chạy thành công không có lỗi type/lint (`0 errors`).
- [x] Toàn bộ 63 tỉnh/thành phố và 2 quần đảo đều có nhãn trắng sắc nét, định vị chuẩn xác.
- [x] Click vào vùng đất hoặc tên tỉnh mở đúng thẻ thông tin và ảnh di tích thực tế.
- [x] Click vào Bạch Long Vĩ, Hoàng Sa, Trường Sa hiển thị ảnh di tích chủ quyền chuẩn xác.
- [x] Backend API `/api/cultural-sites` hoạt động ổn định với cơ sở dữ liệu PostgreSQL / PostGIS.
