package com.culturalatlas.assistant.application.service;

import com.culturalatlas.assistant.application.dto.tool.ToolExecutionResult;
import com.culturalatlas.assistant.application.dto.tool.ToolExecutionStatus;
import com.culturalatlas.assistant.application.dto.tool.ToolSourceMetadata;
import com.culturalatlas.assistant.domain.enums.VerificationStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.ai.tool.metadata.ToolMetadata;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Decorator bọc quanh ToolCallback của Spring AI nhằm thực thi các Guardrails của Orchestrator:
 * 1. Giới hạn tối đa số lần gọi Tool trên toàn request (mặc định 3).
 * 2. Timeout thực thi tối đa 5 giây cho mỗi Tool.
 * 3. Cô lập lỗi (Failure Isolation): lỗi ở 1 Tool không làm đứt gãy Tool khác hay sập request.
 * 4. Giới hạn độ dài output trả về cho model (Bounded Output).
 * 5. Thu thập ToolExecutionResult và ToolSourceMetadata thực tế cho CitationBuilderService.
 * 6. Ghi vết tool calls phục vụ lưu trữ Message.tool_calls.
 */
@Slf4j
public class GuardedToolCallback implements ToolCallback {

    private final ToolCallback delegate;
    private final AtomicInteger executionCounter;
    private final int maxExecutions;
    private final long timeoutMs;
    private final int maxOutputChars;
    private final List<ToolExecutionResult<?>> capturedResults;
    private final List<Map<String, Object>> capturedToolCalls;
    private final ObjectMapper objectMapper;

    public static final int DEFAULT_MAX_EXECUTIONS = 3;
    public static final long DEFAULT_TIMEOUT_MS = 5000L;
    public static final int DEFAULT_MAX_OUTPUT_CHARS = 10000;

    public GuardedToolCallback(
            ToolCallback delegate,
            AtomicInteger executionCounter,
            int maxExecutions,
            long timeoutMs,
            int maxOutputChars,
            List<ToolExecutionResult<?>> capturedResults,
            List<Map<String, Object>> capturedToolCalls,
            ObjectMapper objectMapper
    ) {
        this.delegate = Objects.requireNonNull(delegate, "delegate must not be null");
        this.executionCounter = Objects.requireNonNull(executionCounter, "executionCounter must not be null");
        this.maxExecutions = maxExecutions;
        this.timeoutMs = timeoutMs;
        this.maxOutputChars = maxOutputChars;
        this.capturedResults = Objects.requireNonNull(capturedResults, "capturedResults must not be null");
        this.capturedToolCalls = Objects.requireNonNull(capturedToolCalls, "capturedToolCalls must not be null");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper must not be null");
    }

    public GuardedToolCallback(
            ToolCallback delegate,
            AtomicInteger executionCounter,
            List<ToolExecutionResult<?>> capturedResults,
            List<Map<String, Object>> capturedToolCalls,
            ObjectMapper objectMapper
    ) {
        this(delegate, executionCounter, DEFAULT_MAX_EXECUTIONS, DEFAULT_TIMEOUT_MS, DEFAULT_MAX_OUTPUT_CHARS,
                capturedResults, capturedToolCalls, objectMapper);
    }

    @Override
    public ToolDefinition getToolDefinition() {
        return delegate.getToolDefinition();
    }

    @Override
    public ToolMetadata getToolMetadata() {
        return delegate.getToolMetadata();
    }

    @Override
    public String call(String toolInput) {
        return call(toolInput, null);
    }

