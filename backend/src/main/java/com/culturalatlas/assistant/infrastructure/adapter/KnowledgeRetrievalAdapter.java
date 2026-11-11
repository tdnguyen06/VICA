package com.culturalatlas.assistant.infrastructure.adapter;

import com.culturalatlas.assistant.application.dto.external.RagDocumentChunkDto;
import com.culturalatlas.assistant.application.port.out.KnowledgeRetrievalPort;
import com.culturalatlas.assistant.application.port.out.exception.KnowledgeRetrievalUnavailableException;
import com.culturalatlas.assistant.domain.enums.VerificationStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * In-Process Adapter kết nối trực tiếp với Spring AI VectorStore (PgVector trong PostgreSQL).
 * Thực hiện tìm kiếm ngữ nghĩa Cosine Similarity và lọc metadata thực tế.
 */
@Slf4j
@Component
public class KnowledgeRetrievalAdapter implements KnowledgeRetrievalPort {

    private final ObjectProvider<VectorStore> vectorStoreProvider;

    public KnowledgeRetrievalAdapter(ObjectProvider<VectorStore> vectorStoreProvider) {
        this.vectorStoreProvider = vectorStoreProvider;
    }

    @Override
    public List<RagDocumentChunkDto> retrieveRelevantChunks(String query, String provinceSlug, int topK, double minScore) {
        if (query == null || query.isBlank()) {
            return List.of();
        }

        VectorStore vectorStore = vectorStoreProvider.getIfAvailable();
        if (vectorStore == null) {
            log.debug("VectorStore bean not available in current profile (e.g. H2 in-memory test). Returning NO_DATA.");
            return List.of();
        }

        int clampedTopK = Math.max(1, Math.min(topK, 20));
        double clampedScore = Math.max(0.0, Math.min(minScore, 1.0));

        try {
            SearchRequest.Builder requestBuilder = SearchRequest.builder()
                    .query(query.trim())
                    .topK(clampedTopK)
                    .similarityThreshold(clampedScore);

            if (provinceSlug != null && !provinceSlug.isBlank()) {
                requestBuilder.filterExpression("provinceSlug == '" + provinceSlug.trim() + "'");
            }

            List<Document> documents = vectorStore.similaritySearch(requestBuilder.build());
            if (documents == null || documents.isEmpty()) {
                return List.of();
            }

            return documents.stream()
                    .map(this::toRagChunkDto)
                    .toList();
        } catch (Exception e) {
            log.error("Error retrieving relevant chunks for query '{}', province '{}': {}", query, provinceSlug, e.getMessage(), e);
            throw new KnowledgeRetrievalUnavailableException("retrieveRelevantChunks", "Failed to retrieve relevant chunks from vector store: " + e.getMessage(), e);
        }
    }

    private RagDocumentChunkDto toRagChunkDto(Document doc) {
        Map<String, Object> metadata = doc.getMetadata();

        String chunkId = doc.getId() != null ? doc.getId() : "chunk-" + System.identityHashCode(doc);
        String documentId = getMetadataString(metadata, "documentId", chunkId);
        String content = doc.getText() != null ? doc.getText() : "";
        Double score = doc.getScore() != null ? doc.getScore() : 1.0;
        String sourceName = getMetadataString(metadata, "sourceName", getMetadataString(metadata, "title", "Tư liệu văn hóa VICA"));
        String sourceUrl = getNullableMetadataString(metadata, "sourceUrl", getNullableMetadataString(metadata, "url", null));
        String provinceSlug = getNullableMetadataString(metadata, "provinceSlug", null);
        Integer pageNumber = getMetadataInteger(metadata, "pageNumber");
        VerificationStatus verificationStatus = parseVerificationStatus(metadata);

        return new RagDocumentChunkDto(
                chunkId,
                documentId,
                content,
                score,
                sourceName,
                sourceUrl,
                provinceSlug,
                pageNumber,
                verificationStatus
        );
    }

    private String getMetadataString(Map<String, Object> metadata, String key, String defaultValue) {
        if (metadata == null || !metadata.containsKey(key) || metadata.get(key) == null) {
            return defaultValue;
        }
        return String.valueOf(metadata.get(key));
    }

    private String getNullableMetadataString(Map<String, Object> metadata, String key, String defaultValue) {
        if (metadata == null || !metadata.containsKey(key) || metadata.get(key) == null) {
            return defaultValue;
        }
        return String.valueOf(metadata.get(key));
    }

    private Integer getMetadataInteger(Map<String, Object> metadata, String key) {
        if (metadata == null || !metadata.containsKey(key) || metadata.get(key) == null) {
            return null;
        }
        Object value = metadata.get(key);
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private VerificationStatus parseVerificationStatus(Map<String, Object> metadata) {
        if (metadata == null || !metadata.containsKey("verificationStatus") || metadata.get("verificationStatus") == null) {
            return VerificationStatus.UNVERIFIED;
        }
        String statusStr = String.valueOf(metadata.get("verificationStatus")).trim();
        if (statusStr.isBlank()) {
            return VerificationStatus.UNVERIFIED;
        }
        try {
            return VerificationStatus.valueOf(statusStr.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid verificationStatus in metadata: '{}'. Defaulting safely to UNVERIFIED.", statusStr);
            return VerificationStatus.UNVERIFIED;
        }
    }
}

