from pathlib import Path
import shutil, sys

p = Path("src/main/java/com/thomasvitale/ai/spring/IngestionPipeline.java")
src = p.read_text(encoding="utf-8")
if "loadImages" in src:
    sys.exit("Đã patch rồi.")

A1 = '                if (header == null) { header = cells; continue; }'
R1 = r'                if (header == null) { header = new ArrayList<>(); for (String h : cells) header.add(h.replace("\uFEFF", "").trim()); continue; }'

A2 = '    @Value("file:/app/data/entities/*.md")  Resource[] entityFiles;'
R2 = A2 + '\n    @Value("file:/app/data/_images.csv")    Resource imagesCsv;'

A3 = '        Map<String, Map<String, String>> manifest = loadManifest();'
R3 = A3 + '\n        Map<String, Map<String, String>> images = loadImages();'

A4 = '            extra.put("is_culture", domain.contains("văn hoá"));'
R4 = A4 + r'''
            Map<String, String> img = images.get(row.getOrDefault("entity_id", ""));
            if (img != null) {
                extra.put("image_url",     img.getOrDefault("thumb_url", ""));
                extra.put("image_license", img.getOrDefault("license", ""));
                extra.put("image_author",  img.getOrDefault("author", ""));
                extra.put("image_source",  img.getOrDefault("source_page", ""));
            }'''

A5 = '    private Map<String, Map<String, String>> loadManifest() throws Exception {'
R5 = r'''    private Map<String, Map<String, String>> loadImages() {
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

''' + A5

for i, (a, r) in enumerate([(A1,R1),(A2,R2),(A3,R3),(A4,R4),(A5,R5)], 1):
    if src.count(a) != 1:
        sys.exit(f"✗ Anchor {i} khớp {src.count(a)} lần (cần 1). DỪNG, chưa ghi gì.")
    src = src.replace(a, r, 1)

shutil.copy2(p, p.with_suffix(".java.bak"))
p.write_text(src, encoding="utf-8")
print("✔ Xong. Backup: IngestionPipeline.java.bak")
