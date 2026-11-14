# VICA RAG server

Spring Boot reads the prepared entity files from `/app/data`. On EC2, Compose mounts
`/home/ec2-user/llm-apps-java-spring-ai/rag/rag-conditional/data/` at that path. The
mount should contain `_embed_manifest.csv` (preferred), `_images.csv` (optional),
and `entities/*.md`. If `_embed_manifest.csv` is absent, the server falls back to
`_manifest.csv`.

The server uses OpenAI for chat and embeddings. `text-embedding-3-small` is configured
to return 768 dimensions to match the pgvector table. At startup, entity IDs already
present in `vector_store` are skipped, so ordinary restarts do not embed the same files
again.

## Query and image APIs

`POST /rag/query/routing` keeps the original plain-text answer response. The server first
searches pgvector; if it finds no relevant chunks, it answers from general model knowledge
and says that the answer did not come from the RAG store.

Use `POST /rag/query/with-images` when the client needs the answer and related images in
one JSON response:

```json
{
  "question": "Giới thiệu về địa điểm này",
  "placeId": "optional-entity-id"
}
```

The response contains `answer`, `answerSource` (`rag` or `llm_general_knowledge`), and
`images` with URL, license, author, and source page. The separate image endpoints remain
available: `POST /rag/images` searches by question, and `GET /rag/images/{entityId}`
returns images for one entity.

## Configure on EC2

Keep the real API key in the ignored `.env` file; never add it to source control. If
`.env` does not exist yet:

```bash
cd /home/ec2-user/llm-apps-java-spring-ai/rag/rag-conditional
cp env.example .env
nano .env
chmod 600 .env
```

Set `OPENAI_API_KEY` in `.env`. Keep the existing PostgreSQL values and set
`OPENAI_CHAT_MODEL=gpt-4o-mini` and
`OPENAI_EMBEDDING_MODEL=text-embedding-3-small`.

## Deploy the updated app on the existing EC2 setup

1. Push the code changes to the branch used by EC2. Connect to the existing instance and
   pull the update:

```bash
cd /home/ec2-user/llm-apps-java-spring-ai
git pull --ff-only
cd rag/rag-conditional
```

2. Set the rotated key in `.env` and keep the existing PostgreSQL settings. Confirm that
   the downloaded entity files are present in the host directory which is mounted to
   `/app/data`:

```bash
nano .env
chmod 600 .env
ls data/_embed_manifest.csv
find data/entities -maxdepth 1 -name '*.md' | wc -l
```

3. When switching an existing database from Gemini to OpenAI, clear the old vectors once.
Equal vector dimensions do not make embeddings from different providers compatible. This
truncates only the RAG vectors; it keeps the PostgreSQL volume and all other data.

```bash
sudo docker compose stop app
sudo docker compose exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "TRUNCATE TABLE vector_store;"'
sudo docker compose up -d --build app
```

4. Follow ingestion and application logs:

```bash
sudo docker compose logs -f app
```

Look for `Ingest ... file -> ... chunk` and `Ingest xong.`. The mounted data remains
read-only to the app container; new or updated files can be copied to the EC2 `data/`
directory and the app restarted. Existing entity IDs are skipped, so to re-embed
changed content for an existing ID, clear `vector_store` before restarting.

5. Smoke-check the combined answer and image response through Caddy:

```bash
curl -sS -X POST http://127.0.0.1/rag/query/with-images \
  -H 'Content-Type: application/json' \
  -d '{"question":"Giới thiệu về địa điểm này"}'
```
