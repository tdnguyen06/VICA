# Geographic API

Trạng thái: Draft — đề xuất để nhóm review, chưa triển khai.

## 1. Phạm vi

Module Geographic quản lý danh tính địa phương và ranh giới địa lý.
Cung cấp API danh sách, chi tiết và xác định địa phương theo tọa độ.

Nội dung văn hóa, landmark và ảnh thuộc module Cultural.

## 2. Dữ liệu Province đề xuất

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| id | số nguyên 64 bit | Khóa chính, không đổi sau khi tạo |
| slug | chuỗi, duy nhất | Định danh dùng trong URL, ví dụ ha-noi |
| name | chuỗi | Tên hiển thị tiếng Việt |
| adminUnit | chuỗi | Nhãn đơn vị hành chính để hiển thị |

Slug được lưu cố định, không tự tính lại từ tên mỗi lần gọi API.
Các module khác tham chiếu cùng id/slug do Geographic cung cấp.

Ranh giới dự kiến lưu bằng PostGIS với SRID 4326.
Phải kiểm tra nguồn, phiên bản và geometry trước khi import.

## 3. API đề xuất

Dùng ApiResponse<T> hiện có của backend để bao kết quả.

| Method | Endpoint | data khi thành công |
|---|---|---|
| GET | /api/v1/geo/provinces | Mảng Province |
| GET | /api/v1/geo/provinces/{slug} | Một Province |
| POST | /api/v1/geo/identify | Một Province hoặc null |

Ví dụ Province trong data:

```json
{
  "id": 1,
  "slug": "ha-noi",
  "name": "Hà Nội",
  "adminUnit": "Thành phố Hà Nội"
}
```

ID trên chỉ để minh họa, chưa phải ID đã cấp trong database.
API danh sách và chi tiết chưa trả toàn bộ geometry.

Request identify:

```json
{
  "latitude": 21.0344,
  "longitude": 105.8407
}
```

## 4. Trạng thái và kiểm tra đầu vào

- Danh sách: HTTP 200; sắp xếp theo slug tăng dần.
- Chi tiết: HTTP 404 nếu slug không tồn tại.
- Identify: latitude trong [-90, 90], longitude trong [-180, 180].
- Thiếu tọa độ hoặc tọa độ không hợp lệ: HTTP 400.
- Tọa độ hợp lệ nhưng ngoài vùng dữ liệu: HTTP 200, data = null.
- Lỗi backend/database không được chuyển thành kết quả ngoài vùng.

## 5. Các quyết định còn cần chốt

- Bộ ranh giới và mốc hành chính sử dụng.
- Nguồn dữ liệu, quyền sử dụng và phiên bản.
- Danh sách id/slug dùng chung và cách ánh xạ dữ liệu hiện có.
- Cách mô hình hóa các feature biển đảo trong GeoJSON hiện tại.
- Cách trả kết quả khi tọa độ thuộc ranh giới chung nhiều địa phương.

Không mặc định bộ dữ liệu hiện có là ranh giới hành chính hiện hành.