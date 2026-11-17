package com.culturalatlas.assistant.application.dto.response;

import java.util.Objects;

/**
 * DTO gợi ý câu hỏi tiếp theo cho người dùng sau mỗi phản hồi của trợ lý ảo.
 *
 * @param question Nội dung câu hỏi gợi ý.
 * @param type     Loại câu hỏi: 'DEEP_DIVE', 'RELATED_PROVINCE', 'COMPARE'.
 */
public record SuggestedQuestionDto(
    String question,
    String type
) {
    public SuggestedQuestionDto {
        Objects.requireNonNull(question, "question must not be null");
    }
}

