package com.culturalatlas.assistant.application.service;

import com.culturalatlas.assistant.application.dto.response.CitationDto;
import com.culturalatlas.assistant.application.dto.tool.ToolExecutionResult;
import com.culturalatlas.assistant.application.dto.tool.ToolExecutionStatus;
import com.culturalatlas.assistant.application.dto.tool.ToolSourceMetadata;
import com.culturalatlas.assistant.domain.enums.VerificationStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Dịch vụ xây dựng và kiểm định trích dẫn nguồn (Citation) cho VICA Assistant.
 *
 * <p>Quy tắc liêm chính học thuật:
 * <ul>
 *   <li>1. Toàn bộ dữ liệu trích dẫn bắt nguồn từ ToolExecutionResult, tuyệt đối không lấy URL do LLM tự sinh.</li>
 *   <li>2. Deduplicate theo sourceId với thứ tự xác định (deterministic 1-based indexing).</li>
 *   <li>3. Bảo toàn nguyên vẹn VerificationStatus; thiếu hoặc không hợp lệ mặc định an toàn UNVERIFIED.</li>
 *   <li>4. Kiểm tra marker trích dẫn [1], [2] trong câu trả lời của LLM; loại bỏ mọi marker không tồn tại
 *          hoặc vượt quá số lượng nguồn thực tế.</li>
 * </ul>
 */
@Slf4j
@Service
public class CitationBuilderService {

    private static final Pattern CITATION_MARKER_PATTERN = Pattern.compile("\\[(\\d+)\\]");

    /**
     * Thu thập và loại bỏ trùng lặp metadata nguồn từ danh sách kết quả thực thi Tool.
     * Thứ tự nguồn được bảo toàn theo dạng 1-based indexing phục vụ prompt cho LLM.
     *
     * @param toolResults Danh sách kết quả thực thi Tool
     * @return Danh sách ToolSourceMetadata đã loại trùng theo sourceId
     */
    public List<ToolSourceMetadata> extractDistinctSources(List<ToolExecutionResult<?>> toolResults) {
        if (toolResults == null || toolResults.isEmpty()) {
            return List.of();
        }

        Map<String, ToolSourceMetadata> distinctMap = new LinkedHashMap<>();
        for (ToolExecutionResult<?> result : toolResults) {
            if (result == null || result.status() != ToolExecutionStatus.SUCCESS || result.metadata() == null) {
                continue;
            }
            for (ToolSourceMetadata meta : result.metadata()) {
                if (meta != null && meta.sourceId() != null && !meta.sourceId().isBlank()) {
                    distinctMap.putIfAbsent(meta.sourceId().trim(), meta);
                }
            }
        }
        return Collections.unmodifiableList(new ArrayList<>(distinctMap.values()));
    }

    /**
     * Xây dựng danh sách CitationDto từ kết quả Tool và văn bản phản hồi của LLM.
     * - Chỉ những nguồn có marker hợp lệ (VD: [1], [2]) xuất hiện trong text mới được đưa vào danh sách trả về.
     * - Nếu câu trả lời chứa marker không tồn tại (như [99]), marker đó sẽ bị loại bỏ, không sinh citation giả.
     * - Nếu câu trả lời không có marker nào nhưng các Tool đã trả về nguồn, trả về danh sách các nguồn hợp lệ.
     *
     * @param toolResults Danh sách kết quả thực thi Tool
     * @param responseContent Văn bản phản hồi do LLM sinh ra
     * @return Danh sách CitationDto đã được thẩm định
     */
    public List<CitationDto> buildCitations(List<ToolExecutionResult<?>> toolResults, String responseContent) {
        List<ToolSourceMetadata> sources = extractDistinctSources(toolResults);
        if (sources.isEmpty()) {
            return List.of();
        }

        Set<Integer> citedIndices = parseCitedIndices(responseContent);

        List<CitationDto> citations = new ArrayList<>();
        if (!citedIndices.isEmpty()) {
            for (Integer index : citedIndices) {
                // Chỉ chấp nhận marker trong khoảng [1, sources.size()]
                if (index != null && index >= 1 && index <= sources.size()) {
                    ToolSourceMetadata meta = sources.get(index - 1);
                    citations.add(toCitationDto(meta));
                } else {
                    log.warn("Ignored invalid citation marker [{}] beyond available sources (size={})", index, sources.size());
                }
            }
        } else {
            // Fallback: Nếu LLM không gắn marker [k], chuyển tiếp toàn bộ nguồn hợp lệ đã truy xuất
            for (ToolSourceMetadata meta : sources) {
                citations.add(toCitationDto(meta));
            }
        }

        return Collections.unmodifiableList(citations);
    }

    /**
     * Parse danh sách chỉ số marker [1], [2] từ văn bản phản hồi.
     */
    public Set<Integer> parseCitedIndices(String content) {
        if (content == null || content.isBlank()) {
            return Set.of();
        }
        Set<Integer> indices = new LinkedHashSet<>();
        Matcher matcher = CITATION_MARKER_PATTERN.matcher(content);
        while (matcher.find()) {
            try {
                int index = Integer.parseInt(matcher.group(1));
                indices.add(index);
            } catch (NumberFormatException e) {
                // Bỏ qua giá trị số vượt giới hạn integer
            }
        }
        return indices;
    }

    /**
     * Chuyển đổi ToolSourceMetadata sang CitationDto chuẩn:
     * - sourceId, sourceName lấy từ Tool.
     * - url lấy từ Tool (metadata.sourceUrl()), không bao giờ lấy URL do LLM tự bịa.
     * - status bảo toàn với safe default UNVERIFIED.
     * - category được chuẩn hóa: GEOGRAPHY, HERITAGE, DOCUMENT.
     */
    public CitationDto toCitationDto(ToolSourceMetadata meta) {
        VerificationStatus safeStatus = (meta.verificationStatus() != null)
                ? meta.verificationStatus()
                : VerificationStatus.UNVERIFIED;

        String category = resolveCategory(meta);

        return new CitationDto(
                meta.sourceId(),
                meta.sourceName(),
                meta.provinceSlug(),
                category,
                meta.sourceUrl(), // URL gốc duy nhất từ backend, không dùng URL tự tạo từ LLM
                safeStatus
        );
    }

    private String resolveCategory(ToolSourceMetadata meta) {
        if (meta.sourceId() == null) {
            return "DOCUMENT";
        }
        String id = meta.sourceId().toLowerCase();
        if (id.startsWith("geo-")) {
            return "GEOGRAPHY";
        }
        if (id.startsWith("site-")) {
            return "HERITAGE";
        }
        return "DOCUMENT";
    }
}

