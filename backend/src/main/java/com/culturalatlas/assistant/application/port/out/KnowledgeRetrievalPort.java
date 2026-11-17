package com.culturalatlas.assistant.application.port.out;

import com.culturalatlas.assistant.application.dto.external.RagDocumentChunkDto;
import com.culturalatlas.assistant.application.port.out.exception.KnowledgeRetrievalUnavailableException;

import java.util.List;

/**
 * Cổng giao tiếp Outbound thực hiện truy vấn ngữ nghĩa (RAG Semantic Retrieval) từ Module 3.
 */
public interface KnowledgeRetrievalPort {

    /**
     * Truy xuất các đoạn văn bản tài liệu phù hợp nhất với câu hỏi ngữ cảnh.
     *
     * @param query        Câu hỏi tự nhiên hoặc mệnh đề tìm kiếm.
     * @param provinceSlug (Tùy chọn) Giới hạn phạm vi theo địa phương (có thể null nếu tìm toàn quốc).
     * @param topK         Số lượng kết quả tối đa cần lấy (1 <= topK <= 20).
     * @param minScore     Ngưỡng tương đồng cosine tối thiểu [0.0, 1.0].
     * @return Danh sách các đoạn trích xuất (danh sách rỗng nếu không có tài liệu vượt ngưỡng tương đồng - NO_DATA).
     * @throws KnowledgeRetrievalUnavailableException khi hệ thống vector store hoặc embedding service không khả dụng.
     */
    List<RagDocumentChunkDto> retrieveRelevantChunks(String query, String provinceSlug, int topK, double minScore);
}

