package com.culturalatlas.culture.service;

import com.culturalatlas.culture.dto.CultureAdminRequests.EntryRequest;
import com.culturalatlas.culture.dto.CultureAdminRequests.MediaRequest;
import com.culturalatlas.culture.dto.CultureAdminRequests.SourceRefRequest;
import com.culturalatlas.culture.dto.CultureAdminRequests.SourceRequest;
import com.culturalatlas.culture.dto.CultureDtos.EntryDetailDto;
import com.culturalatlas.culture.dto.CultureDtos.SourceDto;
import com.culturalatlas.culture.entity.CultureEntry;
import com.culturalatlas.culture.entity.CultureEntrySource;
import com.culturalatlas.culture.entity.CultureMedia;
import com.culturalatlas.culture.entity.CultureSource;
import com.culturalatlas.culture.enums.EntryType;
import com.culturalatlas.culture.enums.ReviewStatus;
import com.culturalatlas.culture.enums.VerificationStatus;
import com.culturalatlas.culture.exception.CultureConflictException;
import com.culturalatlas.culture.exception.CultureEntryNotFoundException;
import com.culturalatlas.culture.exception.CultureSourceNotFoundException;
import com.culturalatlas.culture.exception.CultureValidationException;
import com.culturalatlas.culture.repository.CultureEntryRepository;
import com.culturalatlas.culture.repository.CultureSourceRepository;
import com.culturalatlas.geography.GeographicService;
import com.culturalatlas.geography.IdentifyProvinceRequest;
import com.culturalatlas.geography.ProvinceDto;
import com.culturalatlas.geography.ProvinceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Write side of the Cultural module (CUL-07). Every business rule from docs/api/culture-api.md section 5
 * is enforced here; Province data is only read through the public GeographicService.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CultureCommandService {
    private static final Set<String> HERITAGE_CATEGORIES = Set.of("TANGIBLE", "INTANGIBLE");

    private final GeographicService geographicService;
    private final CultureEntryRepository entries;
    private final CultureSourceRepository sources;

    public EntryDetailDto createEntry(EntryRequest req) {
        if (entries.existsBySlug(req.slug())) {
            throw new CultureConflictException("slug đã tồn tại: " + req.slug());
        }
        Map<Long, CultureSource> linkedSources = validate(req);
        CultureEntry entry = new CultureEntry();
        apply(entry, req, linkedSources);
        return CultureMapper.detail(entries.save(entry));
    }

    public EntryDetailDto updateEntry(Long id, EntryRequest req) {
        CultureEntry entry = entries.findById(id).orElseThrow(() -> new CultureEntryNotFoundException(id));
        if (entries.existsBySlugAndIdNot(req.slug(), id)) {
            throw new CultureConflictException("slug đã tồn tại: " + req.slug());
        }
        Map<Long, CultureSource> linkedSources = validate(req);
        apply(entry, req, linkedSources);
        return CultureMapper.detail(entries.save(entry));
    }

    public void deleteEntry(Long id) {
        if (!entries.existsById(id)) {
            throw new CultureEntryNotFoundException(id);
        }
        entries.deleteById(id);
    }

    /** New sources start as PENDING and only become public after review. */
    public SourceDto createSource(SourceRequest req) {
        CultureSource source = new CultureSource();
        source.setTitle(req.title().trim());
        source.setAuthor(blankToNull(req.author()));
        source.setPublisher(blankToNull(req.publisher()));
        source.setSourceType(req.sourceType());
        source.setUrl(blankToNull(req.url()));
        source.setPublishedYear(req.publishedYear());
        source.setAccessedAt(req.accessedAt());
        source.setReviewStatus(ReviewStatus.PENDING);
        return toDto(sources.save(source));
    }

    public SourceDto reviewSource(Long id, ReviewStatus status) {
        CultureSource source = sources.findById(id).orElseThrow(() -> new CultureSourceNotFoundException(id));
        source.setReviewStatus(status);
        return toDto(sources.save(source));
    }

    /** Collects every rule violation so the caller can fix them all at once. */
    private Map<Long, CultureSource> validate(EntryRequest req) {
        List<String> errors = new ArrayList<>();

        boolean provinceExists = true;
        try {
            geographicService.detail(req.provinceSlug());
        } catch (ProvinceNotFoundException ex) {
            provinceExists = false;
            errors.add("provinceSlug không tồn tại trong Geographic: " + req.provinceSlug());
        }

        if (req.type() == EntryType.HERITAGE
                && (req.category() == null || !HERITAGE_CATEGORIES.contains(req.category()))) {
            errors.add("HERITAGE phải có category là TANGIBLE hoặc INTANGIBLE");
        }

        boolean hasLat = req.latitude() != null;
        boolean hasLng = req.longitude() != null;
        if (hasLat != hasLng) {
            errors.add("latitude và longitude phải cùng có hoặc cùng bỏ trống");
        }
        if (req.type() == EntryType.PLACE && !(hasLat && hasLng)) {
            errors.add("PLACE bắt buộc có tọa độ");
        }
        if (hasLat && hasLng && provinceExists) {
            ProvinceDto actual = geographicService.identify(new IdentifyProvinceRequest(
                    BigDecimal.valueOf(req.latitude()), BigDecimal.valueOf(req.longitude())));
            if (actual == null) {
                errors.add("Tọa độ nằm ngoài vùng dữ liệu địa phương");
            } else if (!actual.slug().equals(req.provinceSlug())) {
                errors.add("Sai địa phương: tọa độ thuộc " + actual.slug() + ", không thuộc " + req.provinceSlug());
            }
        }

        List<Long> ids = req.sources().stream().map(SourceRefRequest::sourceId).toList();
        if (new HashSet<>(ids).size() != ids.size()) {
            errors.add("Một nguồn bị gắn trùng nhiều lần");
        }
        Map<Long, CultureSource> found = sources.findAllById(ids).stream()
                .collect(Collectors.toMap(CultureSource::getId, Function.identity(), (a, b) -> a));
        ids.stream().distinct().filter(id -> !found.containsKey(id))
                .forEach(id -> errors.add("Nguồn không tồn tại: id=" + id));

        List<CultureSource> approved = found.values().stream()
                .filter(s -> s.getReviewStatus() == ReviewStatus.APPROVED).toList();
        if (!found.isEmpty() && approved.isEmpty()) {
            errors.add("Cần ít nhất 1 nguồn đã được duyệt (APPROVED)");
        }
        if (req.verificationStatus() == VerificationStatus.VERIFIED && !approved.isEmpty()
                && approved.stream().allMatch(s -> "ORAL".equals(s.getSourceType()))) {
            errors.add("VERIFIED cần ít nhất 1 nguồn văn bản đã duyệt, không thể chỉ dựa vào truyền khẩu");
        }

        if (!errors.isEmpty()) {
            throw new CultureValidationException(errors);
        }
        return found;
    }

    private void apply(CultureEntry entry, EntryRequest req, Map<Long, CultureSource> found) {
        entry.setSlug(req.slug());
        entry.setProvinceSlug(req.provinceSlug());
        entry.setEntryType(req.type());
        entry.setCategory(blankToNull(req.category()));
        entry.setName(req.name().trim());
        entry.setSummary(blankToNull(req.summary()));
        entry.setDescription(req.description().trim());
        entry.setVerificationStatus(req.verificationStatus());
        entry.setHistoricalPeriod(blankToNull(req.historicalPeriod()));
        entry.setLatitude(req.latitude());
        entry.setLongitude(req.longitude());
        entry.setFeatured(req.featured());

        // Diff the source links instead of clear()+add(): Hibernate flushes inserts before deletes,
        // so re-adding the same (entry, source) pair would hit the unique constraint.
        Map<Long, SourceRefRequest> wanted = req.sources().stream()
                .collect(Collectors.toMap(SourceRefRequest::sourceId, Function.identity(), (a, b) -> a, LinkedHashMap::new));
        entry.getSources().removeIf(link -> !wanted.containsKey(link.getCultureSource().getId()));
        Map<Long, CultureEntrySource> existing = entry.getSources().stream()
                .collect(Collectors.toMap(link -> link.getCultureSource().getId(), Function.identity()));
        wanted.forEach((sourceId, ref) -> {
            CultureEntrySource link = existing.get(sourceId);
            if (link == null) {
                link = new CultureEntrySource();
                link.setCultureEntry(entry);
                link.setCultureSource(found.get(sourceId));
                entry.getSources().add(link);
            }
            link.setCitationNote(blankToNull(ref.citationNote()));
        });

        entry.getMedia().clear();
        List<MediaRequest> media = req.media() == null ? List.of() : req.media();
        for (int i = 0; i < media.size(); i++) {
            MediaRequest m = media.get(i);
            CultureMedia item = new CultureMedia();
            item.setCultureEntry(entry);
            item.setMediaType(m.mediaType());
            item.setUrl(m.url().trim());
            item.setCaption(blankToNull(m.caption()));
            item.setCredit(blankToNull(m.credit()));
            item.setSortOrder(i);
            entry.getMedia().add(item);
        }
    }

    private static SourceDto toDto(CultureSource s) {
        return new SourceDto(s.getId(), s.getTitle(), s.getAuthor(), s.getPublisher(), s.getSourceType(),
                s.getUrl(), s.getPublishedYear(), s.getReviewStatus(), null);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
