package com.culturalatlas.assistant.application.service;

import com.culturalatlas.assistant.application.dto.response.ConversationDetailResponse;
import com.culturalatlas.assistant.application.dto.response.ConversationSummaryDto;
import com.culturalatlas.assistant.application.dto.response.MessageDetailDto;
import com.culturalatlas.assistant.domain.entity.Conversation;
import com.culturalatlas.assistant.domain.entity.Message;
import com.culturalatlas.assistant.domain.enums.OwnerType;
import com.culturalatlas.assistant.domain.repository.ConversationRepository;
import com.culturalatlas.assistant.domain.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.UUID;

/**
 * Service xử lý các truy vấn lịch sử hội thoại cho người dùng đã đăng nhập hoặc khách vãng lai (Guest).
 * Đảm bảo kiểm tra quyền sở hữu chặt chẽ trước khi trả về dữ liệu.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AssistantQueryService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;

    /**
     * Lấy danh sách hội thoại có phân trang theo quyền sở hữu.
     */
    public Page<ConversationSummaryDto> listConversations(
            Long authenticatedUserId,
            UUID guestSessionUuid,
            String guestToken,
            Pageable pageable
    ) {
        if (authenticatedUserId != null) {
            return conversationRepository
                    .findByOwnerTypeAndUserIdOrderByUpdatedAtDesc(OwnerType.USER, authenticatedUserId, pageable)
                    .map(this::mapToSummary);
        }

        if (guestSessionUuid != null && guestToken != null && !guestToken.isBlank()) {
            String tokenHash = AssistantConversationPersistenceService.sha256Hex(guestToken.trim());
            return conversationRepository
                    .findByOwnerTypeAndSessionUuidAndGuestTokenHashOrderByUpdatedAtDesc(
                            OwnerType.GUEST, guestSessionUuid, tokenHash, pageable)
                    .map(this::mapToSummary);
        }

        throw new SecurityException("Cần cung cấp thông tin đăng nhập hoặc Guest Session & Token để xem lịch sử hội thoại.");
    }

    /**
     * Lấy chi tiết lịch sử tin nhắn của một phiên hội thoại sau khi xác thực quyền sở hữu.
     */
    public ConversationDetailResponse getConversationDetail(
            Long conversationId,
            Long authenticatedUserId,
            UUID guestSessionUuid,
            String guestToken
    ) {
        Objects.requireNonNull(conversationId, "conversationId must not be null");

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new NoSuchElementException("Hội thoại không tồn tại với ID: " + conversationId));

        AssistantConversationPersistenceService.validateOwnership(
                conversation, authenticatedUserId, guestSessionUuid, guestToken);

        List<Message> messages = messageRepository.findByConversationIdOrderBySequenceNumberAsc(conversationId);

        List<MessageDetailDto> messageDtos = messages.stream()
                .map(m -> new MessageDetailDto(
                        m.getId(),
                        m.getRole(),
                        m.getContent(),
                        m.getCitations(),
                        m.getToolCalls(),
                        m.getSequenceNumber(),
                        m.getCreatedAt()
                ))
                .toList();

        return new ConversationDetailResponse(
                conversation.getId(),
                conversation.getTitle(),
                conversation.getCurrentProvinceSlug(),
                conversation.getOwnerType(),
                conversation.getSessionUuid(),
                conversation.getCreatedAt(),
                conversation.getUpdatedAt(),
                messageDtos
        );
    }

    private ConversationSummaryDto mapToSummary(Conversation c) {
        return new ConversationSummaryDto(
                c.getId(),
                c.getTitle(),
                c.getCurrentProvinceSlug(),
                c.getOwnerType(),
                c.getSessionUuid(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}

