package com.culturalatlas.culture.exception;

public class CultureSourceNotFoundException extends RuntimeException {
    public CultureSourceNotFoundException(Long id) {
        super("Culture source not found: " + id);
    }
}
