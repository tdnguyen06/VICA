package com.culturalatlas.assistant.application.service;

import com.culturalatlas.assistant.application.dto.response.GuestSessionCredentialsDto;
import com.culturalatlas.assistant.domain.enums.OwnerType;

/**
 * Ngữ cảnh phiên hội thoại luân chuyển giữa Phase 1 (bắt đầu) và Phase 3 (kết thúc).
 */
public record ConversationContext(
        Long conversationId,
        OwnerType ownerType,
        Long userMessageId,
        int userSequenceNumber,
        String effectiveProvinceSlug,
        GuestSessionCredentialsDto credentials
) {}

