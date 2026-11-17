package com.culturalatlas.assistant.domain.entity;

import com.culturalatlas.assistant.domain.enums.MessageRole;
import com.culturalatlas.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Từng tin nhắn trong một phiên hội thoại, lưu vết nội dung, nguồn trích dẫn và tool calling.
 * Ràng buộc tính duy nhất của (conversation_id, sequence_number) để bảo đảm thứ tự hội thoại.
 */
@Entity
@Table(
    name = "messages",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_messages_conversation_seq", columnNames = {"conversation_id", "sequence_number"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MessageRole role;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "citations", nullable = false)
    @Builder.Default
    private String citations = "[]";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tool_calls", nullable = false)
    @Builder.Default
    private String toolCalls = "[]";

    @Column(name = "sequence_number", nullable = false)
    private Integer sequenceNumber;

    @Column(name = "token_count", nullable = false)
    @Builder.Default
    private Integer tokenCount = 0;
}