    @Override
    public String call(String toolInput, ToolContext toolContext) {
        String toolName = getToolDefinition() != null ? getToolDefinition().name() : "unknownTool";

        // 1. Kiểm tra giới hạn số lần gọi Tool trên toàn request
        int currentCount = executionCounter.incrementAndGet();
        if (currentCount > maxExecutions) {
            log.warn("Tool execution limit exceeded ({}/{}) for tool: {}", currentCount, maxExecutions, toolName);
            ToolExecutionResult<?> err = ToolExecutionResult.error(
                    "EXECUTION_LIMIT_EXCEEDED",
                    "Đã đạt giới hạn tối đa " + maxExecutions + " lần thực thi công cụ cho mỗi yêu cầu."
            );
            capturedResults.add(err);
            recordToolCall(toolName, toolInput, "EXECUTION_LIMIT_EXCEEDED");
            return serializeSafe(err);
        }

        // 2. Thực thi công cụ với timeout 5 giây và cô lập lỗi
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
            if (toolContext != null) {
                return delegate.call(toolInput, toolContext);
            } else {
                return delegate.call(toolInput);
            }
        });

        String rawOutput;
        try {
            rawOutput = future.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            log.warn("Tool {} timed out after {} ms", toolName, timeoutMs);
            ToolExecutionResult<?> err = ToolExecutionResult.error(
                    ToolExecutionResult.ERROR_DEPENDENCY_UNAVAILABLE,
                    "Thời gian thực thi công cụ vượt quá giới hạn " + (timeoutMs / 1000) + " giây."
            );
            capturedResults.add(err);
            recordToolCall(toolName, toolInput, "TIMEOUT");
            return serializeSafe(err);
        } catch (Exception e) {
            log.error("Tool {} failed with exception: {}", toolName, e.getMessage(), e);
            ToolExecutionResult<?> err = ToolExecutionResult.error(
                    ToolExecutionResult.ERROR_DEPENDENCY_UNAVAILABLE,
                    "Dịch vụ tạm thời không khả dụng: " + e.getMessage()
            );
            capturedResults.add(err);
            recordToolCall(toolName, toolInput, "ERROR");
            return serializeSafe(err);
        }

        // 3. Giới hạn kích thước output
        if (rawOutput != null && rawOutput.length() > maxOutputChars) {
            log.warn("Tool {} output exceeded {} chars, truncated", toolName, maxOutputChars);
            rawOutput = rawOutput.substring(0, maxOutputChars);
        }

        // 4. Parse ToolExecutionResult và thu thập metadata
        parseAndCaptureResult(rawOutput, toolName, toolInput);

        return rawOutput != null ? rawOutput : serializeSafe(ToolExecutionResult.noData("Không có dữ liệu"));
    }

    private void parseAndCaptureResult(String rawJson, String toolName, String toolInput) {
        if (rawJson == null || rawJson.isBlank()) {
            return;
        }
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            String statusStr = root.path("status").asText(null);
            ToolExecutionStatus status = ToolExecutionStatus.SUCCESS;
            if (statusStr != null) {
                try {
                    status = ToolExecutionStatus.valueOf(statusStr);
                } catch (Exception ignored) {}
            }

            String message = root.path("message").asText("");
            String errorCode = root.path("errorCode").isNull() ? null : root.path("errorCode").asText(null);

            List<ToolSourceMetadata> metadataList = new ArrayList<>();
            JsonNode metaArray = root.path("metadata");
            if (metaArray.isArray()) {
                for (JsonNode mNode : metaArray) {
                    String sourceId = mNode.path("sourceId").asText(null);
                    String sourceName = mNode.path("sourceName").asText(null);
                    String sourceUrl = mNode.path("sourceUrl").isNull() ? null : mNode.path("sourceUrl").asText(null);
                    String docId = mNode.path("documentId").isNull() ? null : mNode.path("documentId").asText(null);
                    Integer pageNum = mNode.path("pageNumber").isInt() ? mNode.path("pageNumber").asInt() : null;
                    String slug = mNode.path("provinceSlug").isNull() ? null : mNode.path("provinceSlug").asText(null);
                    String vStatusStr = mNode.path("verificationStatus").asText(null);
                    VerificationStatus vStatus = VerificationStatus.UNVERIFIED;
                    if (vStatusStr != null) {
                        try {
                            vStatus = VerificationStatus.valueOf(vStatusStr);
                        } catch (Exception ignored) {}
                    }
                    if (sourceId != null && sourceName != null) {
                        metadataList.add(new ToolSourceMetadata(sourceId, sourceName, sourceUrl, docId, pageNum, slug, vStatus));
                    }
                }
            }

            ToolExecutionResult<?> result;
            if (status == ToolExecutionStatus.SUCCESS) {
                result = ToolExecutionResult.success(root.path("data"), metadataList, message);
            } else if (status == ToolExecutionStatus.NO_DATA) {
                result = ToolExecutionResult.noData(message);
            } else {
                result = ToolExecutionResult.error(errorCode != null ? errorCode : "INTERNAL_ERROR", message);
            }
            capturedResults.add(result);
            recordToolCall(toolName, toolInput, status.name());
        } catch (Exception e) {
            log.warn("Failed to parse tool execution JSON for capture: {}", e.getMessage());
        }
    }

    private void recordToolCall(String toolName, String input, String status) {
        Map<String, Object> map = new HashMap<>();
        map.put("tool", toolName);
        map.put("input", input);
        map.put("status", status);
        capturedToolCalls.add(map);
    }

    private String serializeSafe(ToolExecutionResult<?> result) {
        try {
            return objectMapper.writeValueAsString(result);
        } catch (Exception e) {
            return "{\"status\":\"ERROR\",\"message\":\"Serialization failed\",\"errorCode\":\"INTERNAL_ERROR\"}";
        }
    }
}

