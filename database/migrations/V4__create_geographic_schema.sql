-- Geographic owns these tables. IDs are assigned by docs/api/provinces-v1.json.
CREATE TABLE geographic_datasets (
    version VARCHAR(100) PRIMARY KEY,
    source_file TEXT NOT NULL,
    source_sha256 VARCHAR(64) NOT NULL,
    source_commit VARCHAR(40) NOT NULL,
    provenance_status VARCHAR(50) NOT NULL,
    license_status VARCHAR(50) NOT NULL
);

CREATE TABLE provinces (
    id BIGINT PRIMARY KEY CHECK (id > 0),
    slug VARCHAR(100) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name VARCHAR(150) NOT NULL,
    admin_unit VARCHAR(200) NOT NULL,
    dataset_version VARCHAR(100) NOT NULL REFERENCES geographic_datasets(version),
    boundary geometry(MultiPolygon, 4326) NOT NULL,
    CONSTRAINT provinces_boundary_valid CHECK (ST_IsValid(boundary) AND NOT ST_IsEmpty(boundary)),
    CONSTRAINT provinces_boundary_wgs84 CHECK (
        ST_XMin(Box3D(boundary)) >= -180 AND ST_XMax(Box3D(boundary)) <= 180
        AND ST_YMin(Box3D(boundary)) >= -90 AND ST_YMax(Box3D(boundary)) <= 90
    )
);

CREATE INDEX idx_provinces_boundary ON provinces USING GIST (boundary);
