package com.culturalatlas.assistant.application.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Request payload cho endpoint so sánh văn hóa giữa 2-3 địa phương.
 *
 * @param conversationId   ID cuộc trò chuyện (tùy chọn). Nếu null, tạo cuộc trò chuyện mới.
 * @param provinceSlugs    Danh sách từ 2 đến 3 slug địa phương (không trùng lặp, không blank).
 * @param aspect           Khía cạnh so sánh (CUISINE, HERITAGE, FESTIVALS, ALL).
 * @param guestSessionUuid Session UUID của khách vãng lai (tùy chọn).
 */
public record CompareRequest(
    @Positive(message = "conversationId must be positive")
    Long conversationId,

    @NotNull(message = "provinceSlugs list must not be null")
    @Size(min = 2, max = 3, message = "provinceSlugs must contain exactly 2 or 3 provinces")
    List<String> provinceSlugs,

    @NotNull(message = "aspect must not be null")
    CompareAspect aspect,

    UUID guestSessionUuid
) {
    private static final Pattern SLUG_PATTERN = Pattern.compile("^[a-z0-9]+(?:-[a-z0-9]+)*$");

    public CompareRequest {
        if (provinceSlugs != null) {
            if (provinceSlugs.size() < 2 || provinceSlugs.size() > 3) {
                throw new IllegalArgumentException("provinceSlugs must contain exactly 2 or 3 provinces");
            }
            var uniqueSlugs = new HashSet<String>();
            for (String slug : provinceSlugs) {
                if (slug == null || slug.trim().isEmpty()) {
                    throw new IllegalArgumentException("provinceSlug in compare request must not be blank");
                }
                if (!SLUG_PATTERN.matcher(slug).matches()) {
                    throw new IllegalArgumentException("provinceSlug '" + slug + "' must be lowercase kebab-case");
                }
                if (!uniqueSlugs.add(slug)) {
                    throw new IllegalArgumentException("duplicate provinceSlug found in compare request: " + slug);
                }
            }
        }
    }
}

