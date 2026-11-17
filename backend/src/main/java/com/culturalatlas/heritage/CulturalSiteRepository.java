package com.culturalatlas.heritage;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CulturalSiteRepository extends JpaRepository<CulturalSite, Long> {

    List<CulturalSite> findByCategoryIgnoreCase(String category);

    List<CulturalSite> findByProvinceIgnoreCase(String province);

    Optional<CulturalSite> findBySlug(String slug);

    List<CulturalSite> findByFeaturedTrue();
}

