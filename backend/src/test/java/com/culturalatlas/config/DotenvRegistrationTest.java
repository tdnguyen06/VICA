package com.culturalatlas.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultBootstrapContext;
import org.springframework.boot.env.EnvironmentPostProcessorsFactory;
import org.springframework.boot.logging.DeferredLogs;

import static org.assertj.core.api.Assertions.assertThat;

class DotenvRegistrationTest {

    @Test
    void springBootDiscoversLocalEnvironmentLoaderExactlyOnce() {
        var processors = EnvironmentPostProcessorsFactory
                .fromSpringFactories(getClass().getClassLoader())
                .getEnvironmentPostProcessors(new DeferredLogs(), new DefaultBootstrapContext());

        assertThat(processors)
                .filteredOn(processor -> processor instanceof DotenvEnvironmentPostProcessor)
                .as("Spring Boot must discover the local .env loader before configuring beans")
                .hasSize(1);
    }
}