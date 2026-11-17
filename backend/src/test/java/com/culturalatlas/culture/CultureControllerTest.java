package com.culturalatlas.culture;

import com.culturalatlas.culture.dto.CultureDtos.CoordinateDto;
import com.culturalatlas.culture.dto.CultureDtos.EntryDetailDto;
import com.culturalatlas.culture.dto.CultureDtos.EntrySummaryDto;
import com.culturalatlas.culture.dto.CultureDtos.ProvinceOverviewDto;
import com.culturalatlas.culture.dto.CultureDtos.SourceDto;
import com.culturalatlas.culture.enums.EntryType;
import com.culturalatlas.culture.enums.ReviewStatus;
import com.culturalatlas.culture.enums.VerificationStatus;
import com.culturalatlas.culture.exception.CultureEntryNotFoundException;
import com.culturalatlas.culture.service.CultureQueryService;
import com.culturalatlas.geography.ProvinceDto;
import com.culturalatlas.geography.ProvinceNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.EnumMap;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CultureControllerTest {
    @Autowired
    private MockMvc mvc;

    @MockBean
    private CultureQueryService service;

    private static final ProvinceDto HANOI = new ProvinceDto(24L, "ha-noi", "Hà Nội", "Thành phố Hà Nội");
    private static final EntrySummaryDto GIONG = new EntrySummaryDto(5L, "thanh-giong", "ha-noi", EntryType.FIGURE,
            null, "Thánh Gióng", "Nhân vật truyền thuyết", VerificationStatus.LEGEND, null, null, 1);

    @Test
    void overviewIsPublicAndReturnsProvinceAndCounts() throws Exception {
        var counts = new EnumMap<EntryType, Long>(EntryType.class);
        for (EntryType t : EntryType.values()) {
            counts.put(t, 0L);
        }
        counts.put(EntryType.FIGURE, 1L);
        when(service.overview("ha-noi")).thenReturn(new ProvinceOverviewDto(HANOI, "Tổng quan", counts, List.of(GIONG)));

        mvc.perform(get("/api/v1/cultures/provinces/ha-noi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.province.slug").value("ha-noi"))
                .andExpect(jsonPath("$.data.counts.FIGURE").value(1))
                .andExpect(jsonPath("$.data.counts.CUISINE").value(0))
                .andExpect(jsonPath("$.data.highlights[0].verificationStatus").value("LEGEND"));
    }

    @Test
    void unknownProvinceIs404() throws Exception {
        when(service.list("khong-co", EntryType.HERITAGE)).thenThrow(new ProvinceNotFoundException());

        mvc.perform(get("/api/v1/cultures/provinces/khong-co/heritages"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Province not found"));
    }

    @Test
    void provinceWithoutContentReturnsEmptyList() throws Exception {
        when(service.list("ha-noi", EntryType.FESTIVAL)).thenReturn(List.of());

        mvc.perform(get("/api/v1/cultures/provinces/ha-noi/festivals"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    void heritageDetailExposesSourcesAndVerification() throws Exception {
        var detail = new EntryDetailDto(1L, "hoang-thanh-thang-long", "ha-noi", EntryType.HERITAGE, "TANGIBLE",
                "Hoàng thành Thăng Long", null, "Mô tả", VerificationStatus.VERIFIED, null,
                new CoordinateDto(21.0341, 105.84),
                List.of(new SourceDto(1L, "UNESCO WHC", null, "UNESCO", "UNESCO",
                        "https://whc.unesco.org/en/list/1328", 2010, ReviewStatus.APPROVED, null)),
                List.of());
        when(service.heritage(1L)).thenReturn(detail);

        mvc.perform(get("/api/v1/cultures/heritages/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationStatus").value("VERIFIED"))
                .andExpect(jsonPath("$.data.coordinate.latitude").value(21.0341))
                .andExpect(jsonPath("$.data.sources[0].reviewStatus").value("APPROVED"))
                .andExpect(jsonPath("$.data.sources[0].url").value("https://whc.unesco.org/en/list/1328"));
    }

    @Test
    void nonHeritageOrMissingIdIs404AndNonNumericIdIs400() throws Exception {
        when(service.heritage(99L)).thenThrow(new CultureEntryNotFoundException(99L));

        mvc.perform(get("/api/v1/cultures/heritages/99")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/cultures/heritages/abc")).andExpect(status().isBadRequest());
    }
}
