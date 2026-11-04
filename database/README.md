# Vietnam Cultural Atlas - Database Management

Thư mục quản lý cơ sở dữ liệu cho dự án Vietnam Cultural Atlas:

## Cấu trúc
- `migrations/`: Chứa các file SQL migration được đồng bộ với Flyway của Backend (`db/migration/`).
- `seed/`: Chứa dữ liệu mẫu (seed data) ban đầu về các tỉnh thành, vùng văn hóa, loại hình di sản.

## Công nghệ sử dụng
- **PostgreSQL 16**: Hệ quản trị cơ sở dữ liệu quan hệ chính.
- **PostGIS 3.4**: Không gian địa lý, hỗ trợ lưu trữ geometry, polygon ranh giới, điểm tọa độ di sản và tính toán khoảng cách không gian.
- **pgvector**: Lưu trữ vector embedding từ mô hình AI (như `text-embedding-004`) và thực hiện vector search theo cosine similarity hoặc inner product.

## Kích hoạt Extension thủ công (nếu không dùng Flyway)
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
```

## Kiểm tra extension đã kích hoạt
```sql
SELECT extname, extversion FROM pg_extension;
SELECT PostGIS_Version();
```

