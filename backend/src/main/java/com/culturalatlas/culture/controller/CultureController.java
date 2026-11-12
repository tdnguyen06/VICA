package com.culturalatlas.culture.controller;

import com.culturalatlas.common.ApiResponse;
import com.culturalatlas.culture.dto.CultureDtos.EntryDetailDto;
import com.culturalatlas.culture.dto.CultureDtos.EntrySummaryDto;
import com.culturalatlas.culture.dto.CultureDtos.ProvinceOverviewDto;
import com.culturalatlas.culture.enums.EntryType;
import com.culturalatlas.culture.service.CultureQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cultures")
@RequiredArgsConstructor
@Tag(name = "Culture", description = "Cultural knowledge by provinceSlug, with sources and VERIFIED/LEGEND status")
public class CultureController {
    private final CultureQueryService service;

    @GetMapping("/provinces/{slug}")
    @Operation(summary = "Province culture overview: profile, counts per type, featured entries")
    public ApiResponse<ProvinceOverviewDto> overview(@PathVariable String slug) {
        return ApiResponse.success(service.overview(slug));
    }

    @GetMapping("/provinces/{slug}/heritages")
    public ApiResponse<List<EntrySummaryDto>> heritages(@PathVariable String slug) {
        return ApiResponse.success(service.list(slug, EntryType.HERITAGE));
    }

    @GetMapping("/provinces/{slug}/cuisines")
    public ApiResponse<List<EntrySummaryDto>> cuisines(@PathVariable String slug) {
        return ApiResponse.success(service.list(slug, EntryType.CUISINE));
    }

    @GetMapping("/provinces/{slug}/festivals")
    public ApiResponse<List<EntrySummaryDto>> festivals(@PathVariable String slug) {
        return ApiResponse.success(service.list(slug, EntryType.FESTIVAL));
    }

    @GetMapping("/provinces/{slug}/figures")
    public ApiResponse<List<EntrySummaryDto>> figures(@PathVariable String slug) {
        return ApiResponse.success(service.list(slug, EntryType.FIGURE));
    }

    @GetMapping("/provinces/{slug}/places")
    public ApiResponse<List<EntrySummaryDto>> places(@PathVariable String slug) {
        return ApiResponse.success(service.list(slug, EntryType.PLACE));
    }

    @GetMapping("/heritages/{id}")
    @Operation(summary = "Heritage detail with sources and media; 404 if id is not a heritage")
    public ApiResponse<EntryDetailDto> heritage(@PathVariable Long id) {
        return ApiResponse.success(service.heritage(id));
    }

    @GetMapping("/entries/{id}")
    @Operation(summary = "Detail of any culture entry (cuisine, festival, figure, place, heritage)")
    public ApiResponse<EntryDetailDto> entry(@PathVariable Long id) {
        return ApiResponse.success(service.entry(id));
    }
}
