# 🏛️ Vietnam Cultural Atlas - Database Schema

Tài liệu thiết kế chi tiết các bảng thực tế trong cơ sở dữ liệu **PostgreSQL 16 + PostGIS + pgvector** của dự án Vietnam Cultural Atlas (VICA).

---

## 📍 1. BẢNG `cultural_sites` (Di tích văn hóa & Tọa độ GIS 63 tỉnh thành)

### 📌 Khung cấu trúc bảng (Table Schema Definition):

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TABLE: public.cultural_sites                                                                                                    │
├────┬────────────────────┬─────────────────────────┬──────────┬──────────────┬──────────────────┬────────────────────────────────┤
│ #  │ Column Name        │ Data Type               │ Nullable │ Default      │ Key / Index      │ Description                    │
├────┼────────────────────┼─────────────────────────┼──────────┼──────────────┼──────────────────┼────────────────────────────────┤
│ 1  │ id                 │ BIGSERIAL               │ NOT NULL │ nextval(...) │ PRIMARY KEY      │ Mã định danh tự tăng duy nhất  │
│ 2  │ name               │ VARCHAR(255)            │ NOT NULL │              │                  │ Tên di tích / danh thắng       │
│ 3  │ slug               │ VARCHAR(255)            │ NOT NULL │              │ UNIQUE           │ Slug URL SEO thân thiện        │
│ 4  │ category           │ VARCHAR(50)             │ NOT NULL │              │ INDEX (B-Tree)   │ unesco | history | nature | ...│
│ 5  │ category_label     │ VARCHAR(100)            │ NOT NULL │              │                  │ Nhãn hiển thị tiếng Việt       │
│ 6  │ province           │ VARCHAR(100)            │ NOT NULL │              │ INDEX (B-Tree)   │ Tỉnh/thành phố trực thuộc      │
│ 7  │ latitude           │ DOUBLE PRECISION        │ NOT NULL │              │                  │ Vĩ độ (WGS84, 8.5° - 23.5°N)   │
│ 8  │ longitude          │ DOUBLE PRECISION        │ NOT NULL │              │                  │ Kinh độ (WGS84, 102° - 114°E)  │
│ 9  │ description        │ TEXT                    │ NOT NULL │              │                  │ Tóm tắt lịch sử & giá trị      │
│ 10 │ unesco_year        │ INTEGER                 │ NULL     │ NULL         │                  │ Năm UNESCO công nhận           │
│ 11 │ historical_period  │ VARCHAR(100)            │ NULL     │ NULL         │                  │ Niên đại lịch sử               │
│ 12 │ thumbnail_url      │ VARCHAR(500)            │ NULL     │ NULL         │                  │ Link ảnh tư liệu thực tế       │
│ 13 │ color              │ VARCHAR(20)             │ NOT NULL │ '#d97706'    │                  │ Mã màu HEX hiển thị map        │
│ 14 │ featured           │ BOOLEAN                 │ NOT NULL │ FALSE        │                  │ Đánh dấu di tích nổi bật       │
│ 15 │ geom               │ geometry(Point, 4326)   │ NULL     │ NULL         │ INDEX (GiST)     │ Tọa độ không gian PostGIS GIS  │
│ 16 │ created_at         │ TIMESTAMP               │ NOT NULL │ CURRENT_TIME │                  │ Thời điểm tạo bản ghi          │
│ 17 │ updated_at         │ TIMESTAMP               │ NULL     │ NULL         │                  │ Thời điểm cập nhật cuối        │
└────┴────────────────────┴─────────────────────────┴──────────┴──────────────┴──────────────────┴────────────────────────────────┘
```

### 📋 Dữ liệu thực tế mẫu trong Database (Sample Records):

```
┌────┬───────────────────────────────────────────────┬──────────┬───────────────────┬──────────┬───────────┬──────────────────────────────────┐
│ id │ name                                          │ category │ province          │ latitude │ longitude │ historical_period                │
├────┼───────────────────────────────────────────────┼──────────┼───────────────────┼──────────┼───────────┼──────────────────────────────────┤
│ 1  │ Miếu Bà Chúa Xứ Núi Sam & Di chỉ Óc Eo Ba Thê │ festival │ An Giang          │ 10.6698  │ 105.1012  │ Văn hóa Phù Nam (Thế kỷ 1 - 7)   │
│ 2  │ Di tích Lịch sử Nhà tù Côn Đảo & Bạch Dinh    │ history  │ Bà Rịa - Vũng Tàu │ 8.6834   │ 106.6075  │ Thời kỳ Pháp thuộc (1862 - 1975) │
│ 3  │ Chốn tổ Chùa Vĩnh Nghiêm (Mộc bản Kinh Phật)  │ unesco   │ Bắc Giang         │ 21.2185  │ 106.2731  │ Thời Trần (Thế kỷ 13)            │
│ 4  │ Vườn quốc gia Ba Bể (Hồ Ba Bể núi đá vôi)     │ nature   │ Bắc Kạn           │ 22.4083  │ 105.6167  │ Kiến tạo Karst 200 triệu năm     │
│ 23 │ Hoàng thành Thăng Long & Văn Miếu             │ unesco   │ Hà Nội            │ 21.0344  │ 105.8407  │ Thời Lý - Trần - Lê (1010 - 1789)│
│ 46 │ 17 Di sản Non thiêng Yên Tử & Vịnh Hạ Long    │ unesco   │ Quảng Ninh        │ 20.9101  │ 107.1839  │ Thời Trần (Thế kỷ 13 - 14)       │
│ 62 │ Quần đảo Trường Sa (Cột mốc Đảo Trường Sa Lớn)│ history  │ Khánh Hòa         │ 10.0000  │ 114.3000  │ Chủ quyền thiêng liêng liên tục  │
│ 64 │ Quần đảo Hoàng Sa (Bia Chủ quyền Hoàng Sa)    │ history  │ Đà Nẵng           │ 16.5000  │ 112.0000  │ Đội Hoàng Sa kiêm quản thế kỷ 17 │
└────┴───────────────────────────────────────────────┴──────────┴───────────────────┴──────────┴───────────┴──────────────────────────────────┘
```

---

## 👤 2. BẢNG `users` (Tài khoản người dùng & Phân quyền)

### 📌 Khung cấu trúc bảng (Table Schema Definition):

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TABLE: public.users                                                                                                    │
├────┬─────────────┬───────────────────────────┬──────────┬──────────────┬──────────────────┬────────────────────────────┤
│ #  │ Column Name │ Data Type                 │ Nullable │ Default      │ Key / Index      │ Description                │
├────┼─────────────┼───────────────────────────┼──────────┼──────────────┼──────────────────┼────────────────────────────┤
│ 1  │ id          │ BIGSERIAL                 │ NOT NULL │ nextval(...) │ PRIMARY KEY      │ Mã định danh người dùng    │
│ 2  │ username    │ VARCHAR(50)               │ NOT NULL │              │ UNIQUE / INDEX   │ Tên đăng nhập              │
│ 3  │ email       │ VARCHAR(100)              │ NOT NULL │              │ UNIQUE / INDEX   │ Địa chỉ email xác thực     │
│ 4  │ password    │ VARCHAR(255)              │ NOT NULL │              │                  │ Mật khẩu băm (BCrypt Hash) │
│ 5  │ full_name   │ VARCHAR(100)              │ NULL     │ NULL         │                  │ Họ và tên đầy đủ           │
│ 6  │ role        │ VARCHAR(20)               │ NOT NULL │ 'ROLE_USER'  │                  │ Vai trò: ROLE_USER | ADMIN │
│ 7  │ enabled     │ BOOLEAN                   │ NOT NULL │ TRUE         │                  │ Trạng thái kích hoạt       │
│ 8  │ created_at  │ TIMESTAMP                 │ NOT NULL │ CURRENT_TIME │                  │ Thời điểm tạo tài khoản    │
│ 9  │ updated_at  │ TIMESTAMP                 │ NULL     │ NULL         │                  │ Thời điểm cập nhật cuối    │
└────┴─────────────┴───────────────────────────┴──────────┴──────────────┴──────────────────┴────────────────────────────┘
```

