package com.culturalatlas.heritage;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CulturalSiteDto {
    private Long id;
    private String name;
    private String slug;
    private String category;
    private String categoryLabel;
    private String province;
    private Double lat;
    private Double lng;
    private String description;
    private Integer unescoYear;
    private String historicalPeriod;
    private String thumbnailUrl;
    private String color;
    private Boolean featured;

    public static CulturalSiteDto fromEntity(CulturalSite entity) {
        return CulturalSiteDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .slug(entity.getSlug())
                .category(entity.getCategory())
                .categoryLabel(entity.getCategoryLabel())
                .province(entity.getProvince())
                .lat(entity.getLatitude())
                .lng(entity.getLongitude())
                .description(entity.getDescription())
                .unescoYear(entity.getUnescoYear())
                .historicalPeriod(entity.getHistoricalPeriod())
                .thumbnailUrl(entity.getThumbnailUrl())
                .color(entity.getColor())
                .featured(entity.getFeatured())
                .build();
    }
}

