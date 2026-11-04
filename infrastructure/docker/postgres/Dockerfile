# PostgreSQL 16 with pgvector and PostGIS
FROM pgvector/pgvector:pg16

LABEL maintainer="Vietnam Cultural Atlas Team <contact@culturalatlas.vn>"
LABEL description="PostgreSQL 16 with both pgvector and PostGIS spatial extensions"

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        postgresql-16-postgis-3 \
        postgresql-16-postgis-3-scripts \
    && rm -rf /var/lib/apt/lists/*
