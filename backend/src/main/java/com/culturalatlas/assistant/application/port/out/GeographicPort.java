package com.culturalatlas.assistant.application.port.out;

import com.culturalatlas.assistant.application.dto.external.GeographicProvinceDto;
import com.culturalatlas.assistant.application.port.out.exception.GeographicServiceUnavailableException;

import java.util.List;
import java.util.Optional;

/**
 * Cổng giao tiếp Outbound truy vấn thông tin địa lý hành chính từ Module 1 (Geographic Intelligence).
 * Tuân thủ kiến trúc Hexagonal: Application Core chỉ phụ thuộc vào Port này, Adapter sẽ hiện thực ở tầng Infrastructure.
 */
public interface GeographicPort {

    /**
     * Lấy thông tin tỉnh/thành theo slug chuẩn (VD: 'ha-noi', 'thua-thien-hue').
     *
     * @param slug Mã định danh kebab-case của địa phương.
     * @return Optional chứa thông tin tỉnh nếu tìm thấy; Optional.empty() nếu không tìm thấy (NO_DATA).
     * @throws GeographicServiceUnavailableException khi module Geographic lỗi hệ thống hoặc timeout.
     */
    Optional<GeographicProvinceDto> getProvinceBySlug(String slug);

    /**
     * Xác định địa phương dựa trên tọa độ WGS84 (Point-in-Polygon).
     *
     * @param latitude  Vĩ độ hợp lệ [-90.0, 90.0].
     * @param longitude Kinh độ hợp lệ [-180.0, 180.0].
     * @return Optional chứa tỉnh bao phủ tọa độ; Optional.empty() nếu tọa độ rơi vào vùng biển hoặc ngoài biên giới Việt Nam (NO_DATA).
     * @throws GeographicServiceUnavailableException khi database PostGIS lỗi hoặc không phản hồi.
     */
    Optional<GeographicProvinceDto> identifyProvinceByCoordinates(Double latitude, Double longitude);

    /**
     * Lấy danh sách toàn bộ 63 tỉnh/thành phục vụ kiểm tra guardrail và gợi ý câu hỏi.
     *
     * @return Danh sách đầy đủ 63 tỉnh/thành (không bao giờ null).
     * @throws GeographicServiceUnavailableException khi không thể truy xuất dữ liệu tỉnh/thành.
     */
    List<GeographicProvinceDto> getAllProvinces();
}

