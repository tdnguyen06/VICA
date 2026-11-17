package com.culturalatlas.assistant.application.port.out.exception;

/**
 * Ngoại lệ ném ra khi dịch vụ Cultural Knowledge Platform (Member 2) không khả dụng,
 * cơ sở dữ liệu di sản lỗi hoặc xảy ra sự cố không mong muốn.
 */
public class CulturalKnowledgeUnavailableException extends AssistantPortException {

    public CulturalKnowledgeUnavailableException(String operation, String message) {
        super("Cultural Knowledge Platform", operation, message);
    }

    public CulturalKnowledgeUnavailableException(String operation, String message, Throwable cause) {
        super("Cultural Knowledge Platform", operation, message, cause);
    }
}

