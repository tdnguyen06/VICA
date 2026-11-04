# Database Setup - PostgreSQL, PostGIS & pgvector

Tài liệu hướng dẫn cấu hình và thiết lập cơ sở dữ liệu chuyên dụng cho **Vietnam Cultural Atlas**.

---

## 1. Yêu cầu Cốt lõi

Vietnam Cultural Atlas yêu cầu cơ sở dữ liệu tích hợp đồng thời:
1. **PostgreSQL (16.x)**: Hệ quản trị CSDL quan hệ chính.
2. **PostGIS (3.4.x)**: Extension xử lý dữ liệu không gian, polygon biên giới và tọa độ di sản.
3. **pgvector**: Extension xử lý vector embeddings và tìm kiếm tương đồng (similarity search).

> [!IMPORTANT]
> Cần sử dụng image PostgreSQL tích hợp sẵn cả PostGIS và pgvector (xem `infrastructure/docker/postgres/Dockerfile`), không sử dụng image `postgres:latest` tiêu chuẩn vì sẽ thiếu hai extension này.

---

## 2. Khởi chạy bằng Docker Compose

Cách nhanh nhất và chuẩn hóa nhất để chạy môi trường cơ sở dữ liệu:

```bash
# Khởi chạy dịch vụ postgres
docker compose up -d postgres
```

Khi container khởi động lần đầu, file `infrastructure/docker/postgres/init-extensions.sql` sẽ tự động được thực thi để kích hoạt các extension cần thiết.

---

## 3. Flyway Database Migrations

Dự án sử dụng **Flyway** được tích hợp trực tiếp trong Spring Boot Backend.

File migration khởi tạo:
- `backend/src/main/resources/db/migration/V1__init_extensions_and_schema.sql`
- Bản sao lưu trữ: `database/migrations/V1__init_extensions_and_schema.sql`

Nội dung migration:
```sql
-- Kích hoạt extension PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Kích hoạt extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Kích hoạt extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bảng người dùng cơ bản
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'ROLE_USER',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

---

## 4. Xác minh Extension đã hoạt động

Truy cập vào PostgreSQL qua container hoặc công cụ quản trị (DBeaver, pgAdmin, psql):

```sql
-- 1. Liệt kê các extension đã được cài đặt trong database
SELECT extname, extversion FROM pg_extension;

-- 2. Kiểm tra phiên bản PostGIS
SELECT PostGIS_Version();

-- 3. Kiểm tra tính năng pgvector
SELECT '[1,2,3]'::vector;
```

Kết quả mong đợi:
- `postgis` xuất hiện trong bảng `pg_extension` với version 3.4+.
- `vector` xuất hiện trong bảng `pg_extension` với version 0.7+.
- `uuid-ossp` xuất hiện trong bảng `pg_extension`.

