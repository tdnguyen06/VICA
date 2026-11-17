package com.culturalatlas.geography;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** WGS84 coordinates. Controllers must apply @Valid to activate validation. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record IdentifyProvinceRequest(
        @JsonDeserialize(using = CoordinateDeserializer.class)
        @NotNull(message = "latitude is required")
        @DecimalMin(value = "-90", message = "latitude must be between -90 and 90")
        @DecimalMax(value = "90", message = "latitude must be between -90 and 90")
        BigDecimal latitude,

        @JsonDeserialize(using = CoordinateDeserializer.class)
        @NotNull(message = "longitude is required")
        @DecimalMin(value = "-180", message = "longitude must be between -180 and 180")
        @DecimalMax(value = "180", message = "longitude must be between -180 and 180")
        BigDecimal longitude
) {
}
