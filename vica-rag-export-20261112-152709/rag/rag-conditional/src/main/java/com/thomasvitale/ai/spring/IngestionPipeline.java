package com.thomasvitale.ai.spring;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.markdown.MarkdownDocumentReader;
import org.springframework.ai.reader.markdown.config.MarkdownDocumentReaderConfig;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Component
class IngestionPipeline {

    private static final Logger log = LoggerFactory.getLogger(IngestionPipeline.class);
    private static final int BATCH = 50;

    private final VectorStore vectorStore;
    private final JdbcTemplate jdbc;

    @Value("file:/app/data/_manifest.csv") Resource manifestCsv;
    @Value("file:/app/data/entities/*.md")  Resource[] entityFiles;
    @Value("file:/app/data/_images.csv")    Resource imagesCsv;

    IngestionPipeline(VectorStore vectorStore, JdbcTemplate jdbc) {
        this.vectorStore = vectorStore;
        this.jdbc = jdbc;
    }

    @PostConstruct
    void run() throws Exception {
        long existing = 0;
        try {
            Long n = jdbc.queryForObject("SELECT count(*) FROM vector_store", Long.class);
            if (n != null) existing = n;
        } catch (Exception ignore) {}
        if (existing > 0) {
            log.info("Vector store đã có {} chunk, bỏ qua ingest. Muốn nạp lại: TRUNCATE TABLE vector_store;", existing);
            return;
        }
        if (!manifestCsv.exists() || entityFiles == null || entityFiles.length == 0) {
            log.warn("Không thấy /app/data/_manifest.csv hoặc /app/data/entities/*.md — kiểm tra volume mount. Bỏ qua ingest.");
            return;
        }

        Map<String, Map<String, String>> manifest = loadManifest();
        Map<String, Map<String, String>> images = loadImages();
        List<Document> docs = new ArrayList<>();
        int missed = 0;

        for (Resource f : entityFiles) {
            String filename = f.getFilename();
            Map<String, String> row = manifest.get(filename);
            if (row == null) { missed++; log.warn("Không có dòng manifest cho {}", filename); continue; }

            String domain = row.getOrDefault("domain", "");
            Map<String, Object> extra = new HashMap<>();
            extra.put("entity_id",     row.getOrDefault("entity_id", ""));
            extra.put("official_name", row.getOrDefault("official_name", ""));
            extra.put("domain",        domain);
            extra.put("province",      row.getOrDefault("dia_phuong_quyet_dinh", ""));
            extra.put("era",           row.getOrDefault("era", ""));
            extra.put("lat",           row.getOrDefault("lat", ""));
            extra.put("lon",           row.getOrDefault("lon", ""));
            extra.put("is_history", domain.contains("lịch sử"));
            extra.put("is_cuisine", domain.contains("ẩm thực"));
            extra.put("is_culture", domain.contains("văn hoá"));
            Map<String, String> img = images.get(row.getOrDefault("entity_id", ""));
            if (img != null) {
                extra.put("image_url",     img.getOrDefault("thumb_url", ""));
                extra.put("image_license", img.getOrDefault("license", ""));
                extra.put("image_author",  img.getOrDefault("author", ""));
                extra.put("image_source",  img.getOrDefault("source_page", ""));
            }

            docs.addAll(new MarkdownDocumentReader(f, MarkdownDocumentReaderConfig.builder()
                    .withAdditionalMetadata(extra).build()).get());
        }

        List<Document> chunks = new TokenTextSplitter().split(docs);
        log.info("Ingest {} file -> {} chunk (thiếu manifest: {})", entityFiles.length, chunks.size(), missed);
        for (int i = 0; i < chunks.size(); i += BATCH) {
            vectorStore.add(chunks.subList(i, Math.min(i + BATCH, chunks.size())));
            log.info("  embedded {}/{}", Math.min(i + BATCH, chunks.size()), chunks.size());
            Thread.sleep(1000);
        }
        log.info("Ingest xong.");
    }

    private Map<String, Map<String, String>> loadImages() {
        Map<String, Map<String, String>> out = new HashMap<>();
        if (imagesCsv == null || !imagesCsv.exists()) {
            log.warn("Không thấy /app/data/_images.csv — ảnh sẽ trống");
            return out;
        }
        int skipped = 0;
        try (BufferedReader r = new BufferedReader(
                new InputStreamReader(imagesCsv.getInputStream(), StandardCharsets.UTF_8))) {
            List<String> header = null;
            String line;
            while ((line = r.readLine()) != null) {
                if (line.isBlank()) continue;
                List<String> cells = splitCsv(line);
                if (header == null) {
                    header = new ArrayList<>();
                    for (String h : cells) header.add(h.replace("\uFEFF", "").trim());
                    continue;
                }
                Map<String, String> row = new HashMap<>();
                for (int i = 0; i < header.size() && i < cells.size(); i++)
                    row.put(header.get(i), cells.get(i));
                if (row.getOrDefault("license", "").isBlank()
                        || row.getOrDefault("thumb_url", "").isBlank()) { skipped++; continue; }
                out.put(row.getOrDefault("entity_id", ""), row);
            }
        } catch (Exception e) {
            log.error("Lỗi đọc _images.csv", e);
            return out;
        }
        log.info("Nạp {} ảnh có giấy phép hợp lệ (loại {} thiếu license/url)", out.size(), skipped);
        return out;
    }

    private Map<String, Map<String, String>> loadManifest() throws Exception {
        Map<String, Map<String, String>> out = new HashMap<>();
        try (BufferedReader r = new BufferedReader(
                new InputStreamReader(manifestCsv.getInputStream(), StandardCharsets.UTF_8))) {
            List<String> header = null;
            String line;
            while ((line = r.readLine()) != null) {
                if (line.isBlank()) continue;
                List<String> cells = splitCsv(line);
                if (header == null) { header = new ArrayList<>(); for (String h : cells) header.add(h.replace("\uFEFF", "").trim()); continue; }
                Map<String, String> row = new HashMap<>();
                for (int i = 0; i < header.size() && i < cells.size(); i++) row.put(header.get(i), cells.get(i));
                String file = row.getOrDefault("file", "");
                if (file.startsWith("entities/")) file = file.substring("entities/".length());
                if (!file.isEmpty()) out.put(file, row);
            }
        }
        return out;
    }

    private static List<String> splitCsv(String line) {
        List<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean q = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (q) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') { cur.append('"'); i++; }
                    else q = false;
                } else cur.append(c);
            } else {
                if (c == '"') q = true;
                else if (c == ',') { out.add(cur.toString()); cur.setLength(0); }
                else cur.append(c);
            }
        }
        out.add(cur.toString());
        return out;
    }
}
