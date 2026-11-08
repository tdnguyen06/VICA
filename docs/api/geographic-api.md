# Geographic API v1.0.0

Trạng thái: CHỐT LÀM CHUẨN TRIỂN KHAI bởi Owner Geographic ngày 08/11/2026.
Đây là contract cần triển khai, không phải xác nhận các endpoint đã chạy.
Các module có thể xây dựng DTO, mock và tích hợp theo tài liệu này ngay.

## 1. Phạm vi và bộ dữ liệu

Geographic sở hữu Province, định danh và geometry; Cultural sở hữu nội dung văn hóa.
MVP dùng dataset `vica-demo-63-v1`: 63 địa phương trong snapshot GeoJSON đang có
tại commit `7a10ba9`. Đây là bộ dữ liệu demo theo cách phân chia trong snapshot,
không phải tuyên bố về ranh giới hành chính hiện hành hay độ chính xác pháp lý.

File gốc: `frontend/public/data/vietnam_provinces.geojson`.
SHA-256: `e9d1ade5fe7349356eefceeec11687aa4ed31ed64ba33cb10de209285227cd92`.
Nguồn cung cấp trực tiếp: repository VICA tại commit trên. Nguồn xuất bản ban đầu,
ngày hiệu lực và giấy phép: CHƯA XÁC MINH. Không gán tên nhà cung cấp hoặc giấy phép
phỏng đoán. Cần bổ sung provenance trước khi phân phối bộ ranh giới ra ngoài.
Việc bổ sung nguồn không thay đổi API/định danh; thay bộ ranh giới phải có phiên bản mới.

## 2. Province và registry cố định

`docs/api/provinces-v1.json` là registry chuẩn của 63 Province và mapping feature.
ID là ID nội bộ VICA, KHÔNG phải mã hành chính nhà nước. Các ID đã cấp không được
đổi hoặc tái sử dụng. Slug là khóa tham chiếu liên module, lưu cố định, không sinh
lại từ tên lúc chạy. Không lấy vị trí feature trong GeoJSON làm ID.

| Trường | Kiểu JSON | Quy tắc |
|---|---|---|
| id | integer/int64 | Bắt buộc, dương, cố định theo registry |
| slug | string | Bắt buộc, duy nhất, chữ thường ASCII và dấu gạch nối |
| name | string | Tên hiển thị trong dataset v1, có dấu |
| adminUnit | string | Nhãn hiển thị; không dùng làm khóa hoặc enum |

ProvinceDto chỉ chứa bốn trường trên, tất cả khác null. Ví dụ thật theo registry:

```json
{"id":24,"slug":"ha-noi","name":"Hà Nội","adminUnit":"Thành phố Hà Nội"}
```

Nếu ví dụ và registry khác nhau, registry là nguồn xác định ID. Cultural, RAG và
Assistant truyền `provinceSlug` (giá trị chính là `Province.slug`); nếu lưu thêm
`provinceId`, cặp ID/slug phải cùng một dòng registry. Không tạo Province riêng.
Giữ `thua-thien-hue` và `ho-chi-minh` theo snapshot v1; không tự đổi tên/slug hoặc
gộp địa phương khi nhập nội dung thuộc bộ dữ liệu khác. Dữ liệu chưa map được phải
được báo rõ, không đoán theo tên gần giống. Không có alias ngầm trong v1.

## 3. Endpoint và response thành công

| Method | Endpoint | HTTP | data |
|---|---|---|---|
| GET | /api/v1/geo/provinces | 200 | ProvinceDto[], sắp xếp slug ASCII tăng dần |
| GET | /api/v1/geo/provinces/{slug} | 200 | ProvinceDto |
| POST | /api/v1/geo/identify | 200 | ProvinceDto hoặc null |

Các endpoint cho phép đọc công khai, không cần token; không cung cấp API ghi trong
MVP. List không phân trang. List/detail không trả geometry. Không thêm endpoint
geometry; frontend vẫn tải GeoJSON hiện có và dùng registry để lấy provinceSlug.
Khi chưa import đủ dataset, chưa công bố backend sẵn sàng; lỗi DB không trả list rỗng.

