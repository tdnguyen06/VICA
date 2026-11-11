package com.culturalatlas.assistant.application.port.out.exception;

/**
 * Ngoại lệ ném ra khi dịch vụ RAG & Semantic Retrieval (Member 3) không khả dụng,
 * mô hình embedding hoặc pgvector store gặp sự cố.
 */
public class KnowledgeRetrievalUnavailableException extends AssistantPortException {

    public KnowledgeRetrievalUnavailableException(String operation, String message) {
        super("RAG & Semantic Retrieval", operation, message);
    }

    public KnowledgeRetrievalUnavailableException(String operation, String message, Throwable cause) {
        super("RAG & Semantic Retrieval", operation, message, cause);
    }
}

