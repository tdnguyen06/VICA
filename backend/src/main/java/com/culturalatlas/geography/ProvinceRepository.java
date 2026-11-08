package com.culturalatlas.geography;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public class ProvinceRepository {
    private static final RowMapper<Province> MAPPER = (rs, row) -> new Province(
            rs.getLong("id"), rs.getString("slug"), rs.getString("name"), rs.getString("admin_unit"));
    private static final String COLUMNS = "SELECT id, slug, name, admin_unit FROM provinces ";
    static final String IDENTIFY_SQL = COLUMNS + """
            WHERE ST_Covers(boundary, ST_SetSRID(ST_MakePoint(?, ?), 4326))
            ORDER BY slug COLLATE "C" LIMIT 1
            """;
    private final JdbcTemplate jdbc;

    public ProvinceRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Province> findAll() {
        return jdbc.query(COLUMNS + "ORDER BY slug COLLATE \"C\"", MAPPER);
    }

    public Optional<Province> findBySlug(String slug) {
        return jdbc.query(COLUMNS + "WHERE slug = ?", MAPPER, slug).stream().findFirst();
    }

    public Optional<Province> identify(BigDecimal latitude, BigDecimal longitude) {
        // PostGIS point coordinates are x/y = longitude/latitude.
        return jdbc.query(IDENTIFY_SQL, MAPPER, longitude, latitude).stream().findFirst();
    }
}
