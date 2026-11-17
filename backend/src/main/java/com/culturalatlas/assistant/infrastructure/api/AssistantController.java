package com.culturalatlas.assistant.infrastructure.api;

import com.culturalatlas.assistant.application.dto.request.ChatRequest;
import com.culturalatlas.assistant.application.dto.request.CompareRequest;
import com.culturalatlas.assistant.application.dto.response.ChatResponse;
import com.culturalatlas.assistant.application.dto.response.CompareResponse;
import com.culturalatlas.assistant.application.dto.response.ConversationDetailResponse;
import com.culturalatlas.assistant.application.dto.response.ConversationSummaryDto;
import com.culturalatlas.assistant.application.service.AssistantOrchestratorService;
import com.culturalatlas.assistant.application.service.AssistantQueryService;
import com.culturalatlas.common.ApiResponse;
import com.culturalatlas.user.User;
import com.culturalatlas.user.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

/**
 * REST Controller cung cấp các API tương tác cho Trợ lý AI và tra cứu lịch sử hội thoại VICA.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/assistant")
@RequiredArgsConstructor
@Tag(name = "AI Cultural Assistant", description = "Endpoints hỏi đáp tri thức, đối sánh văn hóa và tra cứu lịch sử trò chuyện")
public class AssistantController {

    private final AssistantOrchestratorService orchestratorService;
    private final AssistantQueryService queryService;
    private final UserRepository userRepository;

    @PostMapping("/chat")
    @Operation(summary = "Hỏi đáp văn hóa với VICA Assistant")
    public ResponseEntity<ApiResponse<ChatResponse>> chat(
            @Valid @RequestBody ChatRequest request,
            @RequestHeader(value = "X-Guest-Token", required = false) String guestToken,
            Principal principal
    ) {
        Long userId = resolveUserId(principal);
        ChatResponse response = orchestratorService.chat(request, userId, guestToken);

        var builder = ResponseEntity.ok();
        if (response.credentials() != null) {
            builder.header(HttpHeaders.CACHE_CONTROL, "no-store")
                   .header("Pragma", "no-cache");
        }
        return builder.body(ApiResponse.success("Phản hồi thành công từ Trợ lý VICA", response));
    }

    @PostMapping("/compare")
    @Operation(summary = "So sánh văn hóa giữa 2-3 địa phương")
    public ResponseEntity<ApiResponse<CompareResponse>> compare(
            @Valid @RequestBody CompareRequest request,
            @RequestHeader(value = "X-Guest-Token", required = false) String guestToken,
            Principal principal
    ) {
        Long userId = resolveUserId(principal);
        CompareResponse response = orchestratorService.compare(request, userId, guestToken);

        var builder = ResponseEntity.ok();
        if (response.credentials() != null) {
            builder.header(HttpHeaders.CACHE_CONTROL, "no-store")
                   .header("Pragma", "no-cache");
        }
        return builder.body(ApiResponse.success("So sánh văn hóa thành công", response));
    }

    @GetMapping("/conversations")
    @Operation(summary = "Lấy danh sách các phiên hội thoại (phân trang)")
    public ResponseEntity<ApiResponse<Page<ConversationSummaryDto>>> listConversations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestHeader(value = "X-Guest-Token", required = false) String guestToken,
            @RequestHeader(value = "X-Guest-Session-Uuid", required = false) UUID headerSessionUuid,
            @RequestParam(required = false) UUID sessionUuid,
            Principal principal
    ) {
        Long userId = resolveUserId(principal);
        UUID effectiveSessionUuid = headerSessionUuid != null ? headerSessionUuid : sessionUuid;
        Page<ConversationSummaryDto> result = queryService.listConversations(
                userId, effectiveSessionUuid, guestToken, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách hội thoại thành công", result));
    }

    @GetMapping("/conversations/{id}")
    @Operation(summary = "Lấy chi tiết lịch sử tin nhắn của một phiên hội thoại")
    public ResponseEntity<ApiResponse<ConversationDetailResponse>> getConversationDetail(
            @PathVariable Long id,
            @RequestHeader(value = "X-Guest-Token", required = false) String guestToken,
            @RequestHeader(value = "X-Guest-Session-Uuid", required = false) UUID headerSessionUuid,
            @RequestParam(required = false) UUID sessionUuid,
            Principal principal
    ) {
        Long userId = resolveUserId(principal);
        UUID effectiveSessionUuid = headerSessionUuid != null ? headerSessionUuid : sessionUuid;
        ConversationDetailResponse detail = queryService.getConversationDetail(
                id, userId, effectiveSessionUuid, guestToken);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết hội thoại thành công", detail));
    }

    private Long resolveUserId(Principal principal) {
        if (principal == null || "anonymousUser".equalsIgnoreCase(principal.getName())) {
            return null;
        }
        try {
            return Long.parseLong(principal.getName());
        } catch (NumberFormatException ignored) {
            return userRepository.findByUsername(principal.getName())
                    .map(User::getId)
                    .orElse(null);
        }
    }
}
