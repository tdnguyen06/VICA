package com.culturalatlas.geography;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GeographicService {
    private final ProvinceRepository provinces;

    public GeographicService(ProvinceRepository provinces) {
        this.provinces = provinces;
    }

    public List<ProvinceDto> list() {
        return provinces.findAll().stream().map(GeographicService::toDto).toList();
    }

    public ProvinceDto detail(String slug) {
        return provinces.findBySlug(slug).map(GeographicService::toDto)
                .orElseThrow(ProvinceNotFoundException::new);
    }

    public ProvinceDto identify(IdentifyProvinceRequest request) {
        return provinces.identify(request.latitude(), request.longitude())
                .map(GeographicService::toDto).orElse(null);
    }

    private static ProvinceDto toDto(Province province) {
        return new ProvinceDto(province.getId(), province.getSlug(), province.getName(), province.getAdminUnit());
    }
}
