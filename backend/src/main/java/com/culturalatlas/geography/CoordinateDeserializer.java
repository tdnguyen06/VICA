package com.culturalatlas.geography;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonMappingException;

import java.io.IOException;
import java.math.BigDecimal;

/** Reject Jackson's default string-to-number coercion for coordinate fields. */
public class CoordinateDeserializer extends JsonDeserializer<BigDecimal> {
    @Override
    public BigDecimal deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        if (!parser.currentToken().isNumeric()) {
            throw JsonMappingException.from(parser, "Coordinate must be a JSON number");
        }
        return parser.getDecimalValue();
    }
}
