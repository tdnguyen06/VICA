package com.culturalatlas.assistant.application.dto.response;

import com.culturalatlas.assistant.domain.enums.OwnerType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Response payload trả về chi tiết toàn bộ lịch sử tin nhắn của một phiên hội thoại sau khi xác thực quyền sở hữu.
 */
public record ConversationDetailResponse(
        Long id,
        String title,
        String currentProvinceSlug,
        OwnerType ownerType,
        UUID sessionUuid,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<MessageDetailDto> messages
) {
    public ConversationDetailResponse {
        if (messages == null) {
            messages = List.of();
        }
    }
}

