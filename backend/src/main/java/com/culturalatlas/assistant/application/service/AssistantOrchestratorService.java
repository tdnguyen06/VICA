package com.culturalatlas.assistant.application.service;

import com.culturalatlas.assistant.application.dto.request.ChatRequest;
import com.culturalatlas.assistant.application.dto.request.CompareRequest;
import com.culturalatlas.assistant.application.dto.response.ChatResponse;
import com.culturalatlas.assistant.application.dto.response.CitationDto;
import com.culturalatlas.assistant.application.dto.response.CompareResponse;
import com.culturalatlas.assistant.application.dto.response.SuggestedQuestionDto;
import com.culturalatlas.assistant.application.dto.tool.ToolExecutionResult;
import com.culturalatlas.assistant.application.dto.tool.ToolSourceMetadata;
import com.culturalatlas.assistant.application.prompt.AssistantPromptTemplates;
import com.culturalatlas.assistant.domain.entity.Message;
import com.culturalatlas.assistant.domain.enums.MessageRole;
import com.culturalatlas.assistant.infrastructure.tool.CulturalAssistantTool;
import com.culturalatlas.assistant.infrastructure.tool.GeographicAssistantTool;
import com.culturalatlas.assistant.infrastructure.tool.KnowledgeRetrievalAssistantTool;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Trục điều phối trung tâm (Core Orchestrator) của VICA Cultural Assistant:
 * - Điều phối quy trình 3 Phase Transactional:
 *     Phase 1: Ghi nhận câu hỏi người dùng trong transaction ngắn.
 *     Phase 2: Nạp ngữ cảnh (ContextLoader), gọi Gemini với Guardrails (GuardedToolCallback),
 *              xây dựng Citations và sinh gợi ý (SuggestionEngine) - không giữ database transaction.
 *     Phase 3: Lưu phản hồi của trợ lý ảo và commit transaction ngắn.
 * - Thực thi các Orchestration Guardrails:
 *     Tối đa 2 rounds, tối đa 3 tool executions, timeout 5s, failure isolation, anti-hallucination.
 */
@Slf4j
@Service
public class AssistantOrchestratorService {

    private final ChatClient chatClient;
    private final AssistantConversationPersistenceService persistenceService;
    private final ContextLoader contextLoader;
    private final CitationBuilderService citationBuilderService;
    private final SuggestionEngine suggestionEngine;
    private final ObjectMapper objectMapper;

    private final ToolCallback geoDelegate;
    private final ToolCallback culturalDelegate;
    private final ToolCallback ragDelegate;

    @Autowired
    public AssistantOrchestratorService(
            @Autowired(required = false) ChatModel chatModel,
            AssistantConversationPersistenceService persistenceService,
            ContextLoader contextLoader,
            CitationBuilderService citationBuilderService,
            SuggestionEngine suggestionEngine,
            ObjectMapper objectMapper,
            GeographicAssistantTool geographicTool,
            CulturalAssistantTool culturalTool,
            KnowledgeRetrievalAssistantTool knowledgeRetrievalTool
    ) {
        this(chatModel != null ? ChatClient.create(chatModel) : null, persistenceService, contextLoader,
                citationBuilderService, suggestionEngine, objectMapper, geographicTool, culturalTool, knowledgeRetrievalTool);
    }

    public AssistantOrchestratorService(
            ChatClient chatClient,
            AssistantConversationPersistenceService persistenceService,
            ContextLoader contextLoader,
            CitationBuilderService citationBuilderService,
            SuggestionEngine suggestionEngine,
            ObjectMapper objectMapper,
            GeographicAssistantTool geographicTool,
            CulturalAssistantTool culturalTool,
            KnowledgeRetrievalAssistantTool knowledgeRetrievalTool
    ) {
        this.chatClient = chatClient;
        this.persistenceService = persistenceService;
        this.contextLoader = contextLoader;
        this.citationBuilderService = citationBuilderService;
        this.suggestionEngine = suggestionEngine;
        this.objectMapper = objectMapper;

        ToolCallback[] geoCallbacks = ToolCallbacks.from(geographicTool);
        this.geoDelegate = geoCallbacks[0];

        ToolCallback[] culturalCallbacks = ToolCallbacks.from(culturalTool);
        this.culturalDelegate = culturalCallbacks[0];

        ToolCallback[] ragCallbacks = ToolCallbacks.from(knowledgeRetrievalTool);
        this.ragDelegate = ragCallbacks[0];
    }

