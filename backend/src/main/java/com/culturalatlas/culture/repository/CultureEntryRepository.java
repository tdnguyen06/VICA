package com.culturalatlas.culture.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.culturalatlas.culture.entity.CultureEntry;
import com.culturalatlas.culture.enums.EntryType;

import java.util.List;

public interface CultureEntryRepository extends JpaRepository<CultureEntry, Long> {
    List<CultureEntry> findByProvinceSlugAndEntryTypeOrderByFeaturedDescNameAsc(String provinceSlug, EntryType type);

    List<CultureEntry> findTop6ByProvinceSlugAndFeaturedTrueOrderByNameAsc(String provinceSlug);

    @Query("select e.entryType, count(e) from CultureEntry e where e.provinceSlug = :slug group by e.entryType")
    List<Object[]> countByType(@Param("slug") String provinceSlug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);    
}
