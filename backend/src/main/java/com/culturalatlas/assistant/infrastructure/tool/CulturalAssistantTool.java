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

    @Tool(
        name = "getProvinceCulture",
        description = "Truy xuất danh sách di sản văn hóa vật thể (di tích lịch sử, kiến trúc, danh lam thắng cảnh, di sản UNESCO) " +
                      "gắn với một tỉnh/thành phố cụ thể của Việt Nam theo mã provinceSlug. " +
                      "Dùng khi người dùng hỏi về di tích, danh thắng hoặc văn hóa của một địa phương. " +
                      "Không gọi công cụ này cho các câu hỏi chào hỏi xã giao hoặc kiến thức phổ thông không gắn với địa phương cụ thể."
    )
    public ToolExecutionResult<List<CulturalKnowledgeItemDto>> getProvinceCulture(
            @ToolParam(description = "Mã định danh kebab-case của địa phương (VD: 'ha-noi', 'thua-thien-hue', 'quang-ninh')", required = true)
            String provinceSlug
    ) {
        // 1. Phân biệt rõ ràng lỗi tham số đầu vào (INVALID_INPUT)
        if (provinceSlug == null || provinceSlug.isBlank()
                || provinceSlug.length() < 2 || provinceSlug.length() > 100
                || !SLUG_PATTERN.matcher(provinceSlug.trim()).matches()) {
            log.warn("Invalid provinceSlug provided to tool: {}", provinceSlug);
            return ToolExecutionResult.error(
                    ToolExecutionResult.ERROR_INVALID_INPUT,
                    "Mã provinceSlug không hợp lệ. Phải viết thường không dấu cách nhau bởi dấu gạch ngang (kebab-case, ví dụ: 'thua-thien-hue')."
            );
        }

        String cleanSlug = provinceSlug.trim();

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
            log.error("CulturalKnowledgePort service unavailable for slug {}: {}", cleanSlug, e.getMessage());
            return ToolExecutionResult.error(
                    ToolExecutionResult.ERROR_DEPENDENCY_UNAVAILABLE,
                    "Dịch vụ tri thức văn hóa không khả dụng. Vui lòng thử lại sau."
            );
        } catch (Exception e) {
            log.error("Unexpected error retrieving culture for slug {}: {}", cleanSlug, e.getMessage(), e);
            return ToolExecutionResult.error(
                    ToolExecutionResult.ERROR_INTERNAL_ERROR,
                    "Đã xảy ra lỗi nội bộ khi truy xuất dữ liệu văn hóa."
            );
        }
    }
}

