package com.culturalatlas.geography;

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

/** Geographic-only error policy; does not alter other modules' responses. */
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = GeographicController.class)
public class GeographicExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(GeographicExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "Validation Error", "Input validation failed", request,
                ex.getBindingResult().getFieldErrors().stream().map(e -> e.getDefaultMessage()).toList());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> unreadable(HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "Validation Error", "Input validation failed", request,
                List.of("Body must be a JSON object with numeric latitude and longitude"));
    }

    @ExceptionHandler(ProvinceNotFoundException.class)
    public ResponseEntity<ErrorResponse> notFound(HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, "Not Found", "Province not found", request, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> unexpected(Exception ex, HttpServletRequest request) {
        LOG.error("Geographic request failed: {}", request.getRequestURI(), ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error",
                "An unexpected error occurred", request, null);
    }

    private ResponseEntity<ErrorResponse> error(HttpStatus status, String name, String message,
                                               HttpServletRequest request, List<String> details) {
        return ResponseEntity.status(status).body(ErrorResponse.builder().status(status.value()).error(name)
                .message(message).path(request.getRequestURI()).timestamp(LocalDateTime.now()).details(details).build());
    }
}
