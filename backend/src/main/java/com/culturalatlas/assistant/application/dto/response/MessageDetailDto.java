package com.culturalatlas.assistant.application.dto.response;

import com.culturalatlas.assistant.domain.enums.MessageRole;

import java.time.LocalDateTime;

/**
 * DTO chi tiết từng tin nhắn trong một phiên hội thoại, lưu vết nội dung, trích dẫn và tool calling.
 */
public record MessageDetailDto(
        Long id,
        MessageRole role,
        String content,
        String citations,
        String toolCalls,
        Integer sequenceNumber,
        LocalDateTime createdAt
) {
}

