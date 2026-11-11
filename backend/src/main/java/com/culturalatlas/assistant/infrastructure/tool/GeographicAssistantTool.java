package com.culturalatlas.assistant.infrastructure.tool;

import com.culturalatlas.assistant.application.dto.external.GeographicProvinceDto;
import com.culturalatlas.assistant.application.dto.tool.ToolExecutionResult;
import com.culturalatlas.assistant.application.dto.tool.ToolSourceMetadata;
import com.culturalatlas.assistant.application.port.out.GeographicPort;
import com.culturalatlas.assistant.application.port.out.exception.GeographicServiceUnavailableException;
import com.culturalatlas.assistant.domain.enums.VerificationStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Spring AI Tool hỗ trợ Gemini xác định địa phương (tỉnh/thành) từ tọa độ không gian WGS84.
 * Tuân thủ Hexagonal Architecture: Chỉ giao tiếp qua GeographicPort, không truy cập Repository.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GeographicAssistantTool {

    private final GeographicPort geographicPort;

    @Tool(
        name = "identifyProvinceByCoordinates",
        description = "Xác định địa phương (tỉnh/thành phố) của Việt Nam từ tọa độ địa lý WGS84 (vĩ độ/kinh độ). " +
                      "Dùng khi người dùng bấm vào một điểm trên bản đồ hoặc hỏi về một cặp tọa độ cụ thể. " +
                      "Không gọi công cụ này nếu câu hỏi đã có sẵn tên tỉnh/thành hoặc không chứa tọa độ."
    )
    public ToolExecutionResult<GeographicProvinceDto> identifyProvinceByCoordinates(
            @ToolParam(description = "Vĩ độ WGS84, giá trị hợp lệ từ -90.0 đến 90.0", required = true)
            Double latitude,

            @ToolParam(description = "Kinh độ WGS84, giá trị hợp lệ từ -180.0 đến 180.0", required = true)
            Double longitude
    ) {
        // 1. Phân biệt rõ ràng lỗi tọa độ không hợp lệ (INVALID_INPUT)
        if (latitude == null || longitude == null
                || Double.isNaN(latitude) || Double.isInfinite(latitude)
                || Double.isNaN(longitude) || Double.isInfinite(longitude)
                || latitude < -90.0 || latitude > 90.0
                || longitude < -180.0 || longitude > 180.0) {
            log.warn("Invalid coordinates provided to tool: lat={}, lng={}", latitude, longitude);
            return ToolExecutionResult.error(
                    ToolExecutionResult.ERROR_INVALID_INPUT,
                    "Tọa độ WGS84 không hợp lệ. Vĩ độ phải nằm trong khoảng [-90.0, 90.0], kinh độ trong khoảng [-180.0, 180.0]."
            );
        }

        try {
            // 2. Gọi qua Port trừu tượng
            Optional<GeographicProvinceDto> provinceOpt = geographicPort.identifyProvinceByCoordinates(latitude, longitude);

            // 3. Phân biệt tọa độ hợp lệ nhưng nằm ngoài vùng dữ liệu (NO_DATA)
            if (provinceOpt.isEmpty()) {
                log.debug("Coordinates ({}, {}) located outside Vietnam administrative boundaries", latitude, longitude);
                return ToolExecutionResult.noData(
                        "Tọa độ (" + latitude + ", " + longitude + ") nằm ngoài phạm vi lãnh thổ hành chính dữ liệu của Việt Nam."
                );
            }

            GeographicProvinceDto province = provinceOpt.get();
            ToolSourceMetadata metadata = ToolSourceMetadata.builder()
                    .sourceId("geo-" + province.slug())
                    .sourceName("Bản đồ địa giới hành chính Việt Nam (PostGIS)")
                    .provinceSlug(province.slug())
                    .verificationStatus(VerificationStatus.VERIFIED)
                    .build();

            return ToolExecutionResult.success(
                    province,
                    List.of(metadata),
                    "Đã xác định được địa phương: " + province.name() + " (" + province.adminUnit() + ")."
            );
        } catch (GeographicServiceUnavailableException e) {
            log.error("GeographicPort service unavailable for coordinates ({}, {}): {}", latitude, longitude, e.getMessage());
            return ToolExecutionResult.error(
                    ToolExecutionResult.ERROR_DEPENDENCY_UNAVAILABLE,
                    "Dịch vụ tra cứu địa lý không khả dụng. Vui lòng thử lại sau."
            );
        } catch (Exception e) {
            log.error("Unexpected error identifying coordinates ({}, {}): {}", latitude, longitude, e.getMessage(), e);
            return ToolExecutionResult.error(
                    ToolExecutionResult.ERROR_INTERNAL_ERROR,
                    "Đã xảy ra lỗi nội bộ khi xử lý tọa độ địa lý."
            );
        }
    }
}

