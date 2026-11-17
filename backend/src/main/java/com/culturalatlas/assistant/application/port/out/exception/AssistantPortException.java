package com.culturalatlas.assistant.application.port.out.exception;

/**
 * Lớp ngoại lệ cơ sở cho các lỗi kết nối hoặc sự cố hệ thống khi Assistant Module
 * giao tiếp với các Outbound Ports (Module 1, 2, 3).
 * Giúp phân biệt rõ ràng giữa "Không có dữ liệu (NO_DATA)" và "Dịch vụ không khả dụng (SERVICE_UNAVAILABLE)".
 */
public abstract class AssistantPortException extends RuntimeException {

    private final String moduleName;
    private final String operation;

    public AssistantPortException(String moduleName, String operation, String message) {
        super(String.format("[%s] Error during operation '%s': %s", moduleName, operation, message));
        this.moduleName = moduleName;
        this.operation = operation;
    }

    public AssistantPortException(String moduleName, String operation, String message, Throwable cause) {
        super(String.format("[%s] Error during operation '%s': %s", moduleName, operation, message), cause);
        this.moduleName = moduleName;
        this.operation = operation;
    }

    public String getModuleName() {
        return moduleName;
    }

    public String getOperation() {
        return operation;
    }
}

