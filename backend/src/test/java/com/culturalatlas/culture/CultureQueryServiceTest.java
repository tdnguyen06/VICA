package com.culturalatlas.culture;

import com.culturalatlas.culture.dto.CultureDtos.EntryDetailDto;
import com.culturalatlas.culture.dto.CultureDtos.ProvinceOverviewDto;
import com.culturalatlas.culture.dto.CultureDtos.SourceDto;
import com.culturalatlas.culture.entity.CultureEntry;
import com.culturalatlas.culture.entity.CultureEntrySource;
import com.culturalatlas.culture.entity.CultureSource;
import com.culturalatlas.culture.enums.EntryType;
import com.culturalatlas.culture.enums.ReviewStatus;
import com.culturalatlas.culture.enums.VerificationStatus;
import com.culturalatlas.culture.exception.CultureEntryNotFoundException;
import com.culturalatlas.culture.repository.CultureEntryRepository;
import com.culturalatlas.culture.repository.ProvinceCultureProfileRepository;
import com.culturalatlas.culture.service.CultureQueryService;
import com.culturalatlas.geography.GeographicService;
import com.culturalatlas.geography.ProvinceDto;
import com.culturalatlas.geography.ProvinceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Cultural is a consumer of Geographic: GeographicService is mocked, never its repository. */
class CultureQueryServiceTest {
    private GeographicService geo;
    private CultureEntryRepository entries;
    private ProvinceCultureProfileRepository profiles;
    private CultureQueryService service;

    @BeforeEach
    void setUp() {
        geo = mock(GeographicService.class);
        entries = mock(CultureEntryRepository.class);
        profiles = mock(ProvinceCultureProfileRepository.class);
        service = new CultureQueryService(geo, entries, profiles);
    }

    @Test
    void unknownProvinceIsRejectedBeforeQueryingContent() {
        when(geo.detail("khong-co")).thenThrow(new ProvinceNotFoundException());

        assertThatThrownBy(() -> service.list("khong-co", EntryType.HERITAGE))
                .isInstanceOf(ProvinceNotFoundException.class);
        verifyNoInteractions(entries);
    }

    @Test
    void overviewHasAllTypeCountsEvenWhenEmpty() {
        when(geo.detail("ha-noi")).thenReturn(new ProvinceDto(24L, "ha-noi", "Hà Nội", "Thành phố Hà Nội"));
        when(entries.countByType("ha-noi")).thenReturn(List.<Object[]>of(new Object[]{EntryType.FIGURE, 2L}));
        when(entries.findTop6ByProvinceSlugAndFeaturedTrueOrderByNameAsc("ha-noi")).thenReturn(List.of());
        when(profiles.findById("ha-noi")).thenReturn(Optional.empty());

        ProvinceOverviewDto dto = service.overview("ha-noi");

        assertThat(dto.counts()).hasSize(EntryType.values().length);
        assertThat(dto.counts().get(EntryType.FIGURE)).isEqualTo(2L);
        assertThat(dto.counts().get(EntryType.CUISINE)).isZero();
        assertThat(dto.province().name()).isEqualTo("Hà Nội");   // name comes from Geographic, not stored here
        assertThat(dto.overview()).isNull();
    }

    @Test
    void detailHidesSourcesThatAreNotApproved() {
        CultureEntry entry = heritage(1L);
        entry.getSources().add(link(entry, 1L, ReviewStatus.APPROVED));
        entry.getSources().add(link(entry, 2L, ReviewStatus.PENDING));
        entry.getSources().add(link(entry, 3L, ReviewStatus.REJECTED));
        when(entries.findById(1L)).thenReturn(Optional.of(entry));

        EntryDetailDto dto = service.heritage(1L);

        assertThat(dto.sources()).extracting(SourceDto::id).containsExactly(1L);
    }

    @Test
    void heritageEndpointRejectsOtherEntryTypes() {
        CultureEntry cuisine = heritage(7L);
        cuisine.setEntryType(EntryType.CUISINE);
        cuisine.setCategory(null);
        when(entries.findById(7L)).thenReturn(Optional.of(cuisine));

        assertThatThrownBy(() -> service.heritage(7L)).isInstanceOf(CultureEntryNotFoundException.class);
        assertThat(service.entry(7L).type()).isEqualTo(EntryType.CUISINE);
    }

    private static CultureEntry heritage(Long id) {
        CultureEntry entry = new CultureEntry();
        entry.setId(id);
        entry.setSlug("entry-" + id);
        entry.setProvinceSlug("ha-noi");
        entry.setEntryType(EntryType.HERITAGE);
        entry.setCategory("TANGIBLE");
        entry.setName("Entry " + id);
        entry.setDescription("Mô tả");
        entry.setVerificationStatus(VerificationStatus.VERIFIED);
        return entry;
    }

    private static CultureEntrySource link(CultureEntry entry, Long sourceId, ReviewStatus status) {
        CultureSource source = new CultureSource();
        source.setId(sourceId);
        source.setTitle("Source " + sourceId);
        source.setSourceType("BOOK");
        source.setReviewStatus(status);
        CultureEntrySource link = new CultureEntrySource();
        link.setCultureEntry(entry);
        link.setCultureSource(source);
        return link;
    }
}