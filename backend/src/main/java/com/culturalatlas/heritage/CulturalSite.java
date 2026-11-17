package com.culturalatlas.heritage;

import com.culturalatlas.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "cultural_sites")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CulturalSite extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(name = "category_label", nullable = false, length = 100)
    private String categoryLabel;

    @Column(nullable = false, length = 100)
    private String province;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "unesco_year")
    private Integer unescoYear;

    @Column(name = "historical_period", length = 100)
    private String historicalPeriod;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String color = "#d97706";

    @Column(nullable = false)
    @Builder.Default
    private Boolean featured = false;
}

