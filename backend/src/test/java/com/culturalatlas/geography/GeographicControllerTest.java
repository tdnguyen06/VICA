package com.culturalatlas.geography;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GeographicControllerTest {
    @Autowired private MockMvc mvc;
    @MockBean private GeographicService service;
    private static final ProvinceDto HANOI = new ProvinceDto(24L, "ha-noi", "Hà Nội", "Thành phố Hà Nội");

    @Test
    void publicListUsesSuccessEnvelope() throws Exception {
        when(service.list()).thenReturn(List.of(HANOI));
        mvc.perform(get("/api/v1/geo/provinces"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].slug").value("ha-noi"));
    }

    @Test
    void detailAndMissingProvinceHaveDifferentResponses() throws Exception {
        when(service.detail("ha-noi")).thenReturn(HANOI);
        when(service.detail("missing")).thenThrow(new ProvinceNotFoundException());
        mvc.perform(get("/api/v1/geo/provinces/ha-noi"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.id").value(24));
        mvc.perform(get("/api/v1/geo/provinces/missing"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"));
    }

    @Test
    void identifyReturnsProvinceWithoutAuthentication() throws Exception {
        when(service.identify(any())).thenReturn(HANOI);
        mvc.perform(post("/api/v1/geo/identify").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"latitude\":21.0344,\"longitude\":105.8407}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.slug").value("ha-noi"));
    }

    @Test
    void validPointOutsideDatasetIsNotAnError() throws Exception {
        when(service.identify(any())).thenReturn(null);
        mvc.perform(post("/api/v1/geo/identify").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"latitude\":0,\"longitude\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(nullValue()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "null", "{}", "[]", "{", "{\"latitude\":100,\"longitude\":105}",
            "{\"latitude\":0,\"longitude\":181}", "{\"latitude\":null,\"longitude\":0}",
            "{\"latitude\":0}", "{\"longitude\":0}", "{\"latitude\":\"21\",\"longitude\":105}",
            "{\"latitude\":true,\"longitude\":105}", "{\"latitude\":[],\"longitude\":105}"})
    void malformedOrInvalidInputNeverReachesService(String body) throws Exception {
        mvc.perform(post("/api/v1/geo/identify").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Validation Error"));
        verifyNoInteractions(service);
    }

    @Test
    void databaseFailureIs500AndDoesNotExposeSql() throws Exception {
        when(service.identify(any())).thenThrow(new DataAccessResourceFailureException("secret SQL details"));
        mvc.perform(post("/api/v1/geo/identify").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"latitude\":0,\"longitude\":0}"))
                .andExpect(status().isInternalServerError()).andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred"));
    }
}
