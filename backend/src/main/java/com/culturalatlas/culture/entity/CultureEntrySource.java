package com.culturalatlas.culture.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "culture_entry_sources")
@Getter 
@Setter 
@NoArgsConstructor
public class CultureEntrySource {
    
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "entry_id")
    private CultureEntry cultureEntry;

    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "source_id")
    private CultureSource cultureSource;

    @Column(name = "citation_note", length = 500)
    private String citationNote;
}
