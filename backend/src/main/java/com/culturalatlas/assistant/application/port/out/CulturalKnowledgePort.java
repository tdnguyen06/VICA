package com.culturalatlas.assistant.application.port.out;

import com.culturalatlas.assistant.application.dto.external.CulturalKnowledgeItemDto;
import com.culturalatlas.assistant.application.port.out.exception.CulturalKnowledgeUnavailableException;

import java.util.List;
import java.util.Optional;

/**
 * Cổng giao tiếp Outbound truy vấn tri thức văn hóa, di sản từ Module 2 (Cultural Knowledge Platform).
 * Tuân thủ phạm vi MVP: Chỉ hỗ trợ di sản vật thể (CulturalSite).
 */
public interface CulturalKnowledgePort {

    /**
     * Lấy danh sách di sản văn hóa vật thể gắn liền với một tỉnh/thành.
     *
     * @param provinceSlug Mã định danh địa phương (VD: 'thua-thien-hue').
     * @return Danh sách di sản (danh sách rỗng nếu địa phương chưa có di sản nào trong hệ thống - NO_DATA).
     * @throws CulturalKnowledgeUnavailableException khi dịch vụ Cultural Knowledge lỗi hoặc không phản hồi.
     */
    List<CulturalKnowledgeItemDto> getSitesByProvince(String provinceSlug);

    /**
     * Lấy thông tin chi tiết một di sản văn hóa theo slug.
     *
     * @param slug Định danh di sản (VD: 'chua-thien-mu').
     * @return Optional chứa thông tin di sản; Optional.empty() nếu không tìm thấy (NO_DATA).
     * @throws CulturalKnowledgeUnavailableException khi có lỗi hệ thống xảy ra.
     */
    Optional<CulturalKnowledgeItemDto> getSiteBySlug(String slug);

    /**
     * Lấy danh sách di sản văn hóa theo danh mục (lịch sử, kiến trúc, danh lam thắng cảnh...).
     *
     * @param category Tên danh mục văn hóa.
     * @return Danh sách di sản thuộc danh mục (rỗng nếu danh mục không tồn tại - NO_DATA).
     * @throws CulturalKnowledgeUnavailableException khi có lỗi hệ thống xảy ra.
     */
    List<CulturalKnowledgeItemDto> getSitesByCategory(String category);
}

