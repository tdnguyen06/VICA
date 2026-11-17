package com.culturalatlas.assistant.infrastructure.tool;

import com.culturalatlas.assistant.application.dto.external.RagDocumentChunkDto;
import com.culturalatlas.assistant.application.dto.tool.ToolExecutionResult;
import com.culturalatlas.assistant.application.dto.tool.ToolSourceMetadata;
import com.culturalatlas.assistant.application.port.out.KnowledgeRetrievalPort;
import com.culturalatlas.assistant.application.port.out.exception.KnowledgeRetrievalUnavailableException;
import com.culturalatlas.assistant.domain.enums.VerificationStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Spring AI Tool hỗ trợ Gemini tìm kiếm tư liệu chuyên sâu từ PgVector qua KnowledgeRetrievalPort.
 * Tuân thủ Hexagonal Architecture: Chỉ giao tiếp qua KnowledgeRetrievalPort, không truy cập trực tiếp VectorStore.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KnowledgeRetrievalAssistantTool {

    private final KnowledgeRetrievalPort knowledgeRetrievalPort;

    public static final int DEFAULT_TOP_K = 3;
    public static final int MIN_TOP_K = 1;
    public static final int MAX_TOP_K = 10;
    public static final double DEFAULT_MIN_SCORE = 0.70;

    private static final Pattern SLUG_PATTERN = Pattern.compile("^[a-z0-9]+(?:-[a-z0-9]+)*$");

    @Tool(
        name = "searchDeepKnowledge",
        description = "Tìm kiếm tư liệu chuyên sâu về văn hóa, lịch sử và di sản Việt Nam từ kho tri thức ngữ nghĩa có kiểm chứng của VICA (Vector Store / RAG). " +
                      "Dùng khi người dùng đặt câu hỏi sâu về bối cảnh lịch sử, tích xưa, phong tục, nhân vật hoặc nội dung cần dẫn chứng tài liệu cụ thể. " +
                      "Đây là công cụ tra cứu cơ sở tri thức nội bộ VICA, không phải công cụ tìm kiếm Internet."
    )
    public ToolExecutionResult<List<RagDocumentChunkDto>> searchDeepKnowledge(
            @ToolParam(description = "Câu hỏi hoặc mệnh đề tìm kiếm ngữ nghĩa về văn hóa lịch sử (tối đa 500 ký tự)", required = true)
            String query,

            @ToolParam(description = "Mã định danh tỉnh/thành (VD: 'ha-noi', 'thua-thien-hue') nếu muốn thu hẹp phạm vi theo địa phương, có thể bỏ trống", required = false)
            String provinceSlug,

            @ToolParam(description = "Số lượng đoạn trích xuất tối đa cần lấy (giới hạn từ 1 đến 10, mặc định là 3)", required = false)
            Integer topK
    ) {
        // 1. Phân biệt rõ ràng lỗi tham số đầu vào (INVALID_INPUT)
        if (query == null || query.isBlank() || query.trim().length() > 500) {
            log.warn("Invalid query provided to searchDeepKnowledge: '{}'", query);
            return ToolExecutionResult.error(
                    ToolExecutionResult.ERROR_INVALID_INPUT,
                    "Nội dung tìm kiếm query không được để trống và không được vượt quá 500 ký tự."
            );
        }

        String cleanProvinceSlug = null;
        if (provinceSlug != null && !provinceSlug.isBlank()) {
            cleanProvinceSlug = provinceSlug.trim();
            if (cleanProvinceSlug.length() < 2 || cleanProvinceSlug.length() > 100 || !SLUG_PATTERN.matcher(cleanProvinceSlug).matches()) {
                log.warn("Invalid provinceSlug provided to searchDeepKnowledge: '{}'", provinceSlug);
                return ToolExecutionResult.error(
                        ToolExecutionResult.ERROR_INVALID_INPUT,
                        "Mã provinceSlug không hợp lệ. Phải tuân thủ định dạng kebab-case."
                );
            }
        }

        // Áp dụng thống nhất chính sách topK: mặc định 3, giới hạn trong khoảng [1, 10]
        int effectiveTopK = (topK == null) ? DEFAULT_TOP_K : Math.max(MIN_TOP_K, Math.min(topK, MAX_TOP_K));

        try {
            // 2. Gọi qua Port trừu tượng
            List<RagDocumentChunkDto> chunks = knowledgeRetrievalPort.retrieveRelevantChunks(
                    query.trim(),
                    cleanProvinceSlug,
                    effectiveTopK,
                    DEFAULT_MIN_SCORE
            );

            // 3. Phân biệt trường hợp không có dữ liệu tài liệu hoặc vector store rỗng (NO_DATA)
            if (chunks == null || chunks.isEmpty()) {
                log.debug("No relevant document chunks found for query '{}' in province '{}'", query, cleanProvinceSlug);
                return ToolExecutionResult.noData(
                        "Kho tư liệu chuyên sâu hiện chưa có dữ liệu tài liệu phù hợp cho câu hỏi này."
                );
            }

            // 4. Bảo toàn nguyên vẹn VerificationStatus và metadata từ tài liệu gốc
            List<ToolSourceMetadata> metadataList = chunks.stream()
                    .map(chunk -> ToolSourceMetadata.builder()
                            .sourceId(chunk.chunkId())
                            .sourceName(chunk.sourceName())
                            .sourceUrl(chunk.sourceUrl())
                            .documentId(chunk.documentId())
                            .pageNumber(chunk.pageNumber())
                            .provinceSlug(chunk.provinceSlug())
                            .verificationStatus(chunk.verificationStatus() != null ? chunk.verificationStatus() : VerificationStatus.UNVERIFIED)
                            .build())
                    .toList();

            return ToolExecutionResult.success(
                    chunks,
                    metadataList,
                    "Truy xuất thành công " + chunks.size() + " đoạn tư liệu chuyên sâu từ kho tri thức VICA."
            );
        } catch (KnowledgeRetrievalUnavailableException e) {
            log.error("KnowledgeRetrievalPort service unavailable for query '{}': {}", query, e.getMessage());
            return ToolExecutionResult.error(
                    ToolExecutionResult.ERROR_DEPENDENCY_UNAVAILABLE,
                    "Dịch vụ tìm kiếm ngữ nghĩa tài liệu tạm thời không khả dụng. Vui lòng thử lại sau."
            );
        } catch (Exception e) {
            log.error("Unexpected error retrieving knowledge for query '{}': {}", query, e.getMessage(), e);
            return ToolExecutionResult.error(
                    ToolExecutionResult.ERROR_INTERNAL_ERROR,
                    "Đã xảy ra lỗi nội bộ khi truy xuất kho tư liệu chuyên sâu."
            );
        }
    }
}

