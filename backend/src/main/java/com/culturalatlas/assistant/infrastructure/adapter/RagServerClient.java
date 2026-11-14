package com.culturalatlas.assistant.infrastructure.adapter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;

/**
 * Calls the external RAG server (POST {base}/rag/query/with-images).
 * Server-to-server, so the browser never needs CORS or mixed-content access to the RAG host.
 */
@Component
public class RagServerClient {

    public record RagImage(String entityId, String name, String url, String license, String author, String sourcePage) {}

    public record RagAnswer(String answer, List<RagImage> images, String answerSource) {}

    private record RagRequest(String question, String placeId) {}

    private final RestClient restClient;
    private final boolean enabled;

    public RagServerClient(@Value("${app.rag.base-url:}") String baseUrl,
                           @Value("${app.rag.timeout-seconds:60}") long timeoutSeconds) {
        this.enabled = StringUtils.hasText(baseUrl);
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        this.restClient = RestClient.builder()
                .baseUrl(enabled ? baseUrl.trim().replaceAll("/+$", "") : "http://localhost")
                .requestFactory(factory)
                .build();
    }

    /** False when RAG_BASE_URL is empty: the assistant then keeps using the configured chat model. */
    public boolean isEnabled() {
        return enabled;
    }

    /** @param placeId optional RAG entity_id; null searches everything */
    public RagAnswer ask(String question, String placeId) {
        return restClient.post()
                .uri("/rag/query/with-images")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new RagRequest(question, placeId))
                .retrieve()
                .body(RagAnswer.class);
    }
}
