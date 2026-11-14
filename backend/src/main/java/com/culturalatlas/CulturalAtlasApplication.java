package com.culturalatlas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@SpringBootApplication
@EnableJpaAuditing
@ConfigurationPropertiesScan
public class CulturalAtlasApplication {

    public static void main(String[] args) {
        loadDotenvIfPresent();
        SpringApplication.run(CulturalAtlasApplication.class, args);
    }

    private static void loadDotenvIfPresent() {
        Path[] candidatePaths = new Path[] {
            Path.of(".env"),
            Path.of("backend/.env"),
            Path.of("../.env")
        };

        for (Path path : candidatePaths) {
            if (Files.isRegularFile(path)) {
                try {
                    List<String> lines = Files.readAllLines(path);
                    for (String line : lines) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) {
                            continue;
                        }
                        int eqIdx = line.indexOf('=');
                        if (eqIdx > 0) {
                            String key = line.substring(0, eqIdx).trim();
                            String value = line.substring(eqIdx + 1).trim();
                            if ((value.startsWith("\"") && value.endsWith("\"")) ||
                                (value.startsWith("'") && value.endsWith("'"))) {
                                value = value.substring(1, value.length() - 1);
                            }
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, value);
                            }
                        }
                    }
                    System.out.println("[VICA] Successfully loaded environment from " + path.toAbsolutePath());
                    break;
                } catch (Exception e) {
                    System.err.println("[VICA] Warning: Could not read .env at " + path + ": " + e.getMessage());
                }
            }
        }
    }
}

