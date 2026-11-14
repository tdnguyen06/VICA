# Kết nối app với RAG server

Tài liệu cho thành viên frontend: chạy app trên máy cá nhân để thử RAG server đang chạy trên EC2, sau đó đổi sang URL production khi app được đưa lên web.

## 1. URL và endpoint

RAG server hiện được Caddy expose trực tiếp dưới `/rag`; URL **không có** tiền tố `/api/v1`. Vì `frontend/src/services/apiClient.ts` đang dùng base URL `/api/v1`, hãy tạo client riêng cho RAG thay vì dùng `apiClient` hiện tại.

| Việc cần làm | Method và path | Kết quả |
| --- | --- | --- |
| Hỏi đáp kèm ảnh | `POST /rag/query/with-images` | JSON gồm câu trả lời, ảnh liên quan và nguồn trả lời |
| Hỏi đáp cũ | `POST /rag/query/routing` | Chuỗi câu trả lời thuần |
| Tìm ảnh theo câu hỏi | `POST /rag/images` | Danh sách ảnh liên quan |
| Lấy ảnh theo entity | `GET /rag/images/{entityId}` | Danh sách ảnh của entity |

Nên dùng `/rag/query/with-images` cho giao diện chat mới. `answerSource` là `rag` khi có ngữ cảnh phù hợp trong pgvector; nếu không, server trả lời bằng kiến thức chung của mô hình và đặt `answerSource` thành `llm_general_knowledge`. Ảnh trong response được lấy từ các tài liệu RAG phù hợp; khi fallback kiến thức chung không có ảnh RAG để đính kèm.

## 2. Chạy app local và gọi EC2

### Cấu hình địa chỉ RAG trong frontend

Tạo hoặc sửa `frontend/.env.local`:

```dotenv
VITE_RAG_BASE_URL=http://<EC2_PUBLIC_IP>
```

Ví dụ nếu RAG server chạy trên `203.0.113.10`, đặt `VITE_RAG_BASE_URL=http://203.0.113.10`. Không thêm `/rag` hoặc `/api/v1` vào giá trị này. Nếu đã cấu hình domain HTTPS cho RAG, dùng `https://rag.example.com`.

Sau khi sửa biến Vite, khởi động lại dev server của frontend để Vite nạp giá trị mới. `.env.local` chỉ dùng trên máy phát triển; đừng commit file này.

### Cho phép origin của frontend trên EC2

Frontend Vite mặc định chạy tại `http://localhost:5173`. Trên EC2, sửa `.env` của RAG:

```dotenv
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Origin phải khớp chính xác gồm scheme, hostname và port, không có dấu `/` cuối. Nếu app thực tế chạy ở port khác, dùng origin đó. Có thể khai báo nhiều origin bằng dấu phẩy, ví dụ `http://localhost:5173,http://localhost:3000`.

Áp dụng cấu hình trên EC2:

```bash
cd /home/ec2-user/llm-apps-java-spring-ai/rag/rag-conditional
nano .env
chmod 600 .env
sudo docker compose up -d --force-recreate app
sudo docker compose logs -f app
```

Lệnh trên chỉ tạo lại app container; nó không build lại image. Nếu vừa cập nhật mã nguồn, trước đó hãy cập nhật repo và dùng `sudo docker compose up -d --build app`.

Đảm bảo EC2 Security Group cho phép frontend/người thử truy cập cổng HTTP 80. Nếu gọi từ trình duyệt và thiếu CORS, kiểm tra `CORS_ALLOWED_ORIGINS`, rồi xem log và request trong DevTools. CORS chỉ áp dụng cho trình duyệt; lệnh `curl` không kiểm tra CORS.

## 3. Client TypeScript mẫu

Tạo `frontend/src/services/ragService.ts`:

```ts
export interface RagImage {
  entityId: string;
  name: string;
  url: string;
  license: string;
  author: string;
  sourcePage: string;
}

export interface RagAnswer {
  answer: string;
  images: RagImage[];
  answerSource: 'rag' | 'llm_general_knowledge';
}

const ragBaseUrl = (import.meta.env.VITE_RAG_BASE_URL ?? '').replace(/\/+$/, '');

export async function askRag(question: string, placeId?: string): Promise<RagAnswer> {
  const response = await fetch(`${ragBaseUrl}/rag/query/with-images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, placeId: placeId ?? null }),
  });

  if (!response.ok) {
    throw new Error(`RAG request failed (${response.status}): ${await response.text()}`);
  }
  return response.json() as Promise<RagAnswer>;
}
```

Gọi hàm trong component:

```ts
const result = await askRag(question, selectedEntityId);
setAnswer(result.answer);
setImages(result.images);
setAnswerSource(result.answerSource);
```

Hiển thị ảnh bằng `image.url`; giữ thông tin `license`, `author` và `sourcePage` trong UI để người dùng biết nguồn/giấy phép ảnh. Nếu `images` rỗng thì chỉ hiển thị câu trả lời. Có thể dùng `answerSource` để hiện nhãn “Từ kho dữ liệu” hoặc “Kiến thức chung của AI”.

## 4. Kiểm tra kết nối bằng curl

Từ máy đang chạy frontend, thử trước endpoint health và API hỏi đáp:

```bash
curl -i http://<EC2_PUBLIC_IP>/actuator/health

curl -sS -X POST http://<EC2_PUBLIC_IP>/rag/query/with-images \
  -H 'Content-Type: application/json' \
  -d '{"question":"Giới thiệu về Hoàng thành Thăng Long"}'
```

Response hỏi đáp có dạng:

```json
{
  "answer": "...",
  "images": [
    {
      "entityId": "...",
      "name": "...",
      "url": "https://...",
      "license": "...",
      "author": "...",
      "sourcePage": "https://..."
    }
  ],
  "answerSource": "rag"
}
```

`placeId` là tùy chọn; nếu app đang ở trang entity, truyền đúng `entity_id` để giới hạn kết quả theo entity đó.

## 5. Khi frontend được deploy lên web

Khuyến nghị dùng subdomain HTTPS riêng cho RAG, ví dụ `rag.example.com`:

1. Trỏ DNS `rag.example.com` về public IP của EC2.
2. Trên EC2, đặt `SITE_ADDRESS=rag.example.com` trong `.env`; Caddy hiện được cấu hình để cấp HTTPS tự động khi domain trỏ đúng và cổng 80/443 truy cập được.
3. Đặt `CORS_ALLOWED_ORIGINS=https://app.example.com` (thêm các origin production hợp lệ khác nếu cần).
4. Áp dụng cấu hình: `sudo docker compose up -d --force-recreate app caddy`.
5. Trong cấu hình build frontend production, đặt `VITE_RAG_BASE_URL=https://rag.example.com`, rồi build/deploy frontend.

Nếu app và RAG được đặt cùng origin, hạ tầng web phải proxy đường dẫn `/rag/*` tới RAG server; Caddy hiện tại chỉ phục vụ RAG và health check, không phục vụ frontend hay API `/api/v1`.

## Bảo vệ API

Các route `/rag/**` hiện chưa yêu cầu đăng nhập. CORS không phải cơ chế xác thực; khi RAG server được mở công khai, bất kỳ client nào cũng có thể gọi API và phát sinh chi phí OpenAI. Trước khi public rộng rãi, cần đặt lớp xác thực/giới hạn lưu lượng ở gateway hoặc bổ sung cho server. Không đưa `OPENAI_API_KEY` vào frontend; key chỉ nằm trong `.env` của server.
