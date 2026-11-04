# Hướng Dẫn Setup & Phát Triển Local Trên Windows

Tài liệu chi tiết hướng dẫn lập trình viên khởi động và chạy toàn bộ dự án **Vietnam Cultural Atlas** trên hệ điều hành Windows.

---

## 1. Yêu cầu Tiên quyết (Prerequisites)

| Công cụ | Phiên bản yêu cầu | Trạng thái kiểm tra trên máy |
| :--- | :--- | :--- |
| **Hệ điều hành** | Windows 10/11 64-bit | Đã xác nhận (Windows 10.0.19045) |
| **Java** | OpenJDK 21 LTS | Đã cài đặt (`jdk-21.0.11` tại `C:\Program Files\Java\jdk-21.0.11`) |
| **Maven** | Apache Maven 3.9+ | Đã tích hợp sẵn Maven Wrapper (`.\mvnw.cmd`) |
| **Node.js** | v20.x hoặc v24.x | Đã cài đặt (v24.15.0) |
| **npm** | 10.x hoặc 11.x | Đã cài đặt (11.12.1) |
| **Git** | 2.40+ | Đã cài đặt (2.52.0.windows.1) |
| **Docker Desktop**| Docker 20.10+ / Compose v2 | Đã cài đặt, cần khởi động ứng dụng Docker Desktop |

---

## 2. Các Bước Khởi Động Từng Phần

### Bước 1: Khởi động Hạ tầng Docker (PostgreSQL, Redis, RabbitMQ)

1. Mở ứng dụng **Docker Desktop** từ Start Menu hoặc Desktop và chờ Docker chuyển sang trạng thái xanh (Engine running).
2. Mở PowerShell tại thư mục gốc dự án (`d:\VICA`) và chạy:

```powershell
# Sao chép cấu hình mẫu nếu chưa có
Copy-Item .env.example .env

# Khởi động các dịch vụ hạ tầng
docker compose up -d postgres redis rabbitmq
```

> [!NOTE]
> Nếu máy tính đã có service PostgreSQL của Windows đang chiếm cổng `5432`, bạn có thể đổi `DB_PORT=5434` trong file `.env` để tránh xung đột cổng.

### Bước 2: Chạy Backend Spring Boot

Mở một cửa sổ PowerShell mới:

```powershell
cd d:\VICA\backend

# Chạy kiểm thử tự động
.\mvnw.cmd test

# Khởi chạy ứng dụng Spring Boot
.\mvnw.cmd spring-boot:run
```

- Backend sẽ khởi động tại: `http://localhost:8080`
- API Health Check: `http://localhost:8080/api/v1/health`
- Swagger UI / OpenAPI Docs: `http://localhost:8080/swagger-ui.html`

### Bước 3: Chạy Frontend Vite React

Mở một cửa sổ PowerShell thứ hai:

```powershell
cd d:\VICA\frontend

# Khởi chạy Vite Dev Server
npm run dev
```

- Frontend sẽ chạy tại: `http://localhost:5173`
- Truy cập trình duyệt để trải nghiệm:
  - Bản đồ văn hóa MapLibre GL JS tương tác (marker Hà Nội & TP. Hồ Chí Minh).
  - Thẻ kiểm tra kết nối thời gian thực đến Backend API qua TanStack React Query & Axios.

---

## 3. Cách Dừng Môi Trường

```powershell
# Dừng các container hạ tầng
docker compose down

# Dừng và xóa toàn bộ dữ liệu volume (khi muốn reset sạch sẽ)
docker compose down -v
```

---

## 4. Khắc phục Sự cố Thường gặp trên Windows

### Lỗi: `docker: error during connect ... open //./pipe/docker_engine: The system cannot find the file specified`
- **Nguyên nhân**: Docker Desktop chưa được mở hoặc engine WSL2 đang khởi động.
- **Cách xử lý**: Tìm kiếm "Docker Desktop" trong Windows Start Menu, bấm chuột mở ứng dụng và chờ khoảng 30-45 giây cho icon Docker trên thanh taskbar chuyển sang màu xanh ổn định.

### Lỗi: `Bind for 0.0.0.0:5432 failed: port is already allocated`
- **Nguyên nhân**: Dịch vụ Windows PostgreSQL cục bộ (`postgresql-x64-16` hoặc `18`) đang chiếm cổng 5432.
- **Cách xử lý**:
  - Cách 1: Tạm dừng service Windows: `Stop-Service postgresql-x64-16` trong PowerShell Administrator.
  - Cách 2 (Khuyến nghị): Đổi cổng `DB_PORT=5434` trong file `.env` của dự án và `backend/.env`.

