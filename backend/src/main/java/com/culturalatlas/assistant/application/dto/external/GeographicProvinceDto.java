package com.culturalatlas.assistant.application.dto.external;

import java.util.Objects;

/**
 * DTO đại diện cho thông tin địa lý của tỉnh/thành được trả về từ GeographicPort.
 * Độc lập với Entity nội bộ của Member 1.
 *
 * @param id        Định danh nội bộ của tỉnh trong hệ thống VICA.
 * @param slug      Slug chuẩn kebab-case của địa phương (VD: 'thua-thien-hue').
 * @param name      Tên tiếng Việt có dấu của địa phương (VD: 'Thừa Thiên Huế').
 * @param adminUnit Cấp hành chính (VD: 'Tỉnh', 'Thành phố').
 */
public record GeographicProvinceDto(
    Long id,
    String slug,
    String name,
    String adminUnit
) {
    public GeographicProvinceDto {
        Objects.requireNonNull(id, "id must not be null");
        Objects.requireNonNull(slug, "slug must not be null");
        Objects.requireNonNull(name, "name must not be null");
    }
}

