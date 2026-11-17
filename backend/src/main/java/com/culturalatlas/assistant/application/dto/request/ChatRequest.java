package com.culturalatlas.assistant.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request payload cho endpoint hỏi đáp văn hóa với VICA Cultural Assistant.
 *
 * @param conversationId   ID cuộc trò chuyện (tùy chọn). Nếu null, backend sẽ tạo cuộc trò chuyện mới.
 * @param message          Nội dung câu hỏi của người dùng (bắt buộc, tối đa 2000 ký tự).
 * @param provinceSlug     Slug địa phương ngữ cảnh hiện tại trên bản đồ (tùy chọn, kebab-case).
 * @param guestSessionUuid Session UUID của khách vãng lai (tùy chọn).
 */
public record ChatRequest(
    @Positive(message = "conversationId must be positive")
    Long conversationId,

    @NotBlank(message = "message must not be blank")
    @Size(max = 2000, message = "message must not exceed 2000 characters")
    String message,

    @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$", message = "provinceSlug must be lowercase kebab-case")
    @Size(min = 2, max = 100, message = "provinceSlug must be between 2 and 100 characters")
    String provinceSlug,

    UUID guestSessionUuid
) {}

