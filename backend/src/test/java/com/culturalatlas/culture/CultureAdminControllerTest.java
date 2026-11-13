package com.culturalatlas.culture;

import com.culturalatlas.culture.dto.CultureDtos.EntryDetailDto;
import com.culturalatlas.culture.enums.EntryType;
import com.culturalatlas.culture.enums.VerificationStatus;
import com.culturalatlas.culture.exception.CultureConflictException;
import com.culturalatlas.culture.exception.CultureEntryNotFoundException;
import com.culturalatlas.culture.exception.CultureValidationException;
import com.culturalatlas.culture.service.CultureCommandService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;

import static org.hamcrest.Matchers.hasItem;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** CUL-07: role-based access, request validation and HTTP error mapping of the admin API. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CultureAdminControllerTest {
    private static final String ENTRIES = "/api/v1/admin/cultures/entries";
    private static final String VALID_BODY = """
            {"slug":"ho-hoan-kiem","provinceSlug":"ha-noi","type":"PLACE","name":"Hồ Hoàn Kiếm",
             "description":"Mô tả","verificationStatus":"VERIFIED","latitude":21.0287,"longitude":105.8524,
             "sources":[{"sourceId":1,"citationNote":"Mục 2"}]}
            """;

    @Autowired
    private MockMvc mvc;

    @MockBean
    private CultureCommandService service;

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder builder, String body) {
        return builder.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    @Test
    void anonymousIs401AndPlainUserIs403() throws Exception {
        mvc.perform(json(post(ENTRIES), VALID_BODY)).andExpect(status().isUnauthorized());
        mvc.perform(json(post(ENTRIES), VALID_BODY).with(user("u").roles("USER"))).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void adminAndResearcherCanCreate() throws Exception {
        var created = new EntryDetailDto(9L, "ho-hoan-kiem", "ha-noi", EntryType.PLACE, null, "Hồ Hoàn Kiếm", null,
                "Mô tả", VerificationStatus.VERIFIED, null, null, List.of(), List.of());
        when(service.createEntry(any())).thenReturn(created);

        mvc.perform(json(post(ENTRIES), VALID_BODY).with(user("a").roles("ADMIN")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(9));
        mvc.perform(json(post(ENTRIES), VALID_BODY).with(user("r").roles("RESEARCHER")))
                .andExpect(status().isCreated());
    }

    @Test
    void missingSourcesAndBadFormatAreRejectedBeforeTheService() throws Exception {
        String body = """
                {"slug":"Ho Hoan Kiem","provinceSlug":"ha-noi","type":"PLACE","name":"",
                 "description":"x","verificationStatus":"VERIFIED","latitude":95,"longitude":105,"sources":[]}
                """;
        mvc.perform(json(post(ENTRIES), body).with(user("a").roles("ADMIN")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details", hasItem("sources: Nội dung phải có ít nhất 1 nguồn tham khảo")))
                .andExpect(jsonPath("$.details", hasItem("latitude: latitude phải trong khoảng -90 đến 90")))
                .andExpect(jsonPath("$.details", hasItem("name: name là bắt buộc")))
                .andExpect(jsonPath("$.details.length()").value(4));
        verifyNoInteractions(service);
    }

    @Test
    void unknownEnumValueIsBadRequest() throws Exception {
        mvc.perform(json(post(ENTRIES), VALID_BODY.replace("\"PLACE\"", "\"TEMPLE\"")).with(user("a").roles("ADMIN")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void businessRuleViolationsAreReturnedAsDetails() throws Exception {
        when(service.createEntry(any())).thenThrow(new CultureValidationException(
                List.of("Sai địa phương: tọa độ thuộc hai-phong, không thuộc ha-noi")));

        mvc.perform(json(post(ENTRIES), VALID_BODY).with(user("a").roles("ADMIN")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cultural content validation failed"))
                .andExpect(jsonPath("$.details[0]").value("Sai địa phương: tọa độ thuộc hai-phong, không thuộc ha-noi"));
    }

    @Test
    void duplicateSlugIs409AndMissingEntryIs404() throws Exception {
        when(service.createEntry(any())).thenThrow(new CultureConflictException("slug đã tồn tại: ho-hoan-kiem"));
        when(service.updateEntry(eq(77L), any())).thenThrow(new CultureEntryNotFoundException(77L));

        mvc.perform(json(post(ENTRIES), VALID_BODY).with(user("a").roles("ADMIN")))
                .andExpect(status().isConflict());
        mvc.perform(json(put(ENTRIES + "/77"), VALID_BODY).with(user("a").roles("ADMIN")))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteReturns204Or404() throws Exception {
        doThrow(new CultureEntryNotFoundException(5L)).when(service).deleteEntry(5L);

        mvc.perform(delete(ENTRIES + "/4").with(user("a").roles("ADMIN"))).andExpect(status().isNoContent());
        mvc.perform(delete(ENTRIES + "/5").with(user("a").roles("ADMIN"))).andExpect(status().isNotFound());
    }

    @Test
    void newSourceIsValidated() throws Exception {
        mvc.perform(json(post("/api/v1/admin/cultures/sources"),
                        "{\"title\":\"\",\"sourceType\":\"BLOG\",\"url\":\"ftp://x\"}").with(user("a").roles("ADMIN")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.length()").value(3));
    }
}