Content-Type: application/json. Dùng `ApiResponse<T>` hiện có:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {"id":24,"slug":"ha-noi","name":"Hà Nội","adminUnit":"Thành phố Hà Nội"},
  "timestamp": "2026-11-08T09:00:00"
}
```

`message` dùng hiển thị, không dùng phân nhánh logic. `timestamp` là chuỗi ISO local
date-time theo ApiResponse hiện có, không có cam kết múi giờ; client không dùng để
so sánh thời gian giữa máy. Với ngoài vùng, giữ nguyên envelope và trả `data: null`.

## 4. Identify và quy tắc không gian

```json
{"latitude":21.0344,"longitude":105.8407}
```

- Hai trường bắt buộc, khác null, là JSON number (không nhận chuỗi, boolean, array).
- Latitude thuộc [-90, 90], longitude thuộc [-180, 180], bao gồm hai đầu mút.
- JSON hỏng, body thiếu/null và dữ liệu sai kiểu trả 400; trường không biết được bỏ qua.
- Request dùng tên latitude/longitude; GeoJSON và ST_MakePoint dùng [longitude, latitude].
- Hệ tọa độ WGS84, SRID 4326; không đảo trục và không tự đổi sang hệ chiếu khác.
- Geometry nhập vào phải là MultiPolygon hợp lệ; Polygon được chuyển MultiPolygon.
  Dữ liệu SRID khác phải xác định CRS nguồn rồi ST_Transform, không chỉ gán SRID.
  Không tự sửa geometry lỗi một cách im lặng; ghi lỗi để kiểm tra.
- Identify dùng ST_Covers(geometry, point), nhận cả điểm trên biên. Nếu nhiều Province
  cùng covers, trả Province có slug ASCII nhỏ nhất, để kết quả ổn định. Đây là quy
  ước kỹ thuật cho demo, không phải kết luận phân định ranh giới.
- Dùng spatial GiST index; truy vấn chọn trên geometry đã chuẩn hóa, không buffer
  hoặc làm tròn tọa độ request. Không snap điểm ngoài vùng vào địa phương gần nhất.
- Không có geometry covers điểm: 200, success=true, data=null. Điều này chỉ có nghĩa
  ngoài vùng dữ liệu có hỗ trợ, không kết luận về lãnh thổ hay chủ quyền.
- Feature `is_sovereignty=true` chỉ là lớp hiển thị, không đưa polygon minh họa đó vào
  spatial lookup. Trường Sa map `khanh-hoa`, Hoàng Sa map `da-nang` khi click feature;
  không tạo Province thứ 64/65. Không suy diễn cả vùng biển bên trong hình vẽ là một Province.
- Một Province có nhiều feature hành chính thật: hợp nhất theo mapping, không nhân bản Province.

## 5. Lỗi

Dùng `ErrorResponse` hiện có, KHÔNG bọc lỗi bằng ApiResponse thành công.

| HTTP | error | Trường hợp |
|---|---|---|
| 400 | Validation Error | Trường thiếu/null/vượt khoảng hoặc sai kiểu request |
| 404 | Not Found | Slug không có trong registry (kể cả slug viết hoa/alias) |
| 500 | Internal Server Error | Lỗi chương trình, truy vấn hoặc DB; không trả data=null |

```json
{
  "status":400,
  "error":"Validation Error",
  "message":"Input validation failed",
  "path":"/api/v1/geo/identify",
  "timestamp":"2026-11-08T09:00:00",
  "details":["latitude must be between -90 and 90"]
}
```

`status`, `error`, `message`, `path`, `timestamp` bắt buộc; `details` là array string
hoặc null. Không cam kết thứ tự details hay nội dung message. Client phân nhánh theo
HTTP status và data. Lỗi 500 phải dùng thông điệp chung, không lộ SQL/stack trace.
Implementation phải xử lý riêng lỗi đọc JSON; handler chung hiện tại chưa đủ cho contract.

## 6. Tích hợp và thay đổi phiên bản

- Map: click feature -> tra registry -> cập nhật currentProvince bằng slug; gọi detail
  khi cần. Click tọa độ -> identify -> cập nhật slug hoặc xóa lựa chọn nếu data=null.
- Cultural: liên kết nội dung bằng provinceSlug chuẩn, giữ nguyên ranh giới sở hữu module.
- RAG: metadata/filter provinceSlug dùng cùng registry.
- Assistant: context.provinceSlug và Geographic Tool dùng cùng slug; xử lý null/404/500 riêng.
- Registry là dữ liệu bàn giao, không phải endpoint mới. Consumers có thể mock ngay.
- Contract v1 đã khóa cho triển khai theo quyết định Owner; không ghi là các thành viên
  khác đã review. Thêm trường optional được phép trong v1.x; consumer bỏ qua trường lạ.
  Đổi kiểu, xóa/đổi tên trường, đổi slug/ID hoặc đổi nghĩa null cần v2 và kế hoạch mapping.

## 7. Điều kiện nghiệm thu

List/detail đúng registry; thiếu slug trả 404; identify trong/ngoài/biên đúng quy tắc;
null, thiếu trường, vượt khoảng, sai kiểu, body hỏng trả 400; DB lỗi trả 500;
65 feature map về 63 Province; lớp hiển thị biển đảo không tham gia identify;
Swagger đúng contract; truy vấn thực tế được kiểm tra bằng EXPLAIN với spatial index.
DTO/validation test không thay thế PostGIS integration test hoặc xác minh geometry.
