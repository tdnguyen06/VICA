package com.culturalatlas.assistant.application.dto.response;

import com.culturalatlas.assistant.domain.enums.MessageRole;

import java.util.List;
import java.util.Objects;

/**
 * Response payload trả về cho người dùng sau khi trợ lý ảo hoàn thành câu trả lời.
 *
 * @param conversationId     ID phiên hội thoại.
 * @param messageId          ID tin nhắn của Assistant vừa được lưu trong database.
 * @param role               Vai trò tin nhắn (luôn là ASSISTANT).
 * @param content            Nội dung phản hồi hoàn chỉnh.
 * @param provinceSlug       Địa phương ngữ cảnh chính liên quan đến câu trả lời (nếu có).
 * @param citations          Danh sách các nguồn trích dẫn đã được backend whitelist xác minh (không bao giờ null).
 * @param suggestedQuestions Danh sách 2-3 câu hỏi gợi ý tiếp theo (không bao giờ null).
 * @param credentials        Thông tin xác thực Guest (chỉ xuất hiện DUY NHẤT LẦN ĐẦU khi tạo Guest Conversation mới, các lần sau luôn null).
 */
public record ChatResponse(
    Long conversationId,
    Long messageId,
    MessageRole role,
    String content,
    String provinceSlug,
    List<CitationDto> citations,
    List<SuggestedQuestionDto> suggestedQuestions,
    GuestSessionCredentialsDto credentials
) {
    public ChatResponse {
        Objects.requireNonNull(conversationId, "conversationId must not be null");
        Objects.requireNonNull(messageId, "messageId must not be null");
        Objects.requireNonNull(role, "role must not be null");
        Objects.requireNonNull(content, "content must not be null");
        if (citations == null) {
            citations = List.of();
        }
        if (suggestedQuestions == null) {
            suggestedQuestions = List.of();
        }
    }
}

