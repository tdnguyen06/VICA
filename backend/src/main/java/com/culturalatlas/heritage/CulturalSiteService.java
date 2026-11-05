package com.culturalatlas.heritage;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CulturalSiteService {

    private final CulturalSiteRepository culturalSiteRepository;

    public List<CulturalSiteDto> getAllSites(String category) {
        List<CulturalSite> sites;
        if (category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("all")) {
            sites = culturalSiteRepository.findByCategoryIgnoreCase(category.trim());
        } else {
            sites = culturalSiteRepository.findAll();
        }
        return sites.stream().map(CulturalSiteDto::fromEntity).toList();
    }

    public Optional<CulturalSiteDto> getSiteBySlug(String slug) {
        return culturalSiteRepository.findBySlug(slug).map(CulturalSiteDto::fromEntity);
    }

    public Optional<CulturalSiteDto> getSiteById(Long id) {
        return culturalSiteRepository.findById(id).map(CulturalSiteDto::fromEntity);
    }
}

