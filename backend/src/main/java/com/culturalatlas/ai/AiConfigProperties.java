package com.culturalatlas.ai;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "app.ai")
public class AiConfigProperties {

    /**
     * Provider: gemini | openai
     */
    private String provider = "gemini";

    /**
     * API Key loaded from environment variable (LLM_API_KEY)
     */
    private String apiKey;

    /**
     * Model name for text generation / agent reasoning
     */
    private String chatModel = "gemini-1.5-flash";

    /**
     * Model name for embedding & vector search
     */
    private String embeddingModel = "text-embedding-004";

    /**
     * Flag to enable AI integration once API Key is configured
     */
    private boolean enabled = false;

    /**
     * Vector search top-k results
     */
    private int topK = 5;

    /**
     * Similarity threshold for vector similarity matching
     */
    private double similarityThreshold = 0.75;
}

