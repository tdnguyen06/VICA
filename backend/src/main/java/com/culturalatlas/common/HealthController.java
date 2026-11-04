package com.culturalatlas.common;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
@Tag(name = "Health Check", description = "System and API status verification endpoint")
public class HealthController {

    @Value("${spring.application.name:vietnam-cultural-atlas}")
    private String appName;

    @Value("${app.version:1.0.0}")
    private String version;

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    @GetMapping
    @Operation(summary = "Check backend service health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkHealth() {
        Map<String, Object> healthData = new HashMap<>();
        healthData.put("status", "UP");
        healthData.put("app", appName);
        healthData.put("version", version);
        healthData.put("environment", activeProfile);
        healthData.put("timestamp", LocalDateTime.now().toString());

        return ResponseEntity.ok(ApiResponse.success("Vietnam Cultural Atlas API is operational", healthData));
    }
}

