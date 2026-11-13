package com.culturalatlas.auth;

import org.springframework.http.HttpStatus;

/** Authentication failure carrying the HTTP status to return (401 bad credentials, 403 disabled account...). */
public class AuthException extends RuntimeException {
    private final HttpStatus status;

    public AuthException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
