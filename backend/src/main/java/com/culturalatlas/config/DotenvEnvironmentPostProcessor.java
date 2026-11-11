package com.culturalatlas.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Tự động nạp các biến môi trường từ file .env ở máy lập trình viên (nếu tồn tại)
 * vào Spring Environment mà không ghi đè các biến môi trường thật của hệ thống.
 */
@Order(Ordered.LOWEST_PRECEDENCE)
public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final Logger log = LoggerFactory.getLogger(DotenvEnvironmentPostProcessor.class);

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        File[] candidateFiles = new File[] {
                new File(".env"),
                new File("backend/.env"),
                new File("../.env")
        };

        for (File file : candidateFiles) {
            if (file.exists() && file.isFile()) {
                try {
                    List<String> lines = Files.readAllLines(file.toPath(), StandardCharsets.UTF_8);
                    Map<String, Object> props = new HashMap<>();
                    for (String line : lines) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) continue;
                        int eqIdx = line.indexOf('=');
                        if (eqIdx > 0) {
                            String key = line.substring(0, eqIdx).trim();
                            String value = line.substring(eqIdx + 1).trim();
                            if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
                                value = value.substring(1, value.length() - 1);
                            }
                            props.put(key, value);
                        }
                    }
                    if (!props.isEmpty()) {
                        environment.getPropertySources().addLast(new MapPropertySource("dotenvProperties", props));
                        log.info("Loaded {} environment properties from local {}", props.size(), file.getPath());
                    }
                    break;
                } catch (Exception e) {
                    log.warn("Could not load .env file from {}: {}", file.getPath(), e.getMessage());
                }
            }
        }
    }
}
