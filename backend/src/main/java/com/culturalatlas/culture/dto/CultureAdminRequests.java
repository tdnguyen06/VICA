package com.culturalatlas.culture.dto;

import com.culturalatlas.culture.enums.EntryType;
import com.culturalatlas.culture.enums.MediaType;
import com.culturalatlas.culture.enums.ReviewStatus;
import com.culturalatlas.culture.enums.VerificationStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/** Request bodies of the Cultural admin API (CUL-07). Format rules here; business rules in CultureCommandService. */
public final class CultureAdminRequests {
    private CultureAdminRequests() {
    }

    public static final String SLUG_REGEX = "^[a-z0-9]+(-[a-z0-9]+)*$";
    private static final String SLUG_MESSAGE = "chỉ gồm chữ thường a-z, số 0-9 và dấu gạch nối";

    public record SourceRefRequest(
            @NotNull(message = "sourceId là bắt buộc") Long sourceId,
            @Size(max = 500) String citationNote) {
    }

    public record MediaRequest(
            @NotNull(message = "mediaType là bắt buộc") MediaType mediaType,
            @NotBlank(message = "url của media là bắt buộc") @Size(max = 1000) String url,
            @Size(max = 500) String caption,
            @Size(max = 255) String credit) {
    }

    public record EntryRequest(
            @NotBlank(message = "slug là bắt buộc") @Size(max = 200)
            @Pattern(regexp = SLUG_REGEX, message = "slug " + SLUG_MESSAGE) String slug,

            @NotBlank(message = "provinceSlug là bắt buộc") @Size(max = 100)
            @Pattern(regexp = SLUG_REGEX, message = "provinceSlug " + SLUG_MESSAGE) String provinceSlug,

            @NotNull(message = "type là bắt buộc") EntryType type,
            @Size(max = 50) String category,
            @NotBlank(message = "name là bắt buộc") @Size(max = 255) String name,
            @Size(max = 500) String summary,
            @NotBlank(message = "description là bắt buộc") String description,
            @NotNull(message = "verificationStatus là bắt buộc") VerificationStatus verificationStatus,
            @Size(max = 150) String historicalPeriod,

            @DecimalMin(value = "-90", message = "latitude phải trong khoảng -90 đến 90")
            @DecimalMax(value = "90", message = "latitude phải trong khoảng -90 đến 90") Double latitude,

            @DecimalMin(value = "-180", message = "longitude phải trong khoảng -180 đến 180")
            @DecimalMax(value = "180", message = "longitude phải trong khoảng -180 đến 180") Double longitude,

            boolean featured,

            @NotEmpty(message = "Nội dung phải có ít nhất 1 nguồn tham khảo")
            List<@NotNull @Valid SourceRefRequest> sources,

            List<@NotNull @Valid MediaRequest> media) {
    }

    public record SourceRequest(
            @NotBlank(message = "title là bắt buộc") @Size(max = 500) String title,
            @Size(max = 255) String author,
            @Size(max = 255) String publisher,

            @NotBlank(message = "sourceType là bắt buộc")
            @Pattern(regexp = "BOOK|ARTICLE|WEBSITE|GOV_DOCUMENT|UNESCO|FIELDWORK|ORAL",
                    message = "sourceType phải là BOOK, ARTICLE, WEBSITE, GOV_DOCUMENT, UNESCO, FIELDWORK hoặc ORAL")
            String sourceType,

            @Size(max = 1000)
            @Pattern(regexp = "^https?://\\S+$", message = "url phải bắt đầu bằng http:// hoặc https://") String url,

            @Min(0) @Max(2100) Integer publishedYear,
            LocalDate accessedAt) {
    }

    public record ReviewRequest(@NotNull(message = "reviewStatus là bắt buộc") ReviewStatus reviewStatus) {
    }
}
