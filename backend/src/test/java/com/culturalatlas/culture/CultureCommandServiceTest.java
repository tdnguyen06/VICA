package com.culturalatlas.culture;

import com.culturalatlas.culture.dto.CultureAdminRequests.EntryRequest;
import com.culturalatlas.culture.dto.CultureAdminRequests.MediaRequest;
import com.culturalatlas.culture.dto.CultureAdminRequests.SourceRefRequest;
import com.culturalatlas.culture.dto.CultureDtos.EntryDetailDto;
import com.culturalatlas.culture.entity.CultureEntry;
import com.culturalatlas.culture.entity.CultureEntrySource;
import com.culturalatlas.culture.entity.CultureSource;
import com.culturalatlas.culture.enums.EntryType;
import com.culturalatlas.culture.enums.MediaType;
import com.culturalatlas.culture.enums.ReviewStatus;
import com.culturalatlas.culture.enums.VerificationStatus;
import com.culturalatlas.culture.exception.CultureConflictException;
import com.culturalatlas.culture.exception.CultureValidationException;
import com.culturalatlas.culture.repository.CultureEntryRepository;
import com.culturalatlas.culture.repository.CultureSourceRepository;
import com.culturalatlas.culture.service.CultureCommandService;
import com.culturalatlas.geography.GeographicService;
import com.culturalatlas.geography.ProvinceDto;
import com.culturalatlas.geography.ProvinceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.InstanceOfAssertFactories.list;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** CUL-08: missing/invalid sources, wrong province and invalid data are rejected before anything is saved. */
class CultureCommandServiceTest {
    private static final ProvinceDto HANOI = new ProvinceDto(24L, "ha-noi", "Hà Nội", "Thành phố Hà Nội");
    private static final ProvinceDto HAIPHONG = new ProvinceDto(27L, "hai-phong", "Hải Phòng", "Thành phố Hải Phòng");

    private GeographicService geo;
    private CultureEntryRepository entries;
    private CultureSourceRepository sources;
    private CultureCommandService service;

    @BeforeEach
    void setUp() {
        geo = mock(GeographicService.class);
        entries = mock(CultureEntryRepository.class);
        sources = mock(CultureSourceRepository.class);
        service = new CultureCommandService(geo, entries, sources);

        when(geo.detail("ha-noi")).thenReturn(HANOI);
        when(geo.detail("khong-ton-tai")).thenThrow(new ProvinceNotFoundException());
        when(geo.identify(any())).thenReturn(HANOI);
        when(entries.save(any(CultureEntry.class))).thenAnswer(inv -> inv.getArgument(0));
        stubSources(source(1L, "UNESCO", ReviewStatus.APPROVED));
    }

    @Test
    void validPlaceIsSavedWithSourceLinksAndMedia() {
        EntryDetailDto dto = service.createEntry(place(21.0287, 105.8524, List.of(ref(1L, "Mục 2"))));

        assertThat(dto.slug()).isEqualTo("ho-hoan-kiem");
        assertThat(dto.sources()).singleElement().satisfies(s -> {
            assertThat(s.id()).isEqualTo(1L);
            assertThat(s.citationNote()).isEqualTo("Mục 2");
        });
        assertThat(dto.media()).hasSize(1);
        verify(entries).save(any(CultureEntry.class));
    }

    @Test
    void unknownSourceIsRejected() {
        stubSources();   // repository finds nothing for id 99
        assertRejected(place(21.0287, 105.8524, List.of(ref(99L, null))), "Nguồn không tồn tại: id=99");
    }

    @Test
    void pendingOnlySourcesAreRejected() {
        stubSources(source(1L, "BOOK", ReviewStatus.PENDING));
        assertRejected(place(21.0287, 105.8524, List.of(ref(1L, null))), "Cần ít nhất 1 nguồn đã được duyệt (APPROVED)");
    }

    @Test
    void verifiedContentCannotRestOnOralSourcesOnly() {
        stubSources(source(1L, "ORAL", ReviewStatus.APPROVED));
        assertRejected(place(21.0287, 105.8524, List.of(ref(1L, null))), "VERIFIED cần ít nhất 1 nguồn văn bản");
    }

    @Test
    void legendMayRestOnOralSource() {
        stubSources(source(1L, "ORAL", ReviewStatus.APPROVED));
        EntryRequest legend = request("su-tich", "ha-noi", EntryType.FIGURE, null, VerificationStatus.LEGEND,
                null, null, List.of(ref(1L, null)));
        assertThat(service.createEntry(legend).verificationStatus()).isEqualTo(VerificationStatus.LEGEND);
    }

    @Test
    void duplicateSourceLinkIsRejected() {
        assertRejected(place(21.0287, 105.8524, List.of(ref(1L, null), ref(1L, null))), "Một nguồn bị gắn trùng nhiều lần");
    }

    @Test
    void unknownProvinceIsRejectedWithoutSpatialLookup() {
        EntryRequest req = request("x", "khong-ton-tai", EntryType.PLACE, null, VerificationStatus.VERIFIED,
                21.0287, 105.8524, List.of(ref(1L, null)));
        assertRejected(req, "provinceSlug không tồn tại trong Geographic: khong-ton-tai");
        verify(geo, never()).identify(any());
    }

