package com.thomasvitale.ai.spring;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.rag.advisor.RetrievalAugmentationAdvisor;
import org.springframework.ai.rag.retrieval.search.VectorStoreDocumentRetriever;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.web.bind.annotation.*;

@RestController
public class RagControllerQueryRouting {

    public record AskRequest(String question, String placeId) {}

    private static final String SYSTEM = """
            Bạn là hướng dẫn viên du lịch địa phương ở Việt Nam.
            Chỉ dùng dữ liệu truy xuất được. Không có dữ liệu thì nói rõ là chưa có,
            TUYỆT ĐỐI không bịa số liệu, niên đại, tên quyết định.
            Trả lời tiếng Việt, giọng kể chuyện, ngắn gọn.
            Luôn gọi công cụ truy xuất trước khi trả lời.
            """;

    private final ChatClient.Builder chatClientBuilder;
    private final VectorStore vectorStore;

    public RagControllerQueryRouting(ChatClient.Builder chatClientBuilder, VectorStore vectorStore) {
        this.chatClientBuilder = chatClientBuilder;
        this.vectorStore = vectorStore;
    }

    @PostMapping("/rag/query/routing")
    String rag(@RequestBody AskRequest req) {
        String placeId = (req.placeId() == null || req.placeId().isBlank()) ? null : req.placeId().trim();
        return chatClientBuilder.clone().build()
                .prompt()
                .system(SYSTEM)
                .tools(new DomainTools(placeId))
                .user(req.question())
                .call()
                .content();
    }

    class DomainTools {
        private final String placeId;
        DomainTools(String placeId) { this.placeId = placeId; }

        @Tool(description = "Truy xuất LỊCH SỬ của địa điểm: niên đại, triều đại, sự kiện, nhân vật, di tích. Gọi khi câu hỏi liên quan quá khứ hoặc nguồn gốc.")
        String historyRetriever(String query) { return retrieve(query, "is_history"); }

        @Tool(description = "Truy xuất ẨM THỰC của địa điểm: món ăn, đặc sản, bánh, cách chế biến. Gọi khi câu hỏi liên quan đồ ăn, thức uống.")
        String cuisineRetriever(String query) { return retrieve(query, "is_cuisine"); }

        @Tool(description = "Truy xuất VĂN HOÁ của địa điểm: lễ hội, tín ngưỡng, âm nhạc trình diễn, làng nghề, dân tộc, trang phục. Gọi khi câu hỏi liên quan phong tục, nghệ thuật, cộng đồng.")
        String cultureRetriever(String query) { return retrieve(query, "is_culture"); }

        private String retrieve(String query, String domainFlag) {
            FilterExpressionBuilder b = new FilterExpressionBuilder();
            var exp = (placeId == null)
                    ? b.eq(domainFlag, true)
                    : b.and(b.eq(domainFlag, true), b.eq("entity_id", placeId));

            return chatClientBuilder.clone().build().prompt()
                    .advisors(RetrievalAugmentationAdvisor.builder()
                            .documentRetriever(VectorStoreDocumentRetriever.builder()
                                    .vectorStore(vectorStore)
                                    .filterExpression(exp.build())
                                    .similarityThreshold(0.3)
                                    .topK(6)
                                    .build())
                            .build())
                    .user(query)
                    .call()
                    .content();
        }
    }
}
