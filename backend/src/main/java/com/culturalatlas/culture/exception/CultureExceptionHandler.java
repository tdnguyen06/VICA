package com.culturalatlas.culture.exception;

import com.culturalatlas.common.ErrorResponse;
import com.culturalatlas.culture.controller.CultureController;
import com.culturalatlas.geography.ProvinceNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.time.LocalDateTime;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = CultureController.class)
public class CultureExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(CultureExceptionHandler.class);

    @ExceptionHandler(ProvinceNotFoundException.class)
    public ResponseEntity<ErrorResponse> provinceNotFound(HttpServletRequest req) {
        return error(HttpStatus.NOT_FOUND, "Not Found", "Province not found", req);
    }

    @ExceptionHandler(CultureEntryNotFoundException.class)
    public ResponseEntity<ErrorResponse> entryNotFound(HttpServletRequest req) {
        return error(HttpStatus.NOT_FOUND, "Not Found", "Culture entry not found", req);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)   // e.g. /heritages/abc
    public ResponseEntity<ErrorResponse> badId(HttpServletRequest req) {
        return error(HttpStatus.BAD_REQUEST, "Bad Request", "Invalid path parameter", req);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> unexpected(Exception ex, HttpServletRequest req) {
        LOG.error("Culture request failed: {}", req.getRequestURI(), ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", "An unexpected error occurred", req);
    }

    private ResponseEntity<ErrorResponse> error(HttpStatus status, String name, String message, HttpServletRequest req) {
        return ResponseEntity.status(status).body(ErrorResponse.builder().status(status.value()).error(name)
                .message(message).path(req.getRequestURI()).timestamp(LocalDateTime.now()).build());
    }
}
