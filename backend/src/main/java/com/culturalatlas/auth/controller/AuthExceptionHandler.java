package com.culturalatlas.auth.controller;

import com.culturalatlas.auth.AuthException;
import com.culturalatlas.common.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.List;

/** Error policy of /api/v1/auth only. Messages never reveal whether a username exists. */
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = AuthController.class)
public class AuthExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(AuthExceptionHandler.class);

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<ErrorResponse> auth(AuthException ex, HttpServletRequest req) {
        return error(ex.getStatus(), ex.getStatus().getReasonPhrase(), ex.getMessage(), req, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> invalid(MethodArgumentNotValidException ex, HttpServletRequest req) {
        List<String> details = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage()).sorted().toList();
        return error(HttpStatus.BAD_REQUEST, "Validation Error", "Input validation failed", req, details);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> unreadable(HttpServletRequest req) {
        return error(HttpStatus.BAD_REQUEST, "Validation Error", "Body phải là JSON hợp lệ", req, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> unexpected(Exception ex, HttpServletRequest req) {
        LOG.error("Auth request failed: {}", req.getRequestURI(), ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", "An unexpected error occurred", req, null);
    }

    private ResponseEntity<ErrorResponse> error(HttpStatus status, String name, String message,
                                               HttpServletRequest req, List<String> details) {
        return ResponseEntity.status(status).body(ErrorResponse.builder().status(status.value()).error(name)
                .message(message).path(req.getRequestURI()).timestamp(LocalDateTime.now()).details(details).build());
    }
}