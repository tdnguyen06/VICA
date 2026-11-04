# Vietnam Cultural Atlas (VICA) 🇻🇳

Nền tảng bản đồ số tương tác giúp người dùng khám phá văn hóa, di sản, lịch sử và địa lý Việt Nam thông qua không gian GIS và trí tuệ nhân tạo (AI).

---

## 🏛️ Giới Thiệu Dự Án

**Vietnam Cultural Atlas** tích hợp toàn diện dữ liệu văn hóa 63 tỉnh thành:
- **Di sản & Di tích**: Di sản thế giới UNESCO, di tích lịch sử quốc gia, danh lam thắng cảnh.
- **Ẩm thực địa phương**: Văn hóa ẩm thực 3 miền Bắc - Trung - Nam.
- **Lễ hội & Phong tục**: Lễ hội cổ truyền, phong tục tập quán các vùng miền.
- **Dân tộc & Cộng đồng**: Bản đồ cư trú và đặc trưng văn hóa 54 dân tộc anh em.
- **Làng nghề truyền thống**: Gốm Bát Tràng, lụa Vạn Phúc, đúc đồng Đông Sơn, v.v.
- **Định hướng AI**: LLM Assistant, RAG trên kho tư liệu số, Vector Search (pgvector), Knowledge Graph và Spatial Intelligence.

---

## 🛠️ Phân Loại Thành Phần Hệ Thống

| Nhóm thành phần | Chi tiết công nghệ | Hình thức vận hành |
| :--- | :--- | :--- |
| **Cần cài đặt trên máy Host** | Java 21 LTS, Node.js (v20+ hoặc v24+), Git, Docker Desktop | Công cụ nền tảng hệ điều hành |
| **Chạy bằng Docker Containers** | PostgreSQL 16 (PostGIS 3.4 + pgvector), Redis 7, RabbitMQ 3 | Quản lý qua `docker compose` |
| **Thư viện Backend** | Spring Boot 3.3.5, Spring Data JPA, Spring Security, JWT, Flyway, Spring AI core | Quản lý qua Maven Wrapper (`pom.xml`) |
| **Thư viện Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, MapLibre GL JS, Zustand, TanStack Query, Axios | Quản lý qua npm (`package.json`) |
| **Cần tài khoản / API Key** | Google Gemini API (hoặc OpenAI API), Cloudinary, Map Tiles Provider (Carto/MapTiler) | Cung cấp qua biến môi trường `.env` |

---

## 📁 Cấu Trúc Thư Mục Dự Án (Monorepo)

```
vietnam-cultural-atlas/
│
├── frontend/                       # Client SPA (React 19 + TypeScript + Vite + Tailwind v4)
│   ├── src/
│   │   ├── assets/                 # Hình ảnh, biểu tượng tĩnh
│   │   ├── components/             # Reusable UI & MapViewer (MapLibre GL JS)
│   │   ├── layouts/                # MainLayout với Header & Navigation
│   │   ├── pages/                  # HomePage kiểm tra kết nối API & bản đồ
│   │   ├── routes/                 # AppRoutes điều hướng React Router
│   │   ├── services/               # Axios apiClient & healthService
│   │   ├── stores/                 # Zustand store (quản lý viewport bản đồ)
│   │   ├── hooks/                  # TanStack React Query hooks (useHealth)
│   │   ├── types/                  # TypeScript interface định nghĩa dữ liệu
│   │   └── utils/                  # Formatters & helper functions
│   ├── .env.example
│   └── package.json
│
├── backend/                        # Modular Monolith (Java 21 + Spring Boot 3.3.5)
│   ├── src/main/java/com/culturalatlas/
│   │   ├── config/                 # SecurityConfig, CorsConfig, OpenApiConfig, RedisConfig
│   │   ├── common/                 # ApiResponse, GlobalExceptionHandler, HealthController
│   │   ├── auth/                   # JwtTokenProvider & auth boundaries
│   │   ├── user/                   # User entity, Role, UserRepository
│   │   ├── geography/              # GIS boundary, PostGIS spatial mapping
│   │   ├── culture/                # Intangible cultural heritage, ethnic groups
│   │   ├── heritage/               # UNESCO & national historic monuments
│   │   ├── document/               # Historical records & Cloudinary assets
│   │   ├── ai/                     # Spring AI dynamic provider configuration
│   │   ├── recommendation/         # Spatial + Vector recommendations
│   │   └── journey/                # Heritage trails & cultural tours
│   ├── src/main/resources/
│   │   ├── application.yml         # Cấu hình chung
│   │   ├── application-dev.yml     # Cấu hình môi trường dev (Postgres, Flyway, Redis)
│   │   ├── application-prod.yml    # Cấu hình môi trường production
│   │   └── db/migration/           # Flyway migration V1 (PostGIS, pgvector, users)
│   ├── src/test/                   # CulturalAtlasApplicationTests (H2 in-memory)
│   ├── .env.example
│   └── pom.xml
│
├── database/                       # Tài liệu CSDL & script migration
│   ├── migrations/                 # Bản sao lưu V1__init_extensions_and_schema.sql
│   ├── seed/                       # Dữ liệu khởi tạo vùng miền & di sản
│   └── README.md
│
├── infrastructure/                 # Hạ tầng triển khai
│   ├── docker/postgres/            # Dockerfile PostgreSQL 16 + PostGIS + pgvector
│   ├── nginx/                      # Cấu hình Nginx Reverse Proxy
│   └── README.md
│
├── docs/                           # Tài liệu kỹ thuật chi tiết
│   ├── architecture/               # system-architecture.md
│   ├── database/                   # database-setup.md
│   ├── setup/                      # local-development.md, environment-variables.md, verification-report.md
│   └── api/
│
├── .github/workflows/              # GitHub Actions CI workflow (Java 21 & Node 20)
├── docker-compose.yml              # Quản lý cụm dịch vụ Postgres, Redis, RabbitMQ
├── .gitignore
├── .env.example
└── README.md
```

