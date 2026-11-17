package com.culturalatlas.assistant.application.port.out.exception;

/**
 * Ngoại lệ ném ra khi dịch vụ Geographic Intelligence (Member 1) không khả dụng,
 * database PostGIS lỗi hoặc xảy ra sự cố timeout.
 */
public class GeographicServiceUnavailableException extends AssistantPortException {

    public GeographicServiceUnavailableException(String operation, String message) {
        super("Geographic Intelligence", operation, message);
    }

    public GeographicServiceUnavailableException(String operation, String message, Throwable cause) {
        super("Geographic Intelligence", operation, message, cause);
    }
}

