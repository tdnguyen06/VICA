package com.culturalatlas.culture.exception;

import java.util.List;

/** Business-rule violations of cultural content (missing source, wrong province, ...). Mapped to 400. */
public class CultureValidationException extends RuntimeException {
    private final List<String> errors;

    public CultureValidationException(List<String> errors) {
        super("Cultural content validation failed");
        this.errors = List.copyOf(errors);
    }

    public List<String> getErrors() {
        return errors;
    }
}
