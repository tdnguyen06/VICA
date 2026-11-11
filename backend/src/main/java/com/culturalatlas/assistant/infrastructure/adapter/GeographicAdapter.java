package com.culturalatlas.assistant.infrastructure.adapter;

import com.culturalatlas.assistant.application.dto.external.GeographicProvinceDto;
import com.culturalatlas.assistant.application.port.out.GeographicPort;
import com.culturalatlas.assistant.application.port.out.exception.GeographicServiceUnavailableException;
import com.culturalatlas.geography.GeographicService;
import com.culturalatlas.geography.IdentifyProvinceRequest;
import com.culturalatlas.geography.ProvinceDto;
import com.culturalatlas.geography.ProvinceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * In-Process Adapter kết nối trực tiếp với GeographicService của Member 1.
 * Truy vấn dữ liệu thực tế từ PostgreSQL PostGIS và bảng provinces.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GeographicAdapter implements GeographicPort {

    private final GeographicService geographicService;

    @Override
    public Optional<GeographicProvinceDto> getProvinceBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return Optional.empty();
        }
        try {
            ProvinceDto provinceDto = geographicService.detail(slug.trim());
            return Optional.ofNullable(toExternalDto(provinceDto));
        } catch (ProvinceNotFoundException e) {
            log.debug("Province not found for slug: {}", slug);
            return Optional.empty();
        } catch (Exception e) {
            log.error("Error retrieving province by slug {}: {}", slug, e.getMessage(), e);
            throw new GeographicServiceUnavailableException("getProvinceBySlug", "Geographic service failure when finding slug: " + slug, e);
        }
    }

    @Override
    public Optional<GeographicProvinceDto> identifyProvinceByCoordinates(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return Optional.empty();
        }
        try {
            ProvinceDto identified = geographicService.identify(new IdentifyProvinceRequest(
                    BigDecimal.valueOf(latitude),
                    BigDecimal.valueOf(longitude)
            ));
            return Optional.ofNullable(toExternalDto(identified));
        } catch (Exception e) {
            log.error("Error identifying province by coordinates ({}, {}): {}", latitude, longitude, e.getMessage(), e);
            throw new GeographicServiceUnavailableException("identifyProvinceByCoordinates", "Geographic service failure when identifying coordinates (" + latitude + ", " + longitude + ")", e);
        }
    }

    @Override
    public List<GeographicProvinceDto> getAllProvinces() {
        try {
            List<ProvinceDto> list = geographicService.list();
            if (list == null || list.isEmpty()) {
                return List.of();
            }
            return list.stream()
                    .map(this::toExternalDto)
                    .toList();
        } catch (Exception e) {
            log.error("Error fetching all provinces: {}", e.getMessage(), e);
            throw new GeographicServiceUnavailableException("getAllProvinces", "Geographic service failure when listing all provinces", e);
        }
    }

    private GeographicProvinceDto toExternalDto(ProvinceDto dto) {
        if (dto == null) {
            return null;
        }
        return new GeographicProvinceDto(
                dto.id(),
                dto.slug(),
                dto.name(),
                dto.adminUnit()
        );
    }
}

