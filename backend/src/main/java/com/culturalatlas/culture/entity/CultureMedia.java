package com.culturalatlas.culture.entity;

import com.culturalatlas.culture.enums.MediaType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "culture_media")
@Getter 
@Setter 
@NoArgsConstructor
public class CultureMedia {
    
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "entry_id")
    private CultureEntry cultureEntry; 

    @Enumerated(EnumType.STRING) @Column(name = "media_type", nullable = false, length = 20)
    private MediaType mediaType;

    @Column(nullable = false, length = 1000)
    private String url;

    @Column(length = 500)
    private String caption;

    @Column(length = 255)
    private String credit;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;
}
