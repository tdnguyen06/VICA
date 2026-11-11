package com.culturalatlas.assistant.application.dto.tool;

/**
 * Trạng thái kết quả thực thi của các Spring AI Tools trong Assistant Module.
 */
public enum ToolExecutionStatus {
    /**
     * Tool thực thi thành công và tìm thấy dữ liệu hợp lệ.
     */
    SUCCESS,

    /**
     * Tool thực thi thành công nhưng nguồn dữ liệu không có thông tin phù hợp (rỗng).
     * Đây là trạng thái hợp lệ, không phải lỗi hệ thống.
     */
    NO_DATA,

    /**
     * Tool không thể hoàn thành do tham số không hợp lệ hoặc sự cố từ dịch vụ phụ thuộc.
     */
    ERROR
}

