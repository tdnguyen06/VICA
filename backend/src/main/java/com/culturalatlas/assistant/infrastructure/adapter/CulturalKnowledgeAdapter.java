package com.culturalatlas.assistant.infrastructure.adapter;

import com.culturalatlas.assistant.application.dto.external.CulturalKnowledgeItemDto;
import com.culturalatlas.assistant.application.port.out.CulturalKnowledgePort;
import com.culturalatlas.assistant.application.port.out.GeographicPort;
import com.culturalatlas.assistant.application.port.out.exception.CulturalKnowledgeUnavailableException;
import com.culturalatlas.heritage.CulturalSiteDto;
import com.culturalatlas.heritage.CulturalSiteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * In-Process Adapter kết nối với CulturalSiteService của Member 2.
 * Tuân thủ nghiêm ngặt ranh giới kiến trúc: Adapter -> CulturalSiteService (không gọi Repository trực tiếp).
 * Truy vấn dữ liệu 63 di sản cốt lõi thực tế đã seed trong database.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CulturalKnowledgeAdapter implements CulturalKnowledgePort {

    private final CulturalSiteService culturalSiteService;
    private final GeographicPort geographicPort;

    private static final Pattern DIACRITICS_PATTERN = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    @Override
    public List<CulturalKnowledgeItemDto> getSitesByProvince(String provinceSlug) {
        if (provinceSlug == null || provinceSlug.isBlank()) {
            return List.of();
        }
        try {
            // Xác định tên hiển thị của tỉnh từ GeographicPort để đối chiếu với trường province trong CulturalSite
            String expectedProvinceName = geographicPort.getProvinceBySlug(provinceSlug)
                    .map(p -> p.name().trim())
                    .orElse(null);

            String normalizedSlug = normalizeSlug(provinceSlug);

            List<CulturalSiteDto> allSites = culturalSiteService.getAllSites(null);
            if (allSites == null || allSites.isEmpty()) {
                return List.of();
            }

            return allSites.stream()
                    .filter(site -> matchesProvince(site, expectedProvinceName, normalizedSlug))
                    .map(this::toExternalDto)
                    .toList();
        } catch (Exception e) {
            log.error("Error retrieving cultural sites for province {}: {}", provinceSlug, e.getMessage(), e);
            throw new CulturalKnowledgeUnavailableException("getSitesByProvince", "Cultural knowledge service failure for province: " + provinceSlug, e);
        }
    }

    @Override
    public Optional<CulturalKnowledgeItemDto> getSiteBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return Optional.empty();
        }
        try {
            return culturalSiteService.getSiteBySlug(slug.trim())
                    .map(this::toExternalDto);
        } catch (Exception e) {
            log.error("Error retrieving cultural site by slug {}: {}", slug, e.getMessage(), e);
            throw new CulturalKnowledgeUnavailableException("getSiteBySlug", "Cultural knowledge service failure for site slug: " + slug, e);
        }
    }

    @Override
    public List<CulturalKnowledgeItemDto> getSitesByCategory(String category) {
        if (category == null || category.isBlank()) {
            return List.of();
        }
        try {
            List<CulturalSiteDto> sites = culturalSiteService.getAllSites(category.trim());
            if (sites == null || sites.isEmpty()) {
                return List.of();
            }
            return sites.stream()
                    .map(this::toExternalDto)
                    .toList();
        } catch (Exception e) {
            log.error("Error retrieving cultural sites for category {}: {}", category, e.getMessage(), e);
            throw new CulturalKnowledgeUnavailableException("getSitesByCategory", "Cultural knowledge service failure for category: " + category, e);
        }
    }

    private boolean matchesProvince(CulturalSiteDto site, String expectedProvinceName, String normalizedSlug) {
        if (site == null || site.getProvince() == null) {
            return false;
        }
        String siteProvince = site.getProvince().trim();

        // 1. So khớp chính xác tên tiếng Việt
        if (expectedProvinceName != null && siteProvince.equalsIgnoreCase(expectedProvinceName)) {
            return true;
        }

        // 2. So khớp normalized slug
        String siteProvinceSlug = normalizeSlug(siteProvince);
        return siteProvinceSlug.equals(normalizedSlug);
    }

    private String normalizeSlug(String input) {
        if (input == null) {
            return "";
        }
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        String withoutDiacritics = DIACRITICS_PATTERN.matcher(normalized).replaceAll("");
        return withoutDiacritics.toLowerCase(Locale.ROOT)
                .replace("đ", "d")
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
    }

    private CulturalKnowledgeItemDto toExternalDto(CulturalSiteDto dto) {
        if (dto == null) {
            return null;
        }
        return new CulturalKnowledgeItemDto(
                dto.getId(),
                dto.getName(),
                dto.getSlug(),
                dto.getCategory(),
                dto.getCategoryLabel(),
                dto.getProvince(),
                dto.getLat(),
                dto.getLng(),
                dto.getDescription(),
                dto.getUnescoYear(),
                dto.getHistoricalPeriod()
        );
    }
}

