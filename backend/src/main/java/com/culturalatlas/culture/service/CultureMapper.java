package com.culturalatlas.culture.service;

import com.culturalatlas.culture.dto.CultureDtos.CoordinateDto;
import com.culturalatlas.culture.dto.CultureDtos.EntryDetailDto;
import com.culturalatlas.culture.dto.CultureDtos.EntrySummaryDto;
import com.culturalatlas.culture.dto.CultureDtos.MediaDto;
import com.culturalatlas.culture.dto.CultureDtos.SourceDto;
import com.culturalatlas.culture.entity.CultureEntry;
import com.culturalatlas.culture.entity.CultureEntrySource;
import com.culturalatlas.culture.entity.CultureMedia;
import com.culturalatlas.culture.entity.CultureSource;
import com.culturalatlas.culture.enums.MediaType;
import com.culturalatlas.culture.enums.ReviewStatus;

import java.util.List;

/** Converts entities to public DTOs. Must be called inside a transaction (lazy collections). */
final class CultureMapper {
    private CultureMapper() {
    }

    static EntrySummaryDto summary(CultureEntry e) {
        String thumbnail = e.getMedia().stream()
                .filter(m -> m.getMediaType() == MediaType.IMAGE)
                .map(CultureMedia::getUrl)
                .findFirst().orElse(null);
        return new EntrySummaryDto(e.getId(), e.getSlug(), e.getProvinceSlug(), e.getEntryType(),
                e.getCategory(), e.getName(), e.getSummary(), e.getVerificationStatus(),
                coordinate(e), thumbnail, approvedSources(e).size());
    }

    static EntryDetailDto detail(CultureEntry e) {
        List<SourceDto> sources = approvedSources(e).stream().map(link -> {
            CultureSource s = link.getCultureSource();
            return new SourceDto(s.getId(), s.getTitle(), s.getAuthor(), s.getPublisher(), s.getSourceType(),
                    s.getUrl(), s.getPublishedYear(), s.getReviewStatus(), link.getCitationNote());
        }).toList();
        List<MediaDto> media = e.getMedia().stream()
                .map(m -> new MediaDto(m.getId(), m.getMediaType(), m.getUrl(), m.getCaption(), m.getCredit()))
                .toList();
        return new EntryDetailDto(e.getId(), e.getSlug(), e.getProvinceSlug(), e.getEntryType(), e.getCategory(),
                e.getName(), e.getSummary(), e.getDescription(), e.getVerificationStatus(),
                e.getHistoricalPeriod(), coordinate(e), sources, media);
    }

    /** Public API only exposes sources that passed review (contract section 2). */
    private static List<CultureEntrySource> approvedSources(CultureEntry e) {
        return e.getSources().stream()
                .filter(link -> link.getCultureSource().getReviewStatus() == ReviewStatus.APPROVED)
                .toList();
    }

    private static CoordinateDto coordinate(CultureEntry e) {
        return e.getLatitude() == null ? null : new CoordinateDto(e.getLatitude(), e.getLongitude());
    }
}