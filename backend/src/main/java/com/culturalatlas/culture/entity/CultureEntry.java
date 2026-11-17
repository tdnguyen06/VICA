package com.culturalatlas.culture.entity;

import com.culturalatlas.common.BaseEntity;
import com.culturalatlas.culture.enums.EntryType;
import com.culturalatlas.culture.enums.VerificationStatus;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "culture_entries")
@Getter
@Setter
@NoArgsConstructor
public class CultureEntry extends BaseEntity {

    @Column(nullable = false, unique = true, length = 200)
    private String slug;

    /** Province.slug from the Geographic registry; no FK, validated through GeographicService. */
    @Column(name = "province_slug", nullable = false, length = 100)
    private String provinceSlug;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, length = 20)
    private EntryType entryType;

    @Column(length = 50)
    private String category;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 500)
    private String summary;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 20)
    private VerificationStatus verificationStatus;

    @Column(name = "historical_period", length = 150)
    private String historicalPeriod;

    private Double latitude;

    private Double longitude;

    @Column(nullable = false)
    private Boolean featured = false;

    @OneToMany(mappedBy = "cultureEntry", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CultureEntrySource> sources = new ArrayList<>();

    @OneToMany(mappedBy = "cultureEntry", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<CultureMedia> media = new ArrayList<>();
}