    @Test
    void coordinateInAnotherProvinceIsRejected() {
        when(geo.identify(any())).thenReturn(HAIPHONG);
        assertRejected(place(20.8449, 106.6881, List.of(ref(1L, null))),
                "Sai địa phương: tọa độ thuộc hai-phong, không thuộc ha-noi");
    }

    @Test
    void coordinateOutsideDatasetIsRejected() {
        when(geo.identify(any())).thenReturn(null);
        assertRejected(place(1.0, 1.0, List.of(ref(1L, null))), "Tọa độ nằm ngoài vùng dữ liệu địa phương");
    }

    @Test
    void placeWithoutCoordinatesIsRejected() {
        assertRejected(place(null, null, List.of(ref(1L, null))), "PLACE bắt buộc có tọa độ");
    }

    @Test
    void halfCoordinateIsRejected() {
        EntryRequest req = request("x", "ha-noi", EntryType.CUISINE, null, VerificationStatus.VERIFIED,
                21.0, null, List.of(ref(1L, null)));
        assertRejected(req, "latitude và longitude phải cùng có hoặc cùng bỏ trống");
    }

    @Test
    void heritageNeedsTangibleOrIntangibleCategory() {
        EntryRequest req = request("x", "ha-noi", EntryType.HERITAGE, "ABC", VerificationStatus.VERIFIED,
                null, null, List.of(ref(1L, null)));
        assertRejected(req, "HERITAGE phải có category là TANGIBLE hoặc INTANGIBLE");
    }

    @Test
    void allViolationsAreReportedTogether() {
        stubSources();
        EntryRequest req = request("x", "khong-ton-tai", EntryType.HERITAGE, null, VerificationStatus.VERIFIED,
                null, null, List.of(ref(5L, null)));
        assertThatThrownBy(() -> service.createEntry(req))
                .isInstanceOf(CultureValidationException.class)
                .extracting(ex -> ((CultureValidationException) ex).getErrors(), list(String.class))
                .hasSize(3);
    }

    @Test
    void duplicateSlugIsAConflict() {
        when(entries.existsBySlug("ho-hoan-kiem")).thenReturn(true);
        assertThatThrownBy(() -> service.createEntry(place(21.0287, 105.8524, List.of(ref(1L, null)))))
                .isInstanceOf(CultureConflictException.class);
        verify(entries, never()).save(any());
    }

    @Test
    void updateKeepsExistingLinkAndOnlyAddsOrRemovesTheDifference() {
        CultureSource keep = source(1L, "UNESCO", ReviewStatus.APPROVED);
        CultureSource drop = source(2L, "BOOK", ReviewStatus.APPROVED);
        CultureSource add = source(3L, "BOOK", ReviewStatus.APPROVED);
        CultureEntry existing = new CultureEntry();
        existing.setId(10L);
        CultureEntrySource keepLink = link(existing, keep);
        existing.getSources().add(keepLink);
        existing.getSources().add(link(existing, drop));
        when(entries.findById(10L)).thenReturn(Optional.of(existing));
        stubSources(keep, add);

        service.updateEntry(10L, place(21.0287, 105.8524, List.of(ref(1L, "mới"), ref(3L, null))));

        assertThat(existing.getSources()).extracting(l -> l.getCultureSource().getId()).containsExactly(1L, 3L);
        assertThat(existing.getSources().get(0)).isSameAs(keepLink);
        assertThat(keepLink.getCitationNote()).isEqualTo("mới");
    }

    // ---------- helpers ----------

    private void assertRejected(EntryRequest req, String expectedError) {
        assertThatThrownBy(() -> service.createEntry(req))
                .isInstanceOf(CultureValidationException.class)
                .extracting(ex -> ((CultureValidationException) ex).getErrors(), list(String.class))
                .anyMatch(e -> e.startsWith(expectedError));
        verify(entries, never()).save(any());
    }

    private void stubSources(CultureSource... found) {
        when(sources.findAllById(anyCollection())).thenAnswer(inv -> {
            Collection<?> ids = inv.getArgument(0);
            return List.of(found).stream().filter(s -> ids.contains(s.getId())).toList();
        });
    }

    private static EntryRequest place(Double lat, Double lng, List<SourceRefRequest> refs) {
        return request("ho-hoan-kiem", "ha-noi", EntryType.PLACE, null, VerificationStatus.VERIFIED, lat, lng, refs);
    }

    private static EntryRequest request(String slug, String province, EntryType type, String category,
                                        VerificationStatus status, Double lat, Double lng, List<SourceRefRequest> refs) {
        return new EntryRequest(slug, province, type, category, "Tên", null, "Mô tả", status, null, lat, lng, false,
                refs, List.of(new MediaRequest(MediaType.IMAGE, "https://example.org/a.jpg", null, null)));
    }

    private static SourceRefRequest ref(Long id, String note) {
        return new SourceRefRequest(id, note);
    }

    private static CultureSource source(Long id, String type, ReviewStatus status) {
        CultureSource s = new CultureSource();
        s.setId(id);
        s.setTitle("Nguồn " + id);
        s.setSourceType(type);
        s.setReviewStatus(status);
        return s;
    }

    private static CultureEntrySource link(CultureEntry entry, CultureSource source) {
        CultureEntrySource l = new CultureEntrySource();
        l.setCultureEntry(entry);
        l.setCultureSource(source);
        return l;
    }
}
