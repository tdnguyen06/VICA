package com.culturalatlas.geography;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** Explicitly opt in with a dedicated disposable database, never the application DB. */
@EnabledIfEnvironmentVariable(named = "VICA_GEO_TEST_JDBC_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/vica_geo_test")
class ProvinceRepositoryPostgisTest {
    private static JdbcTemplate jdbc;
    private static ProvinceRepository repository;

    @BeforeAll
    static void migrateDedicatedDatabase() {
        var source = new DriverManagerDataSource(System.getenv("VICA_GEO_TEST_JDBC_URL"),
                "postgres", "vica_geo_test_only");
        // An image may already contain PostGIS extension tables; baseline at zero still runs V1 onward.
        Flyway.configure().dataSource(source).baselineOnMigrate(true).baselineVersion("0")
                .locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(source);
        repository = new ProvinceRepository(jdbc);
    }

    @Test
    void importsExactly63ValidProvincesAndKeepsRegistryIdentities() {
        assertThat(repository.findAll()).hasSize(63)
                .extracting(Province::getSlug).isSorted();
        assertThat(repository.findBySlug("ha-noi")).get().extracting(Province::getId).isEqualTo(24L);
        assertThat(repository.findBySlug("HA-NOI")).isEmpty();
        assertThat(repository.findBySlug("hoang-sa")).isEmpty();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM provinces WHERE NOT ST_IsValid(boundary) "
                + "OR ST_SRID(boundary) <> 4326 OR ST_IsEmpty(boundary)", Integer.class)).isZero();
    }

    @Test
    void identifiesRealHanoiAndRejectsOutsidePointAndSwappedAxes() {
        assertThat(repository.identify(new BigDecimal("21.0344"), new BigDecimal("105.8407")))
                .get().extracting(Province::getSlug).isEqualTo("ha-noi");
        assertThat(repository.identify(BigDecimal.ZERO, BigDecimal.ZERO)).isEmpty();
        assertThat(repository.identify(new BigDecimal("105.8407"), new BigDecimal("21.0344"))).isEmpty();
    }

    @Test
    void includesSharedBoundaryAndBreaksTieByAsciiSlug() {
        try {
            jdbc.update("""
                    INSERT INTO provinces(id,slug,name,admin_unit,dataset_version,boundary) VALUES
                    (10001,'aaa-test-left','Left','Test','vica-demo-63-v1',
                      ST_Multi(ST_GeomFromText('POLYGON((-22 -22,-21 -22,-21 -21,-22 -21,-22 -22))',4326))),
                    (10002,'bbb-test-right','Right','Test','vica-demo-63-v1',
                      ST_Multi(ST_GeomFromText('POLYGON((-21 -22,-20 -22,-20 -21,-21 -21,-21 -22))',4326)))
                    """);
            assertThat(repository.identify(new BigDecimal("-21.5"), new BigDecimal("-21")))
                    .get().extracting(Province::getSlug).isEqualTo("aaa-test-left");
            assertThat(repository.identify(new BigDecimal("-22"), new BigDecimal("-22")))
                    .get().extracting(Province::getSlug).isEqualTo("aaa-test-left");
        } finally {
            jdbc.update("DELETE FROM provinces WHERE id IN (10001,10002)");
        }
    }

    @Test
    void spatialLookupUsesGistIndex() {
        jdbc.execute("ANALYZE provinces");
        var plan = jdbc.queryForList("EXPLAIN " + ProvinceRepository.IDENTIFY_SQL,
                String.class, new BigDecimal("105.8407"), new BigDecimal("21.0344"));
        assertThat(String.join("\n", plan)).contains("idx_provinces_boundary");
    }
}
