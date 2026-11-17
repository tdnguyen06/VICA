package com.culturalatlas.culture.dto;

import com.culturalatlas.culture.enums.EntryType;
import com.culturalatlas.culture.enums.MediaType;
import com.culturalatlas.culture.enums.ReviewStatus;
import com.culturalatlas.culture.enums.VerificationStatus;
import com.culturalatlas.geography.ProvinceDto;

import java.util.List;
import java.util.Map;

/** Public response contracts of the Cultural API (see docs/api/culture-api.md). */
public final class CultureDtos {
    private CultureDtos() {
    }

    public record CoordinateDto(double latitude, double longitude) {
    }

    public record SourceDto(Long id, String title, String author, String publisher, String sourceType,
                            String url, Integer publishedYear, ReviewStatus reviewStatus, String citationNote) {
    }

    public record MediaDto(Long id, MediaType mediaType, String url, String caption, String credit) {
    }

    public record EntrySummaryDto(Long id, String slug, String provinceSlug, EntryType type, String category,
                                  String name, String summary, VerificationStatus verificationStatus,
                                  CoordinateDto coordinate, String thumbnailUrl, int sourceCount) {
    }

    public record EntryDetailDto(Long id, String slug, String provinceSlug, EntryType type, String category,
                                 String name, String summary, String description,
                                 VerificationStatus verificationStatus, String historicalPeriod,
                                 CoordinateDto coordinate, List<SourceDto> sources, List<MediaDto> media) {
    }

    public record ProvinceOverviewDto(ProvinceDto province, String overview,
                                      Map<EntryType, Long> counts, List<EntrySummaryDto> highlights) {
    }
}
