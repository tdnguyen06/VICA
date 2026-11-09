package com.culturalatlas.culture.exception;

public class CultureEntryNotFoundException extends RuntimeException {
    public CultureEntryNotFoundException(Long id) {
        super("Culture entry not found: " + id);
    }
}
