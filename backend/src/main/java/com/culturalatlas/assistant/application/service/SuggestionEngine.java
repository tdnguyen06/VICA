package com.culturalatlas.assistant.application.service;

import com.culturalatlas.assistant.application.dto.external.CulturalKnowledgeItemDto;
import com.culturalatlas.assistant.application.dto.external.GeographicProvinceDto;
import com.culturalatlas.assistant.application.dto.external.RagDocumentChunkDto;
import com.culturalatlas.assistant.application.dto.response.SuggestedQuestionDto;
import com.culturalatlas.assistant.application.dto.tool.ToolExecutionResult;
import com.culturalatlas.assistant.application.dto.tool.ToolExecutionStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Động cơ sinh 2-3 câu hỏi gợi ý tiếp nối (Suggested Questions) dựa trên dữ liệu thực tế từ Tool results:
 * - Không gọi thêm LLM để tối ưu chi phí và độ trễ.
 * - Triệt để tuân thủ nguyên tắc Grounded: chỉ gợi ý những gì có cơ sở dữ liệu.
 * - Trả về danh sách rỗng nếu không đủ dữ liệu thực tế.
 */
@Slf4j
@Service
public class SuggestionEngine {

    public static final int MAX_SUGGESTIONS = 3;

    @SuppressWarnings("unchecked")
    public List<SuggestedQuestionDto> generateSuggestions(
            String userQuestion,
            String assistantAnswer,
            String provinceSlug,
            List<ToolExecutionResult<?>> toolResults
    ) {
        if (toolResults == null || toolResults.isEmpty()) {
            return List.of();
        }

        Set<SuggestedQuestionDto> suggestions = new LinkedHashSet<>();

        for (ToolExecutionResult<?> result : toolResults) {
            if (result == null || result.status() != ToolExecutionStatus.SUCCESS || result.data() == null) {
                continue;
            }

            Object data = result.data();

            // 1. Gợi ý từ danh mục di sản văn hóa vật thể (Cultural Sites)
            if (data instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof CulturalKnowledgeItemDto) {
                List<CulturalKnowledgeItemDto> sites = (List<CulturalKnowledgeItemDto>) list;
                if (!sites.isEmpty()) {
                    CulturalKnowledgeItemDto primarySite = sites.get(0);
                    suggestions.add(new SuggestedQuestionDto(
                            "Tìm hiểu chi tiết về lịch sử hình thành và nét kiến trúc tiêu biểu của " + primarySite.name(),
                            "DEEP_DIVE"
                    ));
                    if (sites.size() > 1) {
                        CulturalKnowledgeItemDto secondarySite = sites.get(1);
                        suggestions.add(new SuggestedQuestionDto(
                                "So sánh nét đặc sắc giữa " + primarySite.name() + " và " + secondarySite.name(),
                                "COMPARE"
                        ));
                    }
                }
            }

            // 2. Gợi ý từ thông tin địa lý tỉnh/thành (Geographic Province)
            if (data instanceof GeographicProvinceDto province) {
                suggestions.add(new SuggestedQuestionDto(
                        "Khám phá các di sản văn hóa và danh lam thắng cảnh tiêu biểu tại " + province.name(),
                        "DEEP_DIVE"
                ));
                suggestions.add(new SuggestedQuestionDto(
                        "Tìm hiểu các lễ hội truyền thống và phong tục tập quán đặc trưng của " + province.name(),
                        "DEEP_DIVE"
                ));
            }

            // 3. Gợi ý từ tư liệu chuyên sâu (RAG Document Chunks)
            if (data instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof RagDocumentChunkDto) {
                List<RagDocumentChunkDto> chunks = (List<RagDocumentChunkDto>) list;
                for (RagDocumentChunkDto chunk : chunks) {
                    if (chunk.sourceName() != null && !chunk.sourceName().isBlank()) {
                        suggestions.add(new SuggestedQuestionDto(
                                "Tìm hiểu thêm các huyền tích và ghi chép lịch sử liên quan trong tư liệu '" + chunk.sourceName() + "'",
                                "DEEP_DIVE"
                        ));
                        break;
                    }
                }
            }

            if (suggestions.size() >= MAX_SUGGESTIONS) {
                break;
            }
        }

        return suggestions.stream()
                .limit(MAX_SUGGESTIONS)
                .toList();
    }
}
