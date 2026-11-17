package com.culturalatlas.assistant.application.service;

import com.culturalatlas.assistant.application.prompt.AssistantPromptTemplates;
import com.culturalatlas.assistant.domain.entity.Message;
import com.culturalatlas.assistant.domain.enums.MessageRole;
import com.culturalatlas.assistant.domain.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Dịch vụ nạp và cắt tỉa lịch sử hội thoại nhiều lượt (Multi-turn Context):
 * - Nạp 6-8 tin nhắn gần nhất trước tin nhắn hiện tại.
 * - Sắp xếp theo sequence_number ASC.
 * - Giới hạn xấp xỉ 3.000 tokens qua AssistantPromptTemplates.trimHistory().
 * - Ánh xạ sang Spring AI UserMessage và AssistantMessage.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContextLoader {

    public static final int MAX_HISTORY_MESSAGES = 8;
    public static final int MAX_HISTORY_BUDGET = 12000; // ~3,000 tokens

    private final MessageRepository messageRepository;

    public List<org.springframework.ai.chat.messages.Message> loadHistory(Long conversationId, int currentUserSeq) {
        if (conversationId == null) {
            return List.of();
        }

        List<Message> allMessages = messageRepository.findByConversationIdOrderBySequenceNumberAsc(conversationId);
        if (allMessages.isEmpty()) {
            return List.of();
        }

        // Chỉ lấy các tin nhắn xảy ra TRƯỚC tin nhắn của người dùng hiện tại
        List<Message> priorMessages = allMessages.stream()
                .filter(m -> m.getSequenceNumber() != null && m.getSequenceNumber() < currentUserSeq)
                .toList();

        if (priorMessages.isEmpty()) {
            return List.of();
        }

        // Cắt tỉa theo số lượng tin nhắn tối đa và ngân sách ký tự/tokens
        List<Message> trimmed = AssistantPromptTemplates.trimHistory(priorMessages, MAX_HISTORY_MESSAGES, MAX_HISTORY_BUDGET);

        List<org.springframework.ai.chat.messages.Message> springAiMessages = new ArrayList<>();
        for (Message msg : trimmed) {
            if (msg.getContent() == null || msg.getContent().isBlank()) {
                continue;
            }
            if (msg.getRole() == MessageRole.USER) {
                springAiMessages.add(new UserMessage(msg.getContent()));
            } else if (msg.getRole() == MessageRole.ASSISTANT) {
                springAiMessages.add(new AssistantMessage(msg.getContent()));
            }
        }

        return springAiMessages;
    }
}

