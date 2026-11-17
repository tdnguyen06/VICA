package com.culturalatlas.assistant.domain.enums;

/**
 * Loại chủ sở hữu của phiên hội thoại Assistant.
 * - USER: Người dùng đã đăng nhập hệ thống.
 * - GUEST: Khách vãng lai xác thực qua guest_token_hash.
 */
public enum OwnerType {
    USER,
    GUEST
}

