# Environment Variables - Vietnam Cultural Atlas

Tài liệu chi tiết về tất cả các biến môi trường được sử dụng trong toàn bộ hệ thống.

---

## 1. Cấu trúc Quản lý Biến Môi trường

- `.env.example` (Root): Mẫu toàn bộ biến môi trường cho Docker Compose và toàn dự án.
- `backend/.env.example`: Mẫu biến môi trường dành riêng cho Backend Spring Boot.
- `frontend/.env.example`: Mẫu biến môi trường dành riêng cho Frontend Vite (`VITE_*`).

> [!CAUTION]
> Tuyệt đối không commit file `.env` hoặc chứa API Key / mật khẩu thật vào Git repository.

---

## 2. Bảng Danh mục Biến Môi trường

| Tên biến | Mặc định (Dev) | Mục đích | Bắt buộc (Prod) |
| :--- | :--- | :--- | :---: |
| **Cấu hình Server & Runtime** | | | |
| `SERVER_PORT` | `8080` | Cổng HTTP lắng nghe của Backend | Có |
| `FRONTEND_PORT` | `5173` | Cổng phát triển của Frontend | Có |
| `SPRING_PROFILES_ACTIVE` | `dev` | Profile Spring Boot đang chạy (`dev`, `prod`, `test`) | Có |
| **Cơ sở dữ liệu (PostgreSQL + PostGIS + pgvector)** | | | |
| `DB_HOST` | `localhost` | Địa chỉ host của PostgreSQL server | Có |
| `DB_PORT` | `5432` | Cổng kết nối PostgreSQL | Có |
| `DB_NAME` | `vietnam_cultural_atlas` | Tên cơ sở dữ liệu chính | Có |
| `DB_USERNAME` | `postgres` | Tên người dùng CSDL | Có |
| `DB_PASSWORD` | `postgres` | Mật khẩu kết nối CSDL | Có |
| **Redis Cache** | | | |
| `REDIS_HOST` | `localhost` | Địa chỉ host của Redis server | Có |
| `REDIS_PORT` | `6379` | Cổng kết nối Redis | Có |
| `REDIS_PASSWORD` | *(trống)* | Mật khẩu xác thực Redis | Tùy chọn |
| **RabbitMQ Event Bus** | | | |
| `RABBITMQ_HOST` | `localhost` | Địa chỉ host của RabbitMQ server | Có |
| `RABBITMQ_PORT` | `5672` | Cổng giao thức AMQP | Có |
| `RABBITMQ_MANAGEMENT_PORT`| `15672` | Cổng giao diện quản trị Web UI | Không |
| `RABBITMQ_USERNAME` | `guest` | Tài khoản đăng nhập RabbitMQ | Có |
| `RABBITMQ_PASSWORD` | `guest` | Mật khẩu đăng nhập RabbitMQ | Có |
| **Bảo mật & JWT** | | | |
| `JWT_SECRET` | *(chuỗi 32+ bytes)* | Khóa bí mật ký mã hóa JWT token | Có (Tối mật) |
| `JWT_EXPIRATION_MS` | `86400000` | Thời gian sống của JWT token (ms - 24 giờ) | Có |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173...` | Danh sách domain được phép gọi API (CORS) | Có |
| **AI & LLM Services (Spring AI)** | | | |
| `AI_PROVIDER` | `gemini` | Nhà cung cấp AI (`gemini` hoặc `openai`) | Có khi bật AI |
| `AI_API_KEY` | *(trống)* | API Key Gemini hoặc OpenAI | Có khi bật AI |
| `AI_CHAT_MODEL` | `gemini-1.5-flash` | Tên mô hình LLM chính | Có khi bật AI |
| `AI_EMBEDDING_MODEL` | `text-embedding-004` | Tên mô hình vector embedding | Có khi bật AI |
| `AI_ENABLED` | `false` | Bật/tắt tính năng AI trong backend | Có |
| `AI_TOP_K` | `5` | Số lượng kết quả tương đồng trả về tối đa | Không |
| `AI_SIMILARITY_THRESHOLD`| `0.75` | Ngưỡng tương đồng cosine tối thiểu | Không |
| **Dịch vụ Ngoài (External Services)** | | | |
| `CLOUDINARY_CLOUD_NAME` | *(trống)* | Tên cloud Cloudinary lưu ảnh di sản | Có khi upload ảnh |
| `CLOUDINARY_API_KEY` | *(trống)* | API Key Cloudinary | Có khi upload ảnh |
| `CLOUDINARY_API_SECRET` | *(trống)* | API Secret Cloudinary | Có khi upload ảnh |
| `VITE_MAP_STYLE_URL` | *(Carto Positron)* | URL JSON style vector tiles của MapLibre | Không |
| `VITE_API_BASE_URL` | `http://localhost:8080/api/v1` | URL base endpoint API cho frontend gọi | Có |

