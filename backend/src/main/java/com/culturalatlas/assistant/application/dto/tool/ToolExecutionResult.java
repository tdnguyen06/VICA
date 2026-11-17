package com.culturalatlas.assistant.application.dto.tool;

import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Hợp đồng dữ liệu chuẩn trả về từ mọi Spring AI Tool trong Assistant Module.
 * Giúp Orchestrator kiểm soát trạng thái, dữ liệu cấu trúc và nguồn gốc citation.
 *
 * @param status    Trạng thái thực thi: SUCCESS, NO_DATA, ERROR.
 * @param data      Dữ liệu cấu trúc trả về (null nếu NO_DATA hoặc ERROR).
 * @param metadata  Danh sách metadata nguồn gốc dữ liệu phục vụ Citation (không bao giờ null).
 * @param message   Thông điệp mô tả an toàn cho LLM.
 * @param errorCode Mã lỗi phân loại (chỉ có giá trị khi status == ERROR, null khi SUCCESS hoặc NO_DATA).
 * @param <T>       Kiểu dữ liệu nghiệp vụ của payload.
 */
public record ToolExecutionResult<T>(
    ToolExecutionStatus status,
    T data,
    List<ToolSourceMetadata> metadata,
    String message,
    String errorCode
) {
    public static final String ERROR_INVALID_INPUT = "INVALID_INPUT";
    public static final String ERROR_DEPENDENCY_UNAVAILABLE = "DEPENDENCY_UNAVAILABLE";
    public static final String ERROR_INTERNAL_ERROR = "INTERNAL_ERROR";

    public ToolExecutionResult {
        Objects.requireNonNull(status, "status must not be null");
        Objects.requireNonNull(message, "message must not be null");
        metadata = metadata != null ? Collections.unmodifiableList(metadata) : List.of();

        // Ràng buộc quy tắc nghiệp vụ: Chỉ ERROR mới có errorCode
        if (status != ToolExecutionStatus.ERROR && errorCode != null) {
            throw new IllegalArgumentException("errorCode must be null when status is not ERROR");
        }
        if (status == ToolExecutionStatus.ERROR && (errorCode == null || errorCode.isBlank())) {
            throw new IllegalArgumentException("errorCode is required when status is ERROR");
        }
    }

    /**
     * Khởi tạo kết quả thực thi thành công kèm dữ liệu và metadata nguồn.
     */
    public static <T> ToolExecutionResult<T> success(T data, List<ToolSourceMetadata> metadata, String message) {
        return new ToolExecutionResult<>(ToolExecutionStatus.SUCCESS, data, metadata, message, null);
    }

    /**
     * Khởi tạo kết quả khi không tìm thấy dữ liệu phù hợp (NO_DATA).
     */
    public static <T> ToolExecutionResult<T> noData(String message) {
        return new ToolExecutionResult<>(ToolExecutionStatus.NO_DATA, null, List.of(), message, null);
    }

    /**
     * Khởi tạo kết quả lỗi với mã lỗi phân loại rõ ràng và thông điệp an toàn.
     */
    public static <T> ToolExecutionResult<T> error(String errorCode, String safeMessage) {
        return new ToolExecutionResult<>(ToolExecutionStatus.ERROR, null, List.of(), safeMessage, errorCode);
    }
}