    public ChatResponse chat(ChatRequest request, Long authenticatedUserId, String guestToken) {
        // Phase 1: Ghi nhận câu hỏi người dùng (Transaction ngắn)
        ConversationContext context = persistenceService.startUserMessage(request, authenticatedUserId, guestToken);

        // Phase 2: Nạp ngữ cảnh hội thoại và gọi AI Model kèm Guardrails (Non-transactional)
        List<org.springframework.ai.chat.messages.Message> history =
                contextLoader.loadHistory(context.conversationId(), context.userSequenceNumber());

        AtomicInteger executionCounter = new AtomicInteger(0);
        List<ToolExecutionResult<?>> capturedResults = new CopyOnWriteArrayList<>();
        List<Map<String, Object>> capturedToolCalls = new CopyOnWriteArrayList<>();

        GuardedToolCallback guardedGeo = new GuardedToolCallback(
                geoDelegate, executionCounter, capturedResults, capturedToolCalls, objectMapper);
        GuardedToolCallback guardedCultural = new GuardedToolCallback(
                culturalDelegate, executionCounter, capturedResults, capturedToolCalls, objectMapper);
        GuardedToolCallback guardedRag = new GuardedToolCallback(
                ragDelegate, executionCounter, capturedResults, capturedToolCalls, objectMapper);

        String systemPrompt = AssistantPromptTemplates.buildSystemPrompt(context.effectiveProvinceSlug());

        String assistantContent;
        if (chatClient == null) {
            log.warn("ChatClient is not configured (e.g. test profile with model chat: none)");
            assistantContent = "Hệ thống trợ lý văn hóa VICA hiện đang tạm thời gián đoạn kết nối tới mô hình AI. Xin vui lòng thử lại sau ít phút.";
        } else {
            try {
                assistantContent = chatClient.prompt()
                        .system(systemPrompt)
                        .messages(history)
                        .user(request.message())
                        .toolCallbacks(guardedGeo, guardedCultural, guardedRag)
                        .call()
                        .content();

                if (assistantContent == null || assistantContent.isBlank()) {
                    assistantContent = "Tôi đã ghi nhận câu hỏi nhưng hiện tại chưa thể tạo câu trả lời chi tiết. Xin bạn vui lòng đặt lại câu hỏi.";
                }
            } catch (Exception e) {
                log.error("AI Model invocation failed for conversation {}: {}", context.conversationId(), e.getMessage(), e);
                assistantContent = "Hệ thống trợ lý văn hóa VICA hiện đang tạm thời gián đoạn kết nối tới mô hình AI. Xin vui lòng thử lại sau ít phút.";
            }
        }

        // Cập nhật bối cảnh địa phương nếu công cụ phát hiện địa phương mới
        String effectiveProvinceSlug = resolveEffectiveProvinceSlug(context.effectiveProvinceSlug(), capturedResults);

        // Xây dựng danh sách trích dẫn nguồn có kiểm định (Citation Engine)
        List<CitationDto> citations = citationBuilderService.buildCitations(capturedResults, assistantContent);

        // Sinh câu hỏi gợi ý tiếp nối có căn cứ dữ liệu (Suggestion Engine)
        List<SuggestedQuestionDto> suggestions = suggestionEngine.generateSuggestions(
                request.message(), assistantContent, effectiveProvinceSlug, capturedResults);

        // Phase 3: Lưu phản hồi trợ lý ảo và trích dẫn (Transaction ngắn)
        Message assistantMessage = persistenceService.completeAssistantMessage(
                context.conversationId(),
                assistantContent,
                citations,
                capturedToolCalls,
                effectiveProvinceSlug
        );

        return new ChatResponse(
                context.conversationId(),
                assistantMessage.getId(),
                MessageRole.ASSISTANT,
                assistantContent,
                effectiveProvinceSlug,
                citations,
                suggestions,
                context.credentials()
        );
    }

