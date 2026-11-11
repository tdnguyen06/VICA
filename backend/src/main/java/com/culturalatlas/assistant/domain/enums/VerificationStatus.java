package com.culturalatlas.assistant.domain.enums;

/**
 * Trạng thái kiểm chứng của dữ liệu và nguồn trích dẫn văn hóa trong VICA Assistant.
 *
 * <ul>
 *   <li>{@link #VERIFIED}: Nội dung có căn cứ xác thực từ nguồn đáng tin cậy hoặc đã được thẩm định
 *       (VD: bản đồ hành chính PostGIS, di tích văn hóa quốc gia được xếp hạng, tài liệu có chứng thực).</li>
 *   <li>{@link #LEGEND}: Nội dung thuộc truyền thuyết, huyền tích, tín ngưỡng hoặc dân gian
 *       (VD: thần tích, truyện dân gian, dã sử chưa được khảo cổ/văn bản học chứng thực độc lập).</li>
 *   <li>{@link #UNVERIFIED}: Nội dung chưa đủ căn cứ xác thực, thiếu metadata hoặc metadata không hợp lệ.</li>
 * </ul>
 */
public enum VerificationStatus {
    VERIFIED,
    LEGEND,
    UNVERIFIED
}
