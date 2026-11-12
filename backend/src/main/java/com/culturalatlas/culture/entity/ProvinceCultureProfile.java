package com.culturalatlas.culture.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "province_culture_profiles")
@Getter 
@Setter 
@NoArgsConstructor
public class ProvinceCultureProfile {
    @Id @Column(name = "province_slug", nullable = false, length = 100)
    private String provinceSlug;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String overview;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
