package com.culturalatlas.assistant.application.dto.external;

import com.culturalatlas.assistant.domain.enums.VerificationStatus;

import java.util.Objects;

/**
 * DTO đại diện cho một đoạn văn bản tài liệu ngữ nghĩa được trả về từ KnowledgeRetrievalPort.
 * Đặc tả đầy đủ 9 trường, phân định rõ trường bắt buộc và trường nullable.
 *
 * @param chunkId            Mã định danh duy nhất của chunk trong Vector Store (Required, Not Null).
 * @param documentId         Mã định danh tài liệu gốc trong Document Registry (Required, Not Null).
 * @param content            Đoạn nội dung văn bản phục vụ RAG context (Required, Not Null).
 * @param score              Điểm tương đồng Cosine Similarity [0.0, 1.0] (Required, Not Null).
 * @param sourceName         Tên tài liệu / ấn phẩm (Required, Not Null).
 * @param sourceUrl          Đường link tài liệu gốc nếu có nguồn mở (Optional, Nullable).
 * @param provinceSlug       Slug địa phương gắn với tài liệu (Optional, Nullable nếu là tri thức chung).
 * @param pageNumber         Số trang trong tài liệu gốc (Optional, Nullable).
 * @param verificationStatus Trạng thái kiểm định văn hóa: VERIFIED hoặc LEGEND (Required, Not Null).
 */
public record RagDocumentChunkDto(
    String chunkId,
    String documentId,
    String content,
    Double score,
    String sourceName,
    String sourceUrl,
    String provinceSlug,
    Integer pageNumber,
    VerificationStatus verificationStatus
) {
    public RagDocumentChunkDto {
        Objects.requireNonNull(chunkId, "chunkId must not be null");
        Objects.requireNonNull(documentId, "documentId must not be null");
        Objects.requireNonNull(content, "content must not be null");
        Objects.requireNonNull(score, "score must not be null");
        Objects.requireNonNull(sourceName, "sourceName must not be null");
        Objects.requireNonNull(verificationStatus, "verificationStatus must not be null");
        if (score < 0.0 || score > 1.0) {
            throw new IllegalArgumentException("score must be between 0.0 and 1.0, but got: " + score);
        }
    }
}

