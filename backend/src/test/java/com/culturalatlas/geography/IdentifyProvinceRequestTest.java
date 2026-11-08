package com.culturalatlas.geography;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class IdentifyProvinceRequestTest {
    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    @ParameterizedTest
    @CsvSource({"21.0344,105.8407", "-90,-180", "90,180", "0,0"})
    void acceptsCoordinatesInRangeIncludingBoundary(String latitude, String longitude) {
        assertThat(validator.validate(request(latitude, longitude))).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({"-90.000001,0,latitude", "90.000001,0,latitude",
            "0,-180.000001,longitude", "0,180.000001,longitude"})
    void rejectsOutOfRangeCoordinate(String latitude, String longitude, String field) {
        assertThat(validator.validate(request(latitude, longitude)))
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly(field);
    }

    @Test
    void requiresBothCoordinates() {
        assertThat(validator.validate(new IdentifyProvinceRequest(null, null)))
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactlyInAnyOrder("latitude", "longitude");
    }

    private static IdentifyProvinceRequest request(String latitude, String longitude) {
        return new IdentifyProvinceRequest(new BigDecimal(latitude), new BigDecimal(longitude));
    }
}
