package com.culturalatlas.assistant.application.dto.response;

import com.culturalatlas.assistant.application.dto.request.CompareAspect;

import java.util.List;
import java.util.Objects;

/**
 * Response payload trả về cho yêu cầu so sánh văn hóa giữa 2-3 địa phương.
 *
 * @param conversationId     ID phiên hội thoại.
 * @param messageId          ID tin nhắn Assistant vừa được lưu.
 * @param comparedProvinces  Danh sách 2-3 tỉnh đã được so sánh.
 * @param aspect             Khía cạnh so sánh.
 * @param content            Nội dung phân tích, đối sánh văn hóa tổng hợp.
 * @param citations          Danh sách trích dẫn nguồn của các địa phương được so sánh.
 * @param suggestedQuestions Câu hỏi gợi ý mở rộng.
 * @param credentials        Thông tin xác thực Guest (chỉ xuất hiện DUY NHẤT LẦN ĐẦU khi tạo Guest Conversation mới, các lần sau luôn null).
 */
public record CompareResponse(
    Long conversationId,
    Long messageId,
    List<String> comparedProvinces,
    CompareAspect aspect,
    String content,
    List<CitationDto> citations,
    List<SuggestedQuestionDto> suggestedQuestions,
    GuestSessionCredentialsDto credentials
) {
    public CompareResponse {
        Objects.requireNonNull(conversationId, "conversationId must not be null");
        Objects.requireNonNull(messageId, "messageId must not be null");
        Objects.requireNonNull(comparedProvinces, "comparedProvinces must not be null");
        Objects.requireNonNull(aspect, "aspect must not be null");
        Objects.requireNonNull(content, "content must not be null");
        if (citations == null) {
            citations = List.of();
        }
        if (suggestedQuestions == null) {
            suggestedQuestions = List.of();
        }
    }
}