---

## 🚀 Hướng Dẫn Khởi Động Nhanh

### 1. Chuẩn bị biến môi trường
```bash
# Tạo file .env từ file mẫu
cp .env.example .env
```

### 2. Khởi động các dịch vụ phụ trợ (Docker)
Mở ứng dụng Docker Desktop, sau đó chạy:
```bash
docker compose up -d postgres redis rabbitmq
```

### 3. Khởi động Backend (Spring Boot 3.3.5)
```bash
cd backend
# Chạy test xác minh
./mvnw clean test

# Chạy backend local
./mvnw spring-boot:run
```
- API Base URL: `http://localhost:8080/api/v1`
- Kiểm tra Health: `http://localhost:8080/api/v1/health`
- Swagger UI tài liệu API: `http://localhost:8080/swagger-ui.html`

### 4. Khởi động Frontend (React 19 + Vite)
```bash
cd frontend
npm install
npm run dev
```
- Giao diện web: `http://localhost:5173`

---

## 🛑 Cách Dừng Dịch Vụ

```bash
# Dừng cụm container
docker compose down

# Dừng và xóa volumes
docker compose down -v
```

---

## 🔍 Kiểm Tra Từng Dịch Vụ

- **Frontend**: Mở `http://localhost:5173`, thấy bản đồ MapLibre tương tác và trạng thái backend hiển thị UP màu xanh lá.
- **Backend API**: Gọi `curl http://localhost:8080/api/v1/health` trả về HTTP 200:
  ```json
  {
    "success": true,
    "message": "Vietnam Cultural Atlas API is operational",
    "data": {
      "app": "vietnam-cultural-atlas",
      "environment": "dev",
      "version": "1.0.0",
      "status": "UP"
    }
  }
  ```
- **PostgreSQL Extension**:
  ```sql
  SELECT extname FROM pg_extension;
  -- Kết quả phải có: postgis, vector, uuid-ossp, plpgsql
  ```
- **Redis**: Chạy lệnh `docker exec -it vica-redis redis-cli ping` (trả về `PONG`).
- **RabbitMQ**: Truy cập giao diện quản trị `http://localhost:15672` (User: `guest` / Pass: `guest`).

---

## 📚 Tài Liệu Bổ Sung

- [Kiến trúc hệ thống chi tiết](docs/architecture/system-architecture.md)
- [Hướng dẫn cài đặt trên Windows](docs/setup/local-development.md)
- [Thiết lập Database & Extensions](docs/database/database-setup.md)
- [Bảng biến môi trường](docs/setup/environment-variables.md)
- [Báo cáo xác minh thực tế](docs/setup/verification-report.md)

