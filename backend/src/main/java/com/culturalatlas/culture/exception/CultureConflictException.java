package com.culturalatlas.culture.exception;

/** Unique-key conflict such as a duplicate slug. Mapped to 409. */
public class CultureConflictException extends RuntimeException {
    public CultureConflictException(String message) {
        super(message);
    }
}
