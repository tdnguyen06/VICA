package com.culturalatlas.assistant.infrastructure.tool;

import com.culturalatlas.assistant.application.dto.external.CulturalKnowledgeItemDto;
import com.culturalatlas.assistant.application.dto.tool.ToolExecutionResult;
import com.culturalatlas.assistant.application.dto.tool.ToolSourceMetadata;
import com.culturalatlas.assistant.application.port.out.CulturalKnowledgePort;
import com.culturalatlas.assistant.application.port.out.exception.CulturalKnowledgeUnavailableException;
import com.culturalatlas.assistant.domain.enums.VerificationStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Spring AI Tool hỗ trợ Gemini truy xuất danh mục di sản văn hóa vật thể của một tỉnh/thành.
 * Tuân thủ Hexagonal Architecture: Chỉ giao tiếp qua CulturalKnowledgePort, không truy cập Repository.
 *
 * <p><strong>Lưu ý về Verification Status:</strong> Nhãn {@link VerificationStatus#VERIFIED} hiện được gán
 * ở cấp danh mục di tích vì 63 thực thể trong {@code cultural_sites} là danh thắng/di tích quốc gia đã được xếp hạng
 * chính thức (seed qua Flyway V3). Điều này xác nhận sự tồn tại và danh tính của di sản, nhưng chưa đồng nghĩa
 * với việc mọi thông tin mô tả chi tiết hoặc niên đại văn hóa đi kèm đã được kiểm chứng độc lập từng thuộc tính.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CulturalAssistantTool {

    private final CulturalKnowledgePort culturalKnowledgePort;

    private static final Pattern SLUG_PATTERN = Pattern.compile("^[a-z0-9]+(?:-[a-z0-9]+)*$");
    private static final Pattern DIACRITICS_PATTERN = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    @Tool(
        name = "getProvinceCulture",
        description = "Truy xuất danh sách di sản văn hóa vật thể (di tích lịch sử, kiến trúc, danh lam thắng cảnh, di sản UNESCO) " +
                      "gắn với một tỉnh/thành phố cụ thể của Việt Nam theo mã provinceSlug (hoặc tên tỉnh). " +
                      "Dùng khi người dùng hỏi về di tích, danh thắng hoặc văn hóa của một địa phương. " +
                      "Không gọi công cụ này cho các câu hỏi chào hỏi xã giao hoặc kiến thức phổ thông không gắn với địa phương cụ thể."
    )
    public ToolExecutionResult<List<CulturalKnowledgeItemDto>> getProvinceCulture(
            @ToolParam(description = "Mã định danh kebab-case hoặc tên của địa phương (VD: 'ha-noi', 'thua-thien-hue', 'quang-ninh', 'Hà Nội')", required = true)
            String provinceSlug
    ) {
        String cleanSlug = normalizeToSlug(provinceSlug);

        // 1. Phân biệt rõ ràng lỗi tham số đầu vào (INVALID_INPUT)
        if (cleanSlug == null || cleanSlug.length() < 2 || cleanSlug.length() > 100) {
            log.warn("Invalid provinceSlug provided to tool: {}", provinceSlug);
            return ToolExecutionResult.error(
                    ToolExecutionResult.ERROR_INVALID_INPUT,
                    "Mã provinceSlug không hợp lệ. Phải viết thường không dấu cách nhau bởi dấu gạch ngang (kebab-case, ví dụ: 'thua-thien-hue')."
            );
        }

        try {
            // 2. Gọi qua Port trừu tượng
            List<CulturalKnowledgeItemDto> sites = culturalKnowledgePort.getSitesByProvince(cleanSlug);

            // 3. Phân biệt trường hợp không có dữ liệu di sản cho tỉnh (NO_DATA)
            if (sites == null || sites.isEmpty()) {
                log.debug("No cultural sites found for province slug: {}", cleanSlug);
                return ToolExecutionResult.noData(
                        "Hệ thống chưa có dữ liệu di sản văn hóa vật thể nào cho địa phương '" + cleanSlug + "'."
                );
            }

            // 4. Giữ nguyên VerificationStatus và trích xuất Metadata nguồn gốc
            List<ToolSourceMetadata> metadataList = sites.stream()
                    .map(site -> ToolSourceMetadata.builder()
                            .sourceId("site-" + site.slug())
                            .sourceName(site.name() + (site.categoryLabel() != null ? " (" + site.categoryLabel() + ")" : ""))
                            .provinceSlug(cleanSlug)
                            .verificationStatus(VerificationStatus.VERIFIED)
                            .build())
                    .toList();

            return ToolExecutionResult.success(
                    sites,
                    metadataList,
                    "Truy xuất thành công " + sites.size() + " di sản văn hóa vật thể của " + cleanSlug + "."
            );
        } catch (CulturalKnowledgeUnavailableException e) {
            log.warn("CulturalKnowledgePort service unavailable for slug {}: {}", cleanSlug, e.getMessage());
            return ToolExecutionResult.noData(
                    "Hệ thống tạm thời chưa có dữ liệu di sản cho địa phương '" + cleanSlug + "'."
            );
        } catch (Exception e) {
            log.warn("Unexpected error retrieving culture for slug {}: {}", cleanSlug, e.getMessage());
            return ToolExecutionResult.noData(
                    "Chưa thể truy xuất dữ liệu di sản cho địa phương '" + cleanSlug + "'."
            );
        }
    }

    private String normalizeToSlug(String input) {
        if (input == null || input.isBlank()) return null;
        String trimmed = input.trim();
        if (SLUG_PATTERN.matcher(trimmed).matches()) {
            return trimmed;
        }
        String nfd = Normalizer.normalize(trimmed, Normalizer.Form.NFD);
        String noDiacritics = DIACRITICS_PATTERN.matcher(nfd).replaceAll("")
                .replace("đ", "d").replace("Đ", "d");
        String slug = noDiacritics.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return slug.isBlank() ? null : slug;
    }
}

