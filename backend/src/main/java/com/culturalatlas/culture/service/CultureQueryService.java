package com.culturalatlas.culture.service;

import com.culturalatlas.culture.dto.CultureDtos.EntryDetailDto;
import com.culturalatlas.culture.dto.CultureDtos.EntrySummaryDto;
import com.culturalatlas.culture.dto.CultureDtos.ProvinceOverviewDto;
import com.culturalatlas.culture.entity.ProvinceCultureProfile;
import com.culturalatlas.culture.enums.EntryType;
import com.culturalatlas.culture.exception.CultureEntryNotFoundException;
import com.culturalatlas.culture.repository.CultureEntryRepository;
import com.culturalatlas.culture.repository.ProvinceCultureProfileRepository;
import com.culturalatlas.geography.GeographicService;
import com.culturalatlas.geography.ProvinceDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CultureQueryService {
    private final GeographicService geographicService;   // Geographic owns Province; 404 if slug unknown
    private final CultureEntryRepository entries;
    private final ProvinceCultureProfileRepository profiles;

    public ProvinceOverviewDto overview(String provinceSlug) {
        ProvinceDto province = geographicService.detail(provinceSlug);
        Map<EntryType, Long> counts = new EnumMap<>(EntryType.class);
        for (EntryType t : EntryType.values()) counts.put(t, 0L);
        for (Object[] row : entries.countByType(provinceSlug)) counts.put((EntryType) row[0], (Long) row[1]);
        List<EntrySummaryDto> highlights = entries.findTop6ByProvinceSlugAndFeaturedTrueOrderByNameAsc(provinceSlug)
                .stream().map(CultureMapper::summary).toList();
        String overview = profiles.findById(provinceSlug).map(ProvinceCultureProfile::getOverview).orElse(null);
        return new ProvinceOverviewDto(province, overview, counts, highlights);
    }

    public List<EntrySummaryDto> list(String provinceSlug, EntryType type) {
        geographicService.detail(provinceSlug);
        return entries.findByProvinceSlugAndEntryTypeOrderByFeaturedDescNameAsc(provinceSlug, type)
                .stream().map(CultureMapper::summary).toList();
    }

    public EntryDetailDto entry(Long id) {
        return entries.findById(id).map(CultureMapper::detail)
                .orElseThrow(() -> new CultureEntryNotFoundException(id));
    }

    public EntryDetailDto heritage(Long id) {
        return entries.findById(id).filter(e -> e.getEntryType() == EntryType.HERITAGE)
                .map(CultureMapper::detail)
                .orElseThrow(() -> new CultureEntryNotFoundException(id));
    }
}
