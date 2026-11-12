package com.culturalatlas.culture.exception;

import com.culturalatlas.common.ErrorResponse;
import com.culturalatlas.culture.controller.CultureAdminController;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;
import java.util.List;

/** Error policy of the Cultural admin API only; other modules keep their own handlers. */
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = CultureAdminController.class)
public class CultureAdminExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(CultureAdminExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> invalidBody(MethodArgumentNotValidException ex, HttpServletRequest req) {
        List<String> details = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .sorted()
                .toList();
        return error(HttpStatus.BAD_REQUEST, "Validation Error", "Input validation failed", req, details);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> unreadable(HttpServletRequest req) {
        return error(HttpStatus.BAD_REQUEST, "Validation Error", "Input validation failed", req,
                List.of("Body phải là JSON hợp lệ; kiểm tra kiểu dữ liệu và giá trị enum"));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> badPath(HttpServletRequest req) {
        return error(HttpStatus.BAD_REQUEST, "Bad Request", "Invalid path parameter", req, null);
    }

    @ExceptionHandler(CultureValidationException.class)
    public ResponseEntity<ErrorResponse> businessRule(CultureValidationException ex, HttpServletRequest req) {
        return error(HttpStatus.BAD_REQUEST, "Validation Error", "Cultural content validation failed", req, ex.getErrors());
    }

    @ExceptionHandler(CultureConflictException.class)
    public ResponseEntity<ErrorResponse> conflict(CultureConflictException ex, HttpServletRequest req) {
        return error(HttpStatus.CONFLICT, "Conflict", ex.getMessage(), req, null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> integrity(HttpServletRequest req) {
        return error(HttpStatus.CONFLICT, "Conflict", "Dữ liệu vi phạm ràng buộc của cơ sở dữ liệu", req, null);
    }

    @ExceptionHandler({CultureEntryNotFoundException.class, CultureSourceNotFoundException.class})
    public ResponseEntity<ErrorResponse> notFound(RuntimeException ex, HttpServletRequest req) {
        return error(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage(), req, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> unexpected(Exception ex, HttpServletRequest req) {
        LOG.error("Culture admin request failed: {}", req.getRequestURI(), ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", "An unexpected error occurred", req, null);
    }

    private ResponseEntity<ErrorResponse> error(HttpStatus status, String name, String message,
                                               HttpServletRequest req, List<String> details) {
        return ResponseEntity.status(status).body(ErrorResponse.builder().status(status.value()).error(name)
                .message(message).path(req.getRequestURI()).timestamp(LocalDateTime.now()).details(details).build());
    }
}
