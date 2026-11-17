# Phát triển và kiểm tra Geographic v1

Geographic hiện có ba endpoint theo `docs/api/geographic-api.md`: list, detail và
identify. Controller nhận request; Service xử lý kết quả; Repository truy vấn
PostGIS bằng JDBC. `Province` ánh xạ phần định danh với JPA; geometry chỉ được
truy vấn trong Repository, không đi vào DTO hoặc các module khác.

## Dữ liệu và migration

- V4 tạo `geographic_datasets`, `provinces` và GiST index.
- V5 nạp 63 địa phương đúng registry và snapshot đã khóa SHA-256.
- Geometry là MultiPolygon SRID 4326; ràng buộc DB chặn geometry rỗng, lỗi hoặc
  vượt giới hạn tọa độ. Không có bước tự sửa geometry.
- Hai feature minh họa Hoàng Sa/Trường Sa không tham gia spatial lookup. Khi chọn
  các feature/marker đó, frontend lấy detail của Đà Nẵng/Khánh Hòa theo mapping.
- Nguồn xuất bản gốc và giấy phép vẫn ghi UNVERIFIED; xem giới hạn dataset trong contract.
- Backend Flyway dùng bản trong `backend/src/main/resources/db/migration`; bản
  `database/migrations` được giữ giống nhau để đọc và tham chiếu. Không chạy lại
  các SQL bằng tay trên database đã được Flyway quản lý.

Khi khởi động backend ở profile dev, Flyway sẽ áp dụng migration chưa chạy trên
database được cấu hình. Việc đưa file migration vào repo chưa đồng nghĩa database
local của bạn đã được cập nhật. Kiểm tra đúng database và sao lưu theo quy trình nhóm
trước khi khởi động bản mới trên database dùng chung.

Registry gốc là `docs/api/provinces-v1.json`; frontend dùng bản sao byte-identical
trong `frontend/src/data`. Script sau tạo lại V5 ở cả hai nơi và đồng bộ registry
frontend từ file gốc, không kết nối database:

```powershell
.\scripts\geo\Build-GeographicSeed.ps1
```

Sau khi một migration đã được áp dụng, không thay đổi file/checksum của migration
đó. Thay dataset cần phiên bản và migration mới; script sẽ từ chối nguồn khác SHA đã khóa.

## Chạy và thử API

Dùng JDK 21, cấu hình database theo tài liệu local-development hiện có. Frontend
mặc định chạy cổng 5173, proxy `/api` tới backend 8080; CORS cho phép các origin đó.
Nếu đổi cổng frontend, thêm origin tương ứng qua `CORS_ALLOWED_ORIGINS` ở backend.

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/geo/provinces
Invoke-RestMethod http://localhost:8080/api/v1/geo/provinces/ha-noi
Invoke-RestMethod http://localhost:8080/api/v1/geo/identify -Method Post -ContentType 'application/json' -Body '{"latitude":21.0344,"longitude":105.8407}'
```

Mở Swagger tại `/swagger-ui.html`. Latitude=100 phải trả 400; (0,0) phải trả 200
với data=null; slug không có phải trả 404. Request tọa độ dùng JSON number, không
dùng chuỗi như `"21.0344"`. Lỗi DB phải trả 500 với thông điệp chung.

Frontend: click polygon gọi identify; click label/marker có mapping gọi detail.
Kết quả cập nhật `currentProvince` bằng slug và viền vàng của địa phương. Request
cũ bị hủy khi chọn điểm mới; lỗi/outside xóa context cũ. Province Drawer và Assistant
có thể đọc `useAppStore(state => state.currentProvince)`; UI của hai module đó chưa
được xây dựng trong thay đổi Geographic này. Thẻ văn hóa sẵn có vẫn dùng dữ liệu
preview cũ; chỉ giữ preview khi nó khớp địa phương đã chọn.

## Kiểm thử

Tại thư mục backend với JDK 21:

```powershell
.\mvnw.cmd test
```

Test mặc định kiểm tra validation, HTTP, security public access, 404 và lỗi DB giả
lập. `ProvinceRepositoryPostgisTest` tự bỏ qua nếu không có biến môi trường bên dưới;
H2 không được dùng thay PostGIS để xác minh ST_Covers. `GeographicPostgisHttpTest`
cũng dùng cùng biến môi trường để kiểm tra HTTP server, Flyway và PostGIS thật.
Xem `docs/api/geographic-implementation-review.md` về lựa chọn JDBC và phạm vi
cần Hibernate Spatial. Job CI `Geographic PostGIS Integration (Java 21)` sẽ cấp
database riêng và bắt buộc hai spatial suite chạy, không được skip.

Để kiểm tra spatial, tạo container tạm riêng từ image PostGIS + pgvector của dự án:

```powershell
docker run --rm -d --name vica-geo-test -e POSTGRES_PASSWORD=vica_geo_test_only -e POSTGRES_DB=vica_geo_test -p 127.0.0.1::5432 vica-postgres:latest
docker port vica-geo-test 5432
```

Chờ `pg_isready` thành công, rồi thay `<port>` bằng cổng Docker vừa báo:

```powershell
$env:VICA_GEO_TEST_JDBC_URL='jdbc:postgresql://127.0.0.1:<port>/vica_geo_test'
.\mvnw.cmd test
Remove-Item Env:VICA_GEO_TEST_JDBC_URL
docker stop vica-geo-test
```

Tên database và credential trong test chỉ dành cho container dùng xong bỏ.
Không trỏ biến này vào database ứng dụng. Test chạy migration thật, xác minh 63
geometry, Hà Nội, ngoài vùng, biên chung, tie-break và kế hoạch truy vấn dùng GiST.

## Phạm vi đã kiểm tra trong lần triển khai

- Toàn bộ backend sau bổ sung kiểm chứng GIS: 37 test pass, gồm 8 test repository/HTTP
  chạy với PostGIS thật trong container riêng, không skipped.
- Audit 63 geometry: tất cả ST_IsValid=true; không sửa geometry nguồn.
- Frontend: TypeScript và build production; chọn địa phương, highlight và ngoài vùng
  được kiểm tra trong browser với backend/database thử nghiệm.
- Không commit/push hoặc áp dụng migration vào database VICA hiện có.
