# Kiểm chứng phần lõi PostGIS của Geographic

Geographic v1 truy vấn PostGIS trực tiếp bằng `JdbcTemplate`. `Province` là JPA
entity cho thông tin định danh, không ánh xạ cột geometry thành thuộc tính Java.
`ProvinceRepository` không dùng Hibernate để đọc hoặc giải mã geometry.

## Đối chiếu nhận xét review

| Nhận xét | Kết quả đối chiếu code |
|---|---|
| Thiếu `hibernate-spatial` nên không chạy được PostGIS | Dependency này cần khi ánh xạ JTS/Geolatte geometry qua Hibernate. Thiết kế hiện tại dùng JDBC với SQL PostGIS, nên không cần dependency đó để identify. |
| Chưa có migration tạo Geometry | `V4__create_geographic_schema.sql` đã tạo `provinces.boundary geometry(MultiPolygon,4326) NOT NULL`. |
| Chưa có Spatial Index | V4 đã tạo `idx_provinces_boundary ON provinces USING GIST(boundary)`. |
| Vẫn chỉ dùng V1, chưa có lõi GIS | V5 đã seed 63 ranh giới; Repository thực thi `ST_Covers(boundary, ST_SetSRID(ST_MakePoint(?,?),4326))`, với tham số longitude trước latitude. |

V4/V5 đã có từ PR #2 và được merge vào `develop` ở commit `336875a`.
Không tạo migration trùng hoặc sửa checksum của V4/V5 đã áp dụng để xử lý nhận xét này.

Tài liệu Hibernate về phạm vi dependency: [Spatial datatypes – Hibernate ORM 6.5](https://docs.hibernate.org/orm/6.5/introduction/html_single/#spatial-datatypes).
Nếu sau này nhóm chuyển sang thuộc tính `Geometry`/`MultiPolygon` trên entity và
truy vấn qua Hibernate, cần bổ sung `org.hibernate.orm:hibernate-spatial` cùng version
Hibernate Core do Spring Boot quản lý, mapping và integration test tương ứng.

## Khoảng trống được khắc phục

Trước thay đổi này, CI chỉ chạy H2 cho các test ứng dụng/HTTP; bốn test PostGIS
được bật thủ công bằng `VICA_GEO_TEST_JDBC_URL`. Vì vậy một kết quả CI xanh chưa
đủ chứng minh migration và truy vấn không gian đã chạy trên PostGIS thật.

Thay đổi này bổ sung:

- Job `Geographic PostGIS Integration (Java 21)` trong `.github/workflows/ci.yml`.
- Build image database từ Dockerfile của dự án để có cả PostGIS và pgvector;
  chạy database dùng xong bỏ, chờ ready rồi chạy toàn bộ backend tests.
- Chạy `ProvinceRepositoryPostgisTest` để kiểm tra geometry hợp lệ, identify
  trong/ngoài vùng, điểm trên biên, tie-break và `EXPLAIN` sử dụng GiST.
- Thêm `GeographicPostgisHttpTest`: khởi động HTTP server thật với Service,
  Repository, PostgreSQL/PostGIS và Flyway thật, không mock Geographic beans.
- Test mới xác nhận V4/V5 đã áp dụng, `geometry_columns` có MultiPolygon/SRID 4326,
  và `pg_indexes` có GiST index; sau đó gọi HTTP list/detail/identify/400/404.
- Job đọc XML Surefire và thất bại nếu một trong hai spatial suite không chạy,
  bị skip hoặc có failure/error. Database không khởi động được cũng làm job fail.
- Upload test reports kể cả khi thất bại và dọn container sau test.

Các test GIS chỉ nhận URL loopback với database mang tên `vica_geo_test`; credential
trong test là credential cố định của container thử nghiệm, không phải database ứng dụng.

## Chạy lại tại local

Xem `docs/setup/geographic-development.md` để tạo container tạm từ image
`vica-postgres:latest`. Sau khi database ready, tại thư mục backend, dùng JDK 21:

```powershell
$env:VICA_GEO_TEST_JDBC_URL='jdbc:postgresql://127.0.0.1:<port>/vica_geo_test'
.\mvnw.cmd clean test
```

Kết quả cần có hai suite sau chạy thật, không skipped:

| Suite | Số test |
|---|---:|
| `ProvinceRepositoryPostgisTest` | 4 |
| `GeographicPostgisHttpTest` | 4 |

Nếu không cấu hình biến database thử nghiệm, hai suite này bị skip ở local.
Trên job CI mới, biến luôn được cấp và báo cáo XML bắt buộc xác nhận không skip.
H2 không được coi là bằng chứng kiểm chứng GIS.

## Kết quả kiểm chứng ngày 11/11/2026

- Chạy `clean test` bằng JDK 21 trên bản sao code với database PostGIS/pgvector riêng.
- **37 tests, 0 failures, 0 errors, 0 skipped; BUILD SUCCESS.**
- Hai spatial suite đều chạy đủ 4 test/suite. Test HTTP dùng cổng ngẫu nhiên của
  server thật và truy cập database qua PostgreSQL JDBC driver.
- Test đọc metadata xác nhận V4/V5 đã áp dụng, MultiPolygon/SRID 4326 và GiST index;
  test repository xác nhận kế hoạch truy vấn sử dụng index.
- Cấu hình YAML CI và cú pháp Python kiểm tra report đã được kiểm tra tại local.
- Job CI mới chưa chạy trên GitHub cho đến khi thay đổi được commit/push.

## Giới hạn vẫn giữ nguyên

- Dataset demo 63 địa phương có nguồn xuất bản gốc, giấy phép và mốc hiệu lực chưa
  xác minh; các kiểm thử kỹ thuật không thay thế việc xác minh nguồn dữ liệu.
- Tích hợp Province Drawer/Assistant với các thành viên khác vẫn cần tổng duyệt.
- Nội dung này là tài liệu kỹ thuật trong repo; chưa phải phản hồi đã gửi cho reviewer.
