-- Cultural module. Province is owned by Geographic: store provinceSlug only (no FK to provinces);
-- existence is validated in the service layer through GeographicService.
CREATE TABLE culture_sources (
    id             BIGSERIAL PRIMARY KEY,
    title          VARCHAR(500) NOT NULL,
    author         VARCHAR(255),
    publisher      VARCHAR(255),
    source_type    VARCHAR(30)  NOT NULL CHECK (source_type IN
                   ('BOOK','ARTICLE','WEBSITE','GOV_DOCUMENT','UNESCO','FIELDWORK','ORAL')),
    url            VARCHAR(1000),
    published_year INTEGER CHECK (published_year BETWEEN 0 AND 2100),
    accessed_at    DATE,
    review_status  VARCHAR(20)  NOT NULL DEFAULT 'APPROVED'
                   CHECK (review_status IN ('PENDING','APPROVED','REJECTED')),
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP
);

CREATE TABLE culture_entries (
    id                  BIGSERIAL PRIMARY KEY,
    slug                VARCHAR(200) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    province_slug       VARCHAR(100) NOT NULL CHECK (province_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    entry_type          VARCHAR(20)  NOT NULL CHECK (entry_type IN ('HERITAGE','CUISINE','FESTIVAL','FIGURE','PLACE')),
    category            VARCHAR(50),
    name                VARCHAR(255) NOT NULL,
    summary             VARCHAR(500),
    description         TEXT NOT NULL,
    verification_status VARCHAR(20)  NOT NULL CHECK (verification_status IN ('VERIFIED','LEGEND')),
    historical_period   VARCHAR(150),
    latitude            DOUBLE PRECISION CHECK (latitude  BETWEEN -90  AND 90),
    longitude           DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
    geom geometry(Point, 4326) GENERATED ALWAYS AS (
        CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
             THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) END) STORED,
    featured            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP,
    CONSTRAINT culture_entries_coord_pair   CHECK ((latitude IS NULL) = (longitude IS NULL)),
    CONSTRAINT culture_entries_place_coord  CHECK (entry_type <> 'PLACE' OR latitude IS NOT NULL),
    CONSTRAINT culture_entries_heritage_cat CHECK (entry_type <> 'HERITAGE' OR category IN ('TANGIBLE','INTANGIBLE'))
);
CREATE INDEX idx_culture_entries_province_type ON culture_entries(province_slug, entry_type);
CREATE INDEX idx_culture_entries_geom ON culture_entries USING GIST (geom);

CREATE TABLE culture_entry_sources (
    id            BIGSERIAL PRIMARY KEY,
    entry_id      BIGINT NOT NULL REFERENCES culture_entries(id) ON DELETE CASCADE,
    source_id     BIGINT NOT NULL REFERENCES culture_sources(id),
    citation_note VARCHAR(500),
    CONSTRAINT uq_culture_entry_source UNIQUE (entry_id, source_id)
);

CREATE TABLE culture_media (
    id         BIGSERIAL PRIMARY KEY,
    entry_id   BIGINT NOT NULL REFERENCES culture_entries(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('IMAGE','VIDEO','MODEL_3D')),
    url        VARCHAR(1000) NOT NULL,
    caption    VARCHAR(500),
    credit     VARCHAR(255),
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE province_culture_profiles (
    province_slug VARCHAR(100) PRIMARY KEY CHECK (province_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    overview      TEXT NOT NULL,
    updated_at    TIMESTAMP
);