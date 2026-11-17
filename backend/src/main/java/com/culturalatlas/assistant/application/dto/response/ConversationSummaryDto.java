package com.culturalatlas.assistant.application.dto.response;

import com.culturalatlas.assistant.domain.enums.OwnerType;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO tóm tắt thông tin một phiên hội thoại phục vụ hiển thị danh sách lịch sử trò chuyện.
 */
public record ConversationSummaryDto(
        Long id,
        String title,
        String currentProvinceSlug,
        OwnerType ownerType,
        UUID sessionUuid,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}

