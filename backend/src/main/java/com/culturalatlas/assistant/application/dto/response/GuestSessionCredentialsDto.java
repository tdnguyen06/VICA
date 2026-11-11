package com.culturalatlas.assistant.application.dto.response;

import java.util.Objects;
import java.util.UUID;

/**
 * DTO chứa thông tin xác thực phiên Guest, được tách biệt khỏi Chat/Compare response payload.
 * CHỈ trả về MỘT LẦN DUY NHẤT khi tạo phiên Guest mới.
 *
 * @param guestSessionUuid Public UUID định danh phiên hội thoại Guest.
 * @param guestToken       Token bí mật (entropy cao) cấp cho client để làm bằng chứng sở hữu qua header X-Guest-Token.
 */
public record GuestSessionCredentialsDto(
    UUID guestSessionUuid,
    String guestToken
) {
    public GuestSessionCredentialsDto {
        Objects.requireNonNull(guestSessionUuid, "guestSessionUuid must not be null");
        Objects.requireNonNull(guestToken, "guestToken must not be null");
    }
}

