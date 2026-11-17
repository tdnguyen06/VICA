package com.culturalatlas.assistant.application.service;

import com.culturalatlas.assistant.application.dto.external.CulturalKnowledgeItemDto;
import com.culturalatlas.assistant.application.dto.external.GeographicProvinceDto;
import com.culturalatlas.assistant.application.dto.external.RagDocumentChunkDto;
import com.culturalatlas.assistant.application.dto.response.SuggestedQuestionDto;
import com.culturalatlas.assistant.application.dto.tool.ToolExecutionResult;
import com.culturalatlas.assistant.application.dto.tool.ToolExecutionStatus;
import com.culturalatlas.assistant.application.port.out.GeographicPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Động cơ sinh 2-3 câu hỏi gợi ý tiếp nối (Suggested Questions) thông minh và chính xác:
 * - Tránh lặp lại câu hỏi mà người dùng vừa hỏi.
 * - Dựa trên dữ liệu thực tế từ Tool results và bối cảnh địa phương.
 * - Khi không có tool calls, tự động sinh câu hỏi gợi ý đa dạng theo chủ đề văn hóa của tỉnh thành.
 */
@Slf4j
@Service
public class SuggestionEngine {

    public static final int MAX_SUGGESTIONS = 3;

    private final GeographicPort geographicPort;

    public SuggestionEngine(@Autowired(required = false) GeographicPort geographicPort) {
        this.geographicPort = geographicPort;
    }