---

## 📜 3. BẢNG `flyway_schema_history` (Lịch sử Migration Database)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TABLE: public.flyway_schema_history                                                                                    │
├────┬────────────────┬─────────────┬──────────────────────────────────────────────────────────┬───────────┬─────────────┤
│ #  │ installed_rank │ version     │ description                                              │ script    │ success     │
├────┼────────────────┼─────────────┼──────────────────────────────────────────────────────────┼───────────┼─────────────┤
│ 1  │ 1              │ 1           │ init extensions and schema                               │ V1__...   │ TRUE        │
│ 2  │ 2              │ 2           │ create cultural sites table                              │ V2__...   │ TRUE        │
│ 3  │ 3              │ 3           │ seed all 63 provinces cultural landmarks                 │ V3__...   │ TRUE        │
└────┴────────────────┴─────────────┴──────────────────────────────────────────────────────────┴───────────┴─────────────┘
```

---

## ⚡ 4. BẢNG PHÂN BỐ DỮ LIỆU DI TÍCH (65 Địa danh theo Danh mục)

```
┌──────────────────────────────────────────────┬───────────────┬───────────────────────────────────────────────────────┐
│ Danh mục Di sản (`category`)                 │ Số lượng      │ Các địa phương tiêu biểu                              │
├──────────────────────────────────────────────┼───────────────┼───────────────────────────────────────────────────────┤
│ 🏛️ UNESCO (`unesco`)                         │ 17 di sản     │ Hà Nội, Quảng Ninh, Huế, Quảng Nam, Ninh Bình...      │
│ 🗡️ Lịch sử & Chủ quyền (`history`)           │ 30 di tích    │ Phú Thọ (Đền Hùng), Hoàng Sa, Trường Sa, Bạch Long Vĩ │
│ 🎋 Lễ hội & Văn hóa Phi vật thể (`festival`) │ 11 di sản     │ Đắk Lắk (Cồng chiêng), Bắc Ninh (Quan họ), An Giang   │
│ 🌲 Thiên nhiên & Danh thắng (`nature`)       │ 7 danh thắng  │ Quảng Bình (Phong Nha), Hà Giang (Cao nguyên đá)...   │
├──────────────────────────────────────────────┼───────────────┼───────────────────────────────────────────────────────┤
│ TỔNG CỘNG                                    │ 65 bản ghi    │ ĐỦ 63 TỈNH THÀNH & 2 QUẦN ĐẢO CHỦ QUYỀN               │
└──────────────────────────────────────────────┴───────────────┴───────────────────────────────────────────────────────┘
```
