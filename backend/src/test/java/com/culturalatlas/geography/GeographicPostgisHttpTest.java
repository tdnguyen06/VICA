package com.culturalatlas.geography;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Real HTTP server, real service/repository, Flyway and PostGIS. No mocked Geographic beans. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "VICA_GEO_TEST_JDBC_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/vica_geo_test")
class GeographicPostgisHttpTest {
    @Autowired private TestRestTemplate client;
    @Autowired private JdbcTemplate jdbc;

    @DynamicPropertySource
    static void postgisProperties(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", () -> System.getenv("VICA_GEO_TEST_JDBC_URL"));
        properties.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        properties.add("spring.datasource.username", () -> "postgres");
        properties.add("spring.datasource.password", () -> "vica_geo_test_only");
        properties.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        properties.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        properties.add("spring.flyway.enabled", () -> true);
        properties.add("spring.flyway.baseline-on-migrate", () -> true);
        properties.add("spring.flyway.baseline-version", () -> "0");
    }

    @Test
    void migrationsCreateGeometryAndGistInTheActualDatabase() {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history "
                + "WHERE version IN ('4','5') AND success", Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT type FROM geometry_columns "
                + "WHERE f_table_schema='public' AND f_table_name='provinces' AND f_geometry_column='boundary'",
                String.class)).isEqualTo("MULTIPOLYGON");
        assertThat(jdbc.queryForObject("SELECT srid FROM geometry_columns "
                + "WHERE f_table_schema='public' AND f_table_name='provinces' AND f_geometry_column='boundary'",
                Integer.class)).isEqualTo(4326);
        assertThat(jdbc.queryForObject("SELECT indexdef FROM pg_indexes WHERE schemaname='public' "
                + "AND tablename='provinces' AND indexname='idx_provinces_boundary'", String.class))
                .containsIgnoringCase("USING gist (boundary)");
    }

    @Test
    void httpIdentifyReadsRealPostgisGeometry() {
        var response = client.postForEntity("/api/v1/geo/identify",
                Map.of("latitude", 21.0344, "longitude", 105.8407), Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("success", true);
        assertThat(((Map<?, ?>) response.getBody().get("data")).get("slug")).isEqualTo("ha-noi");
    }

    @Test
    void validOutsideCoordinatesAndInvalidLatitudeHaveDifferentHttpResults() {
        var outside = client.postForEntity("/api/v1/geo/identify",
                Map.of("latitude", 0, "longitude", 0), Map.class);
        assertThat(outside.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(outside.getBody()).containsEntry("success", true).containsEntry("data", null);
        var invalid = client.postForEntity("/api/v1/geo/identify",
                Map.of("latitude", 100, "longitude", 105), Map.class);
        assertThat(invalid.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(invalid.getBody()).containsEntry("status", 400);
    }

    @Test
    void httpListAndDetailMatchTheSeededRegistry() {
        var list = client.getForEntity("/api/v1/geo/provinces", Map.class);
        assertThat(list.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((java.util.List<?>) list.getBody().get("data")).hasSize(63);
        var detail = client.getForEntity("/api/v1/geo/provinces/ha-noi", Map.class);
        assertThat(detail.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(((Map<?, ?>) detail.getBody().get("data")).get("id")).isEqualTo(24);
        assertThat(client.getForEntity("/api/v1/geo/provinces/missing", Map.class).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }
}
