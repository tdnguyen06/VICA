package com.culturalatlas.assistant.application.dto.response;

import com.culturalatlas.assistant.domain.enums.VerificationStatus;

import java.util.Objects;

/**
 * DTO đại diện cho một nguồn trích dẫn được xác thực gắn liền với câu trả lời của trợ lý ảo.
 *
 * @param sourceId     Mã định danh nguồn do backend quản lý (VD: 'site-48', 'geo-thua-thien-hue', 'rag-chunk-102').
 * @param sourceName   Tên hiển thị của nguồn (VD: 'Quần thể Di tích Cố đô Huế').
 * @param provinceSlug Mã định danh địa phương gắn với nguồn (có thể null nếu là nguồn tri thức chung).
 * @param category     Phân loại nguồn ('GEOGRAPHY', 'HERITAGE', 'DOCUMENT').
 * @param url          Đường link tham khảo trực tuyến (nếu có).
 * @param status       Trạng thái kiểm định: chỉ nhận VERIFIED (chính sử/nguồn mở) hoặc LEGEND (dã sử/truyền thuyết).
 */
public record CitationDto(
    String sourceId,
    String sourceName,
    String provinceSlug,
    String category,
    String url,
    VerificationStatus status
) {
    public CitationDto {
        Objects.requireNonNull(sourceId, "sourceId must not be null");
        Objects.requireNonNull(sourceName, "sourceName must not be null");
        Objects.requireNonNull(status, "status must not be null");
    }
}

