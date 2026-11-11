package com.culturalatlas.assistant.application.prompt;

import com.culturalatlas.assistant.application.dto.tool.ToolSourceMetadata;
import com.culturalatlas.assistant.domain.entity.Message;
import com.culturalatlas.assistant.domain.enums.MessageRole;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Quản lý System Prompt, Persona và Grounding Guardrails cho VICA Assistant.
 * Đảm bảo tính liêm chính học thuật, chống ảo giác (anti-hallucination) và chuẩn hóa trích dẫn.
 */
public final class AssistantPromptTemplates {

    private AssistantPromptTemplates() {}

    public static final String BASE_SYSTEM_PROMPT = """
            Bạn là Trợ lý Tri thức Văn hóa Việt Nam (VICA Assistant), một trợ lý AI uyên bác, trang trọng, khách quan và tôn trọng sâu sắc sự thật lịch sử cũng như bản sắc văn hóa 63 tỉnh thành Việt Nam.

            ### NGUYÊN TẮC BẮT BUỘC (GUARDRAILS):
            1. GROUNDING & CHỐNG ẢO GIÁC (ANTI-HALLUCINATION):
               - Bạn CHỈ ĐƯỢC PHÉP trả lời dựa trên các dữ liệu tri thức thực tế được cung cấp từ các công cụ (Tool Execution Results).
               - Tuyệt đối không tự suy diễn, không tự bịa đặt di tích, địa danh, nhân vật, niên đại hoặc sự kiện lịch sử không có trong dữ liệu nguồn.
               - Nếu các công cụ trả về NO_DATA hoặc không tìm thấy dữ liệu: Hãy thông báo lịch sự rằng hệ thống VICA hiện chưa có tư liệu về nội dung này. Tuyệt đối không tự bịa ra thông tin để trả lời thay thế.
               - Nếu dịch vụ tra cứu gặp lỗi (UNAVAILABLE): Hãy thông báo nhã nhặn rằng dịch vụ tra cứu tạm thời bị gián đoạn và mời người dùng thử lại sau.

            2. QUY TẮC PHÂN BIỆT 3 TRẠNG THÁI XÁC THỰC (VERIFICATION STATUS):
               - VERIFIED: Trình bày như sự thật lịch sử, di tích vật thể hoặc địa giới hành chính đã được nhà nước hoặc cơ quan khoa học công nhận.
               - LEGEND: Bắt buộc dùng đại từ và mệnh đề dẫn dắt ("Theo truyền thuyết dân gian...", "Tích xưa kể lại rằng...", "Trong huyền tích..."). Tuyệt đối không trình bày truyền thuyết như sự thật lịch sử đã chứng thực.
               - UNVERIFIED: Trình bày thận trọng, nêu rõ thông tin này hiện chưa có đủ tư liệu kiểm chứng độc lập.

            3. QUY TẮC TRÍCH DẪN & CITATION MARKERS:
               - Khi sử dụng thông tin từ nguồn dữ liệu được cung cấp (được đánh số [1], [2], ...), bạn PHẢI gắn marker trích dẫn [k] ngay sau mệnh đề thông tin tương ứng (ví dụ: "Đại Nội Huế được xây dựng từ năm 1804 [1].").
               - CHỈ ĐƯỢC SỬ DỤNG các số thứ tự [1], [2]... có trong danh sách nguồn được cung cấp. TUYỆT ĐỐI KHÔNG tự tạo marker mới (như [99]) và TUYỆT ĐỐI KHÔNG tự sinh đường link URL markdown trong câu trả lời. Backend sẽ quản lý và hiển thị danh mục trích dẫn chính thức.

            4. QUẢN LÝ NGỮ CẢNH NHIỀU LƯỢT (MULTI-TURN COREFERENCE):
               - Khi người dùng sử dụng đại từ thay thế hoặc câu hỏi ngắn ("nó", "nơi này", "ông ấy", "lễ hội đó", "có gì đặc biệt?"): Hãy tra cứu ngữ cảnh các lượt hỏi đáp trước đó để xác định chính xác đối tượng được đề cập.
               - Luôn ưu tiên bối cảnh địa phương (provinceSlug) của câu hỏi hiện tại nếu được người dùng cung cấp.

            5. CÂU HỎI GỢI Ý (SUGGESTIONS):
               - Chỉ gợi ý các câu hỏi tiếp nối dựa trên chủ đề và dữ liệu thực tế VICA có khả năng giải đáp. Không gợi ý câu hỏi dẫn người dùng tới những chủ đề ngoài phạm vi tri thức văn hóa Việt Nam.
            """;

