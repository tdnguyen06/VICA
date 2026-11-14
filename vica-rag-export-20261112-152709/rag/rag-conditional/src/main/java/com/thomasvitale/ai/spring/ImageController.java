package com.thomasvitale.ai.spring;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
class ImageController {

    public record ImageRef(String entityId, String name, String url,
                           String license, String author, String sourcePage) {}

    public record ImageQuery(String question, String placeId) {}

    private final VectorStore vectorStore;
    private final JdbcTemplate jdbc;

    ImageController(VectorStore vectorStore, JdbcTemplate jdbc) {
        this.vectorStore = vectorStore;
        this.jdbc = jdbc;
    }

    @PostMapping(value = "/rag/images",
                 consumes = MediaType.APPLICATION_JSON_VALUE,
                 produces = MediaType.APPLICATION_JSON_VALUE)
    List<ImageRef> byQuestion(@RequestBody ImageQuery req) {
        if (req.question() == null || req.question().isBlank()) return List.of();
        SearchRequest.Builder sb = SearchRequest.builder()
                .query(req.question().trim())
                .topK(12)
                .similarityThreshold(0.3);
        if (req.placeId() != null && !req.placeId().isBlank()) {
            sb.filterExpression(new FilterExpressionBuilder().eq("entity_id", req.placeId()).build());
        }
        LinkedHashMap<String, ImageRef> out = new LinkedHashMap<>();
        for (Document d : vectorStore.similaritySearch(sb.build())) {
            Map<String, Object> m = d.getMetadata();
            String url = s(m.get("image_url"));
            if (url.isBlank()) continue;
            String eid = s(m.get("entity_id"));
            out.putIfAbsent(eid, new ImageRef(eid, s(m.get("official_name")), url,
                    s(m.get("image_license")), s(m.get("image_author")), s(m.get("image_source"))));
        }
        return new ArrayList<>(out.values());
    }

    @GetMapping(value = "/rag/images/{entityId}", produces = MediaType.APPLICATION_JSON_VALUE)
    List<ImageRef> byEntity(@PathVariable String entityId) {
        return jdbc.query(
            "SELECT DISTINCT metadata->>'entity_id' AS eid, metadata->>'official_name' AS nm, "
          + "metadata->>'image_url' AS url, metadata->>'image_license' AS lic, "
          + "metadata->>'image_author' AS auth, metadata->>'image_source' AS src "
          + "FROM vector_store WHERE metadata->>'entity_id' = ? "
          + "AND coalesce(metadata->>'image_url','') <> ''",
            (rs, i) -> new ImageRef(rs.getString("eid"), rs.getString("nm"), rs.getString("url"),
                                    rs.getString("lic"), rs.getString("auth"), rs.getString("src")),
            entityId);
    }

    private static String s(Object o) { return o == null ? "" : String.valueOf(o); }
}