    @SuppressWarnings("unchecked")
    public List<SuggestedQuestionDto> generateSuggestions(
            String userQuestion,
            String assistantAnswer,
            String provinceSlug,
            List<ToolExecutionResult<?>> toolResults
    ) {
        Set<SuggestedQuestionDto> suggestions = new LinkedHashSet<>();
        String currentTopic = detectTopic(userQuestion);

        // 1. Khai thác dữ liệu thực tế từ Tool Execution Results nếu có
        if (toolResults != null && !toolResults.isEmpty()) {
            for (ToolExecutionResult<?> result : toolResults) {
                if (result == null || result.status() != ToolExecutionStatus.SUCCESS || result.data() == null) {
                    continue;
                }

                Object data = result.data();

                // Gợi ý từ danh mục di sản văn hóa vật thể (Cultural Sites)
                if (data instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof CulturalKnowledgeItemDto) {
                    List<CulturalKnowledgeItemDto> sites = (List<CulturalKnowledgeItemDto>) list;
                    for (CulturalKnowledgeItemDto site : sites) {
                        if (site.name() != null && !site.name().isBlank() && !isAlreadyAsked(site.name(), userQuestion)) {
                            suggestions.add(new SuggestedQuestionDto(
                                    "Tìm hiểu chi tiết về lịch sử hình thành và nét kiến trúc tiêu biểu của " + site.name(),
                                    "DEEP_DIVE"
                            ));
                            break;
                        }
                    }
                    if (sites.size() > 1) {
                        CulturalKnowledgeItemDto first = sites.get(0);
                        CulturalKnowledgeItemDto second = sites.get(1);
                        if (first.name() != null && second.name() != null) {
                            suggestions.add(new SuggestedQuestionDto(
                                    "So sánh nét đặc sắc giữa " + first.name() + " và " + second.name(),
                                    "COMPARE"
                            ));
                        }
                    }
                }

                // Gợi ý từ thông tin địa lý tỉnh/thành (Geographic Province)
                if (data instanceof GeographicProvinceDto province) {
                    addProvinceContextSuggestions(suggestions, province.name(), currentTopic, userQuestion);
                }

                // Gợi ý từ tư liệu chuyên sâu (RAG Document Chunks)
                if (data instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof RagDocumentChunkDto) {
                    List<RagDocumentChunkDto> chunks = (List<RagDocumentChunkDto>) list;
                    for (RagDocumentChunkDto chunk : chunks) {
                        if (chunk.sourceName() != null && !chunk.sourceName().isBlank()
                                && !isAlreadyAsked(chunk.sourceName(), userQuestion)) {
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
        }

        // 2. Nếu chưa đủ gợi ý nhưng có provinceSlug, sinh gợi ý chính xác theo bối cảnh tỉnh thành
        if (suggestions.size() < MAX_SUGGESTIONS && provinceSlug != null && !provinceSlug.isBlank()) {
            String provinceName = resolveProvinceName(provinceSlug);
            if (provinceName != null && !provinceName.isBlank()) {
                addProvinceContextSuggestions(suggestions, provinceName, currentTopic, userQuestion);
            }
        }

        return suggestions.stream()
                .limit(MAX_SUGGESTIONS)
                .toList();
    }

    private void addProvinceContextSuggestions(
            Set<SuggestedQuestionDto> suggestions,
            String provinceName,
            String currentTopic,
            String userQuestion
    ) {
        // Gợi ý ẩm thực nếu người dùng chưa hỏi về ẩm thực
        if (!"CUISINE".equals(currentTopic) && suggestions.size() < MAX_SUGGESTIONS) {
            String q = "Ẩm thực đặc sản của " + provinceName + " có những món ngon nào nổi tiếng?";
            if (!isAlreadyAsked(q, userQuestion)) {
                suggestions.add(new SuggestedQuestionDto(q, "DEEP_DIVE"));
            }
        }

        // Gợi ý di sản nếu người dùng chưa hỏi về di sản
        if (!"HERITAGE".equals(currentTopic) && suggestions.size() < MAX_SUGGESTIONS) {
            String q = "Khám phá các di sản văn hóa và danh thắng tiêu biểu tại " + provinceName;
            if (!isAlreadyAsked(q, userQuestion)) {
                suggestions.add(new SuggestedQuestionDto(q, "DEEP_DIVE"));
            }
        }

        // Gợi ý lễ hội nếu người dùng chưa hỏi về lễ hội
        if (!"FESTIVAL".equals(currentTopic) && suggestions.size() < MAX_SUGGESTIONS) {
            String q = "Tìm hiểu các lễ hội truyền thống và phong tục tập quán đặc trưng của " + provinceName;
            if (!isAlreadyAsked(q, userQuestion)) {
                suggestions.add(new SuggestedQuestionDto(q, "DEEP_DIVE"));
            }
        }

        // Gợi ý truyền thuyết / lịch sử
        if (!"HISTORY".equals(currentTopic) && suggestions.size() < MAX_SUGGESTIONS) {
            String q = "Những truyền thuyết và huyền tích dân gian gắn liền với " + provinceName;
            if (!isAlreadyAsked(q, userQuestion)) {
                suggestions.add(new SuggestedQuestionDto(q, "DEEP_DIVE"));
            }
        }
    }

    private String resolveProvinceName(String slug) {
        if (geographicPort != null) {
            try {
                Optional<GeographicProvinceDto> dto = geographicPort.getProvinceBySlug(slug);
                if (dto.isPresent()) {
                    return dto.get().name();
                }
            } catch (Exception e) {
                log.debug("Could not resolve province name from port for slug {}: {}", slug, e.getMessage());
            }
        }
        return capitalizeSlug(slug);
    }

    private String capitalizeSlug(String slug) {
        if (slug == null || slug.isBlank()) return "";
        String[] parts = slug.split("-");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (!part.isBlank()) {
                if (!sb.isEmpty()) sb.append(" ");
                sb.append(Character.toUpperCase(part.charAt(0))).append(part.substring(1));
            }
        }
        return sb.toString();
    }

    private String detectTopic(String text) {
        if (text == null) return "GENERAL";
        String lower = text.toLowerCase();
        if (lower.contains("ẩm thực") || lower.contains("món") || lower.contains("ăn") || lower.contains("uống")
                || lower.contains("đặc sản") || lower.contains("bún") || lower.contains("phở") || lower.contains("bánh")) {
            return "CUISINE";
        }
        if (lower.contains("di sản") || lower.contains("di tích") || lower.contains("thắng cảnh")
                || lower.contains("chùa") || lower.contains("đền") || lower.contains("tháp") || lower.contains("lăng")
                || lower.contains("kiến trúc")) {
            return "HERITAGE";
        }
        if (lower.contains("lễ hội") || lower.contains("hội") || lower.contains("phong tục")
                || lower.contains("tập quán") || lower.contains("tín ngưỡng") || lower.contains("dân ca")) {
            return "FESTIVAL";
        }
        if (lower.contains("lịch sử") || lower.contains("truyền thuyết") || lower.contains("huyền tích")
                || lower.contains("kháng chiến") || lower.contains("triều đại") || lower.contains("vua")) {
            return "HISTORY";
        }
        return "GENERAL";
    }

    private boolean isAlreadyAsked(String candidate, String userQuestion) {
        if (candidate == null || userQuestion == null || userQuestion.isBlank()) {
            return false;
        }
        String normQ = userQuestion.toLowerCase().trim();
        String normC = candidate.toLowerCase().trim();
        return normQ.contains(normC) || (normQ.length() > 15 && normC.contains(normQ));
    }
}
