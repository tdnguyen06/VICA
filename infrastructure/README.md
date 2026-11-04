# Vietnam Cultural Atlas - Infrastructure

Thư mục quản lý hạ tầng triển khai và môi trường chạy dịch vụ:

## Cấu trúc
- `docker/`: Chứa các Dockerfile tùy chỉnh (đặc biệt là PostgreSQL tích hợp cả PostGIS và pgvector).
- `nginx/`: Cấu hình Nginx reverse proxy cho production và staging deployment.

## Các dịch vụ hạ tầng
1. **PostgreSQL 16 (PostGIS + pgvector)**: Port 5432
2. **Redis 7**: Port 6379 (Cache & Session)
3. **RabbitMQ 3 Management**: Port 5672 (AMQP) & 15672 (Web UI)
4. **Nginx Reverse Proxy**: Port 80