    /**
     * So sánh văn hóa giữa 2-3 địa phương theo khía cạnh được yêu cầu.
     * Tự động điều phối công cụ tra cứu dữ liệu của các địa phương và tổng hợp đối sánh.
     */
    public CompareResponse compare(CompareRequest request, Long authenticatedUserId, String guestToken) {
        String aspectLabel = switch (request.aspect()) {
            case CUISINE -> "Ẩm thực truyền thống";
            case HERITAGE -> "Di sản văn hóa và lịch sử";
            case FESTIVALS -> "Lễ hội dân gian và phong tục";
            case ALL -> "Toàn diện (Lịch sử, Di sản, Ẩm thực và Lễ hội)";
        };
        String userMessage = String.format("So sánh văn hóa giữa các địa phương %s về khía cạnh %s.",
                String.join(", ", request.provinceSlugs()), aspectLabel);

        ChatRequest chatReq = new ChatRequest(
                request.conversationId(),
                userMessage,
                request.provinceSlugs().get(0),
                request.guestSessionUuid()
        );

        // Phase 1: Ghi nhận yêu cầu so sánh (Transaction ngắn)
        ConversationContext context = persistenceService.startUserMessage(chatReq, authenticatedUserId, guestToken);

        // Phase 2: Nạp ngữ cảnh hội thoại và gọi AI Model kèm Guardrails (Non-transactional)
        List<org.springframework.ai.chat.messages.Message> history =
                contextLoader.loadHistory(context.conversationId(), context.userSequenceNumber());

        AtomicInteger executionCounter = new AtomicInteger(0);
        List<ToolExecutionResult<?>> capturedResults = new CopyOnWriteArrayList<>();
        List<Map<String, Object>> capturedToolCalls = new CopyOnWriteArrayList<>();

        GuardedToolCallback guardedGeo = new GuardedToolCallback(
                geoDelegate, executionCounter, capturedResults, capturedToolCalls, objectMapper);
        GuardedToolCallback guardedCultural = new GuardedToolCallback(
                culturalDelegate, executionCounter, capturedResults, capturedToolCalls, objectMapper);
        GuardedToolCallback guardedRag = new GuardedToolCallback(
                ragDelegate, executionCounter, capturedResults, capturedToolCalls, objectMapper);

        String systemPrompt = AssistantPromptTemplates.buildSystemPrompt(request.provinceSlugs().get(0))
                + "\n### YÊU CẦU ĐỐI SÁNH VĂN HÓA:\n"
                + "- Hãy phân tích và đối sánh khách quan, sâu sắc giữa các địa phương: " + String.join(", ", request.provinceSlugs())
                + " theo khía cạnh: " + aspectLabel + ".\n"
                + "- Hãy sử dụng các công cụ tra cứu văn hóa và tri thức để thu thập dữ liệu xác thực cho từng địa phương trước khi đối sánh.\n"
                + "- Trình bày rõ điểm tương đồng (nét giao thoa) và điểm dị biệt đặc trưng của từng địa phương.\n";

        String assistantContent;
        if (chatClient == null) {
            log.warn("ChatClient is not configured (e.g. test profile with model chat: none)");
            assistantContent = "Hệ thống trợ lý văn hóa VICA hiện đang tạm thời gián đoạn kết nối tới mô hình AI. Xin vui lòng thử lại sau ít phút.";
        } else {
            try {
                assistantContent = chatClient.prompt()
                        .system(systemPrompt)
                        .messages(history)
                        .user(userMessage)
                        .toolCallbacks(guardedGeo, guardedCultural, guardedRag)
                        .call()
                        .content();

                if (assistantContent == null || assistantContent.isBlank()) {
                    assistantContent = "Tôi đã ghi nhận yêu cầu so sánh nhưng hiện tại chưa thể tạo nội dung đối sánh chi tiết. Xin bạn vui lòng thử lại.";
                }
            } catch (Exception e) {
                log.error("AI Model invocation failed during compare for conversation {}: {}", context.conversationId(), e.getMessage(), e);
                assistantContent = "Hệ thống trợ lý văn hóa VICA hiện đang tạm thời gián đoạn kết nối tới mô hình AI. Xin vui lòng thử lại sau ít phút.";
            }
        }

        List<CitationDto> citations = citationBuilderService.buildCitations(capturedResults, assistantContent);
        List<SuggestedQuestionDto> suggestions = suggestionEngine.generateSuggestions(
                userMessage, assistantContent, context.effectiveProvinceSlug(), capturedResults);

        // Phase 3: Lưu phản hồi trợ lý ảo và trích dẫn (Transaction ngắn)
        Message assistantMessage = persistenceService.completeAssistantMessage(
                context.conversationId(),
                assistantContent,
                citations,
                capturedToolCalls,
                context.effectiveProvinceSlug()
        );

        return new CompareResponse(
                context.conversationId(),
                assistantMessage.getId(),
                request.provinceSlugs(),
                request.aspect(),
                assistantContent,
                citations,
                suggestions,
                context.credentials()
        );
    }

    private String resolveEffectiveProvinceSlug(String currentSlug, List<ToolExecutionResult<?>> toolResults) {
        if (currentSlug != null && !currentSlug.isBlank()) {
            return currentSlug;
        }
        for (ToolExecutionResult<?> result : toolResults) {
            if (result != null && result.metadata() != null) {
                for (ToolSourceMetadata meta : result.metadata()) {
                    if (meta.provinceSlug() != null && !meta.provinceSlug().isBlank()) {
                        return meta.provinceSlug().trim();
                    }
                }
            }
        }
        return currentSlug;
    }
}
