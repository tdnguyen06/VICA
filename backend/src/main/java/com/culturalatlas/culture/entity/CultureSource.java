package com.culturalatlas.culture.entity;

import com.culturalatlas.common.BaseEntity;
import com.culturalatlas.culture.enums.ReviewStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "culture_sources")
@Getter
@Setter
@NoArgsConstructor
public class CultureSource extends BaseEntity {

    @Column(nullable = false, length = 500)
    private String title;

    private String author;

    private String publisher;

    @Column(name = "source_type", nullable = false, length = 30)
    private String sourceType;

    /** Optional: books and oral sources often have no URL. */
    @Column(length = 1000)
    private String url;

    @Column(name = "published_year")
    private Integer publishedYear;

    @Column(name = "accessed_at")
    private LocalDate accessedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 20)
    private ReviewStatus reviewStatus = ReviewStatus.APPROVED;
}