    /**
     * Xây dựng System Prompt hoàn chỉnh kèm bối cảnh địa phương hiện tại (nếu có).
     */
    public static String buildSystemPrompt(String currentProvinceSlug) {
        StringBuilder sb = new StringBuilder(BASE_SYSTEM_PROMPT);
        if (currentProvinceSlug != null && !currentProvinceSlug.isBlank()) {
            sb.append("\n### BỐI CẢNH ĐỊA PHƯƠNG HIỆN TẠI:\n")
              .append("- Người dùng đang tập trung tra cứu tại địa phương có mã: '")
              .append(currentProvinceSlug.trim())
              .append("'. Hãy ưu tiên ngữ cảnh địa phương này khi giải quyết các câu hỏi có đại từ thay thế.\n");
        }
        return sb.toString();
    }

    /**
     * Định dạng danh sách nguồn tri thức thành văn bản đính kèm vào lượt gọi Round 2 cho LLM.
     * Mỗi nguồn được đánh số thứ tự [1], [2], ... xác định để LLM gắn marker tương ứng.
     */
    public static String formatSourcesSection(List<ToolSourceMetadata> sources) {
        if (sources == null || sources.isEmpty()) {
            return "Không có dữ liệu nguồn tri thức bổ sung nào từ công cụ tra cứu.";
        }

        StringBuilder sb = new StringBuilder("### DANH MỤC NGUỒN TRI THỨC ĐƯỢC CUNG CẤP (Hãy dùng marker [1], [2] tương ứng):\n");
        for (int i = 0; i < sources.size(); i++) {
            ToolSourceMetadata src = sources.get(i);
            int index = i + 1;
            sb.append("[").append(index).append("] ")
              .append(src.sourceName());
            if (src.provinceSlug() != null && !src.provinceSlug().isBlank()) {
                sb.append(" (Địa phương: ").append(src.provinceSlug()).append(")");
            }
            sb.append(" - Trạng thái: ").append(src.verificationStatus() != null ? src.verificationStatus() : "UNVERIFIED")
              .append("\n");
        }
        return sb.toString();
    }

    /**
     * Cắt tỉa và giới hạn lịch sử hội thoại:
     * - Chỉ giữ tối đa maxMessages (thường là 6-8 tin nhắn gần nhất).
     * - Giới hạn tổng số ký tự xấp xỉ token budget (~3,000 tokens ≈ 12,000 ký tự).
     * - Cắt theo ranh giới tin nhắn trọn vẹn (message boundary), không cắt giữa nội dung một tin nhắn.
     */
    public static List<Message> trimHistory(List<Message> history, int maxMessages, int maxCharacterBudget) {
        if (history == null || history.isEmpty()) {
            return List.of();
        }

        // 1. Giới hạn số lượng tin nhắn gần nhất
        int startIdx = Math.max(0, history.size() - maxMessages);
        List<Message> candidate = new ArrayList<>(history.subList(startIdx, history.size()));

        // 2. Cắt tỉa theo character budget từ tin nhắn cũ nhất đến mới nhất
        int totalChars = 0;
        for (Message m : candidate) {
            if (m.getContent() != null) {
                totalChars += m.getContent().length();
            }
        }

        while (totalChars > maxCharacterBudget && candidate.size() > 1) {
            Message removed = candidate.remove(0);
            if (removed.getContent() != null) {
                totalChars -= removed.getContent().length();
            }
        }

        return Collections.unmodifiableList(candidate);
    }
}

