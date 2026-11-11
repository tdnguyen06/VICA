package com.culturalatlas.assistant.application.dto.tool;

import com.culturalatlas.assistant.domain.enums.VerificationStatus;
import lombok.Builder;

import java.util.Objects;

/**
 * Metadata nguồn gốc dữ liệu phục vụ CitationBuilderService ở tầng Orchestration.
 * Lưu giữ khả năng truy vết về dữ liệu gốc và bảo toàn VerificationStatus từ Port.
 *
 * @param sourceId           Mã định danh duy nhất của nguồn (VD: 'site-hue', 'chunk-102').
 * @param sourceName         Tên nguồn hiển thị (VD: 'Hồ sơ Di sản UNESCO - Cố đô Huế').
 * @param sourceUrl          Đường link tham khảo nếu có (nullable).
 * @param documentId         Mã tài liệu gốc (nullable).
 * @param pageNumber         Số trang tài liệu gốc (nullable).
 * @param provinceSlug       Mã định danh địa phương gắn liền (nullable).
 * @param verificationStatus Trạng thái xác thực: chỉ nhận VERIFIED hoặc LEGEND.
 */
@Builder
public record ToolSourceMetadata(
    String sourceId,
    String sourceName,
    String sourceUrl,
    String documentId,
    Integer pageNumber,
    String provinceSlug,
    VerificationStatus verificationStatus
) {
    public ToolSourceMetadata {
        Objects.requireNonNull(sourceId, "sourceId must not be null");
        Objects.requireNonNull(sourceName, "sourceName must not be null");
        Objects.requireNonNull(verificationStatus, "verificationStatus must not be null");
    }
}

