package com.culturalatlas.assistant.domain.entity;

import com.culturalatlas.assistant.domain.enums.OwnerType;
import com.culturalatlas.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Phiên hội thoại giữa người dùng và VICA Cultural Assistant.
 * Phân biệt rõ loại sở hữu:
 * - USER: Gắn với user_id (người dùng đã đăng nhập), không dùng guest_token_hash.
 * - GUEST: Khách vãng lai, định danh công khai bằng session_uuid và xác thực bằng guest_token_hash (SHA-256).
 */
@Entity
@Table(name = "conversations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "owner_type", nullable = false, length = 20)
    private OwnerType ownerType;

    @Column(name = "session_uuid", unique = true)
    private UUID sessionUuid;

    @Column(name = "guest_token_hash", length = 64)
    private String guestTokenHash;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "current_province_slug", length = 100)
    private String currentProvinceSlug;

    @Column(nullable = false, length = 255)
    @Builder.Default
    private String title = "Khám phá văn hóa Việt Nam";

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceNumber ASC")
    @Builder.Default
    private List<Message> messages = new ArrayList<>();

    public void addMessage(Message message) {
        messages.add(message);
        message.setConversation(this);
    }
}
