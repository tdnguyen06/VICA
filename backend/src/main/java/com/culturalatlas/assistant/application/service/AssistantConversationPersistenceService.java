package com.culturalatlas.assistant.application.service;

import com.culturalatlas.assistant.application.dto.request.ChatRequest;
import com.culturalatlas.assistant.application.dto.response.CitationDto;
import com.culturalatlas.assistant.application.dto.response.GuestSessionCredentialsDto;
import com.culturalatlas.assistant.domain.entity.Conversation;
import com.culturalatlas.assistant.domain.entity.Message;
import com.culturalatlas.assistant.domain.enums.MessageRole;
import com.culturalatlas.assistant.domain.enums.OwnerType;
import com.culturalatlas.assistant.domain.repository.ConversationRepository;
import com.culturalatlas.assistant.domain.repository.MessageRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Quản lý các Transaction ngắn hạn cho việc lưu trữ Conversation và Message.
 * Tách biệt rõ ràng Phase 1 (Save USER) và Phase 3 (Save ASSISTANT) khỏi Phase 2 (gọi AI không giữ Transaction).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssistantConversationPersistenceService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final ObjectMapper objectMapper;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /**
     * Phase 1: Xác thực quyền sở hữu, tạo hoặc khóa hội thoại, lưu USER message.
     */
    @Transactional
    public ConversationContext startUserMessage(
            ChatRequest request,
            Long authenticatedUserId,
            String guestToken
    ) {
        Objects.requireNonNull(request, "request must not be null");

        Conversation conversation;
        GuestSessionCredentialsDto newCredentials = null;

        if (request.conversationId() == null) {
            // Tạo mới cuộc hội thoại
            if (authenticatedUserId != null) {
                conversation = Conversation.builder()
                        .ownerType(OwnerType.USER)
                        .userId(authenticatedUserId)
                        .currentProvinceSlug(request.provinceSlug())
                        .title(deriveTitle(request.message()))
                        .build();
            } else {
                UUID sessionUuid = UUID.randomUUID();
                String rawToken = generateGuestToken();
                String tokenHash = sha256Hex(rawToken);

                conversation = Conversation.builder()
                        .ownerType(OwnerType.GUEST)
                        .sessionUuid(sessionUuid)
                        .guestTokenHash(tokenHash)
                        .currentProvinceSlug(request.provinceSlug())
                        .title(deriveTitle(request.message()))
                        .build();
                newCredentials = new GuestSessionCredentialsDto(sessionUuid, rawToken);
            }
            conversation = conversationRepository.save(conversation);
        } else {
            // Tra cứu và khóa bi quan (Pessimistic Write Lock) cuộc hội thoại hiện có
            conversation = conversationRepository.findByIdForUpdate(request.conversationId())
                    .orElseThrow(() -> new IllegalArgumentException("Hội thoại không tồn tại với ID: " + request.conversationId()));

            validateOwnership(conversation, authenticatedUserId, request.guestSessionUuid(), guestToken);

            if (request.provinceSlug() != null && !request.provinceSlug().isBlank()) {
                conversation.setCurrentProvinceSlug(request.provinceSlug().trim());
                conversation = conversationRepository.save(conversation);
            }
        }

        // Cấp phát sequence number liên tục
        int currentMaxSeq = messageRepository.findMaxSequenceNumberByConversationId(conversation.getId());
        int userSeq = currentMaxSeq + 1;

        Message userMessage = Message.builder()
                .conversation(conversation)
                .role(MessageRole.USER)
                .content(request.message().trim())
                .sequenceNumber(userSeq)
                .tokenCount(estimateTokens(request.message()))
                .build();

        userMessage = messageRepository.save(userMessage);

        return new ConversationContext(
                conversation.getId(),
                conversation.getOwnerType(),
                userMessage.getId(),
                userSeq,
                conversation.getCurrentProvinceSlug(),
                newCredentials
        );
    }

    /**
     * Phase 3: Khóa hội thoại, cấp sequence number, lưu ASSISTANT message và commit transaction.
     */
    @Transactional
    public Message completeAssistantMessage(
            Long conversationId,
            String content,
            List<CitationDto> citations,
            List<Map<String, Object>> toolCalls,
            String provinceSlug
    ) {
        Objects.requireNonNull(conversationId, "conversationId must not be null");

        Conversation conversation = conversationRepository.findByIdForUpdate(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Hội thoại không tồn tại: " + conversationId));

        if (provinceSlug != null && !provinceSlug.isBlank()) {
            conversation.setCurrentProvinceSlug(provinceSlug.trim());
            conversationRepository.save(conversation);
        }

        int currentMaxSeq = messageRepository.findMaxSequenceNumberByConversationId(conversationId);
        int assistantSeq = currentMaxSeq + 1;

        String citationsJson = serializeJson(citations != null ? citations : List.of());
        String toolCallsJson = serializeJson(toolCalls != null ? toolCalls : List.of());

        Message assistantMessage = Message.builder()
                .conversation(conversation)
                .role(MessageRole.ASSISTANT)
                .content(content != null ? content : "")
                .citations(citationsJson)
                .toolCalls(toolCallsJson)
                .sequenceNumber(assistantSeq)
                .tokenCount(estimateTokens(content))
                .build();

        return messageRepository.save(assistantMessage);
    }

    /**
     * Phase 3 Fallback: Lưu tin nhắn báo lỗi an toàn khi gọi AI thất bại, bảo toàn chuỗi sequence.
     */
    @Transactional
    public Message recordAssistantErrorFallback(Long conversationId, String safeErrorMessage) {
        return completeAssistantMessage(conversationId, safeErrorMessage, List.of(), List.of(), null);
    }

    public static void validateOwnership(Conversation conversation, Long authenticatedUserId, UUID guestSessionUuid, String guestToken) {
        if (authenticatedUserId != null) {
            if (conversation.getOwnerType() != OwnerType.USER || !authenticatedUserId.equals(conversation.getUserId())) {
                throw new SecurityException("Người dùng không có quyền truy cập hội thoại này.");
            }
        } else {
            if (conversation.getOwnerType() != OwnerType.GUEST) {
                throw new SecurityException("Không thể truy cập hội thoại thành viên dưới quyền khách vãng lai.");
            }
            if (guestToken == null || guestToken.isBlank()) {
                throw new SecurityException("Thiếu token xác thực khách vãng lai (X-Guest-Token).");
            }
            String tokenHash = sha256Hex(guestToken.trim());
            if (!tokenHash.equals(conversation.getGuestTokenHash())) {
                throw new SecurityException("Token khách vãng lai không hợp lệ.");
            }
            if (guestSessionUuid != null && !guestSessionUuid.equals(conversation.getSessionUuid())) {
                throw new SecurityException("Session UUID không khớp với hội thoại.");
            }
        }
    }

    public static String deriveTitle(String message) {
        if (message == null || message.isBlank()) {
            return "Khám phá văn hóa Việt Nam";
        }
        String cleaned = message.trim().replaceAll("\\s+", " ");
        return cleaned.length() > 60 ? cleaned.substring(0, 57) + "..." : cleaned;
    }

    public static int estimateTokens(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return Math.max(1, (int) Math.ceil(text.length() / 4.0));
    }

    public static String generateGuestToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    public static String sha256Hex(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Thuật toán SHA-256 không khả dụng trên JVM", e);
        }
    }

    private String serializeJson(Object object) {
        try {
            return objectMapper.writeValueAsString(object);
        } catch (JsonProcessingException e) {
            log.error("JSON serialization failed: {}", e.getMessage());
            return "[]";
        }
    }
}

