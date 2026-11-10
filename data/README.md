# VICA Data Ingestion - 2-Stage Pipeline to AWS S3 🇻🇳

Module thu thập dữ liệu văn hóa, di sản, lịch sử, ẩm thực Việt Nam theo mô hình **2 giai đoạn**:
1. **Giai đoạn 1 (Seed Lists)**: Thu thập danh sách thực thể hạt nhân từ các nguồn liệt kê danh mục chính thống.
2. **Giai đoạn 2 (Wiki Deep Dive)**: Dùng Wikipedia API chính thức để đào sâu toàn văn, lịch sử, kiến trúc, văn hóa và tọa độ GIS.
3. **Giai đoạn 3 (S3 Stream)**: Ghép metadata và toàn văn thành Markdown chuẩn Spring AI RAG, bắn trực tiếp từ RAM lên AWS S3.

---

## 🌟 Nguyên Tắc: Zero Local Storage

- **100% In-Memory Streaming**: Không tạo bất kỳ file tạm nào trên ổ cứng máy tính.
- **Không cần Redis / Celery / Scrapy**: Kiến trúc tinh gọn, dễ mở rộng, kiểm soát 100% bằng Python thuần.

---

## 📁 Cấu Trúc File Trong `data/`

```
data/
├── 📄 seed_sources.py     # Giai đoạn 1: Bóc danh sách hạt nhân (UNESCO, Di tích, Ẩm thực, Lễ hội, Dân tộc...)
├── 📄 pipeline.py         # Giai đoạn 2 & 3: Soi kĩ Wikipedia -> Bắn thẳng Markdown lên AWS S3
├── 📄 requirements.txt    # requests, beautifulsoup4, boto3, python-dotenv
├── 📄 source.yml          # Danh mục các nguồn dữ liệu tham khảo
└── 📂 scripts/
    └── s3_uploader.py     # Tiện ích S3 upload độc lập (RAM -> S3)
```

---

## 🚀 Cách Chạy Pipeline

Chỉ cần 1 lệnh duy nhất:

```powershell
python data/pipeline.py
```

### Kết quả trên AWS S3 (`vica-537390611425-ap-southeast-1-an`):
- `processed/heritage/unesco/<slug>.md`
- `processed/heritage/national_monument/<slug>.md`
- `processed/cuisine/traditional_dish/<slug>.md`
- `processed/culture/festivals/<slug>.md`
- `processed/culture/ethnic_groups/<slug>.md`
- `processed/culture/craft_villages/<slug>.md`

Mỗi file Markdown đều có sẵn:
- Tiêu đề & Tóm tắt trích xuất
- Khối metadata (Tên, Địa phương, Năm công nhận, Thời gian, Tọa độ GIS)
- Toàn văn nội dung chi tiết & Lịch sử văn hóa
