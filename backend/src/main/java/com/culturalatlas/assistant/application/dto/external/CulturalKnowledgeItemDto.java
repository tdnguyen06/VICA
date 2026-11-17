package com.culturalatlas.assistant.application.dto.external;

import java.util.Objects;

/**
 * DTO đại diện cho một di sản văn hóa vật thể được trả về từ CulturalKnowledgePort.
 * Độc lập với Entity CulturalSite của Member 2.
 *
 * @param id               Định danh di sản.
 * @param name             Tên di sản (VD: 'Quần thể di tích Cố đô Huế').
 * @param slug             Slug định danh di sản (VD: 'quan-the-di-tich-co-do-hue').
 * @param category         Mã danh mục di sản (VD: 'historical', 'architecture').
 * @param categoryLabel    Nhãn hiển thị danh mục tiếng Việt (VD: 'Di tích lịch sử').
 * @param province         Tên hoặc slug tỉnh gắn với di sản.
 * @param latitude         Tọa độ vĩ độ WGS84.
 * @param longitude        Tọa độ kinh độ WGS84.
 * @param description      Mô tả tóm tắt giá trị văn hóa lịch sử của di sản.
 * @param unescoYear       Năm được UNESCO công nhận (nếu có, null nếu không).
 * @param historicalPeriod Thời kỳ lịch sử (VD: 'Triều Nguyễn (1802-1945)').
 */
public record CulturalKnowledgeItemDto(
    Long id,
    String name,
    String slug,
    String category,
    String categoryLabel,
    String province,
    Double latitude,
    Double longitude,
    String description,
    Integer unescoYear,
    String historicalPeriod
) {
    public CulturalKnowledgeItemDto {
        Objects.requireNonNull(id, "id must not be null");
        Objects.requireNonNull(name, "name must not be null");
        Objects.requireNonNull(slug, "slug must not be null");
    }
}

