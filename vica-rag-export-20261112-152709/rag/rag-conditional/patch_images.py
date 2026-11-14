#!/usr/bin/env python3
"""Patch RAG server để trả ảnh. Mặc định DRY-RUN. Thêm --apply để ghi thật."""
import re, sys, shutil, time
from pathlib import Path

ROOT = Path("src/main/java")
APPLY = "--apply" in sys.argv
BAK = Path(f".bak-images-{time.strftime('%Y%m%d-%H%M%S')}")
ok, fail = [], []

def find(name):
    h = list(ROOT.rglob(name))
    return h[0] if h else None

def save(p, text, is_new=False):
    if not APPLY:
        print(f"  [dry] {'TẠO' if is_new else 'SỬA'} {p}")
        return
    BAK.mkdir(exist_ok=True)
    if p.exists():
        shutil.copy2(p, BAK / p.name)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    print(f"  ✔ {'TẠO' if is_new else 'SỬA'} {p}")

any_java = next(ROOT.rglob("*.java"), None)
if not any_java:
    sys.exit("✗ Không thấy src/main/java — chạy sai thư mục?")
PKG = re.search(r"^\s*package\s+([\w.]+)\s*;", any_java.read_text(encoding="utf-8"), re.M).group(1)
DIR = any_java.parent
print(f"Package: {PKG}\nThư mục: {DIR}\n")

# ---------- FILE MỚI 1: RetrievalTrace ----------
save(DIR / "RetrievalTrace.java", f'''package {PKG};

import org.springframework.ai.document.Document;
import org.springframework.stereotype.Component;
import java.util.*;

/** Hứng metadata của chunk mà @Tool đã truy xuất (controller không thấy được). */
@Component
public class RetrievalTrace {{
    private static final ThreadLocal<List<Map<String, Object>>> TL =
            ThreadLocal.withInitial(ArrayList::new);

    public void add(List<Document> docs) {{
        if (docs == null) return;
        List<Map<String, Object>> cur = TL.get();
        for (Document d : docs) cur.add(new HashMap<>(d.getMetadata()));
    }}

    public List<Map<String, Object>> get() {{ return TL.get(); }}

    public void clear() {{ TL.remove(); }}
}}
''', True)

# ---------- FILE MỚI 2: SimpleCsv (khỏi sửa build.gradle) ----------
save(DIR / "SimpleCsv.java", f'''package {PKG};

import java.util.*;

/** Parser CSV tối thiểu, xử lý dấu phẩy trong ngoặc kép. Không cần thư viện ngoài. */
public final class SimpleCsv {{
    private SimpleCsv() {{}}

    public static List<String> line(String s) {{
        List<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean q = false;
        for (int i = 0; i < s.length(); i++) {{
            char c = s.charAt(i);
            if (c == '"') {{
                if (q && i + 1 < s.length() && s.charAt(i + 1) == '"') {{ cur.append('"'); i++; }}
                else q = !q;
            }} else if (c == ',' && !q) {{
                out.add(cur.toString()); cur.setLength(0);
            }} else cur.append(c);
        }}
        out.add(cur.toString());
        return out;
    }}

    public static List<Map<String, String>> read(java.io.InputStream in) throws Exception {{
        List<Map<String, String>> rows = new ArrayList<>();
        try (java.io.BufferedReader br = new java.io.BufferedReader(
                new java.io.InputStreamReader(in, java.nio.charset.StandardCharsets.UTF_8))) {{
            String first = br.readLine();
            if (first == null) return rows;
            if (first.startsWith("\\uFEFF")) first = first.substring(1);
            List<String> head = line(first);
            String ln;
            while ((ln = br.readLine()) != null) {{
                if (ln.isBlank()) continue;
                List<String> v = line(ln);
                Map<String, String> m = new HashMap<>();
                for (int i = 0; i < head.size() && i < v.size(); i++) m.put(head.get(i).trim(), v.get(i));
                rows.add(m);
            }}
        }}
        return rows;
    }}
}}
''', True)

# ---------- FILE MỚI 3: ImageStore ----------
save(DIR / "ImageStore.java", f'''package {PKG};

import jakarta.annotation.PostConstruct;
import org.slf4j.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.io.*;
import java.util.*;

/** Nạp _images.csv một lần lúc khởi động. Ảnh thiếu giấy phép bị loại. */
@Component
public class ImageStore {{
    private static final Logger log = LoggerFactory.getLogger(ImageStore.class);

    @Value("${{vica.images.path:/app/data/_images.csv}}")
    private String path;

    private Map<String, Map<String, String>> byEntity = Map.of();

    @PostConstruct
    void load() {{
        File f = new File(path);
        if (!f.exists()) {{
            log.warn("Không thấy {{}} — ảnh sẽ trống", path);
            return;
        }}
        Map<String, Map<String, String>> m = new HashMap<>();
        int skipped = 0;
        try (InputStream in = new FileInputStream(f)) {{
            for (Map<String, String> r : SimpleCsv.read(in)) {{
                String lic = r.getOrDefault("license", "");
                String url = r.getOrDefault("thumb_url", "");
                if (lic.isBlank() || url.isBlank()) {{ skipped++; continue; }}
                m.put(r.get("entity_id"), Map.of(
                        "image_url", url,
                        "image_license", lic,
                        "image_author", r.getOrDefault("author", ""),
                        "image_source", r.getOrDefault("source_page", "")));
            }}
        }} catch (Exception e) {{
            log.error("Lỗi đọc _images.csv", e);
            return;
        }}
        byEntity = m;
        log.info("Nạp {{}} ảnh có giấy phép hợp lệ (loại {{}} thiếu license/url)", m.size(), skipped);
    }}

    public Map<String, String> get(String entityId) {{
        return byEntity.getOrDefault(entityId, Map.of());
    }}

    public int size() {{ return byEntity.size(); }}
}}
''', True)

# ---------- PATCH 1: IngestionPipeline ----------
ing = find("IngestionPipeline.java")
if not ing:
    fail.append("Không thấy IngestionPipeline.java")
else:
    src = ing.read_text(encoding="utf-8")
    if "imageStore" in src:
        ok.append("IngestionPipeline đã patch từ trước — bỏ qua")
    else:
        m = re.search(r"(Map<String,\s*Object>\s+(\w+)\s*=\s*new\s+HashMap<>\(\);)", src)
        if not m:
            m = re.search(r"((?:Map<String,\s*Object>|var)\s+(\w+)\s*=\s*new\s+HashMap)", src)
        if not m:
            fail.append(f"{ing.name}: không dò được chỗ khai báo metadata. Gửi tôi file này.")
        else:
            decl, var = m.group(1), m.group(2)
            eid = None
            for pat in (r'%s\.put\(\s*"entity_id"\s*,\s*([\w.()]+)' % var,
                        r'String\s+(entityId|eid)\s*='):
                mm = re.search(pat, src)
                if mm:
                    eid = mm.group(1)
                    break
            if not eid:
                fail.append(f"{ing.name}: không dò được biến entity_id. Gửi tôi file này.")
            else:
                src = src.replace(decl, decl + f'''
        // --- VICA images: URL nằm ở METADATA, tuyệt đối không nối vào text ---
        meta_images_{var}: {{
            Map<String, String> im = imageStore.get({eid});
            if (im != null && !im.isEmpty()) {var}.putAll(im);
        }}''', 1)
                # inject bean
                src = re.sub(r"(public class IngestionPipeline\s*\{)",
                             r"\1\n    private final ImageStore imageStore;", src, count=1)
                cm = re.search(r"(public IngestionPipeline\s*\([^)]*)\)", src)
                if cm:
                    src = src.replace(cm.group(0), cm.group(1) + ", ImageStore imageStore)", 1)
                    body = re.search(r"public IngestionPipeline\s*\([^)]*\)\s*\{", src)
                    src = src[:body.end()] + "\n        this.imageStore = imageStore;" + src[body.end():]
                else:
                    src = re.sub(r"(private final ImageStore imageStore;)",
                                 r"@org.springframework.beans.factory.annotation.Autowired\n    \1", src, count=1)
                save(ing, src)
                ok.append(f"IngestionPipeline: metadata += ảnh (biến {var}, id {eid})")

# ---------- PATCH 2: mọi @Tool có similaritySearch ----------
tool_files = [p for p in ROOT.rglob("*.java")
              if "similaritySearch" in p.read_text(encoding="utf-8")
              and p.name not in ("RetrievalTrace.java", "ImageStore.java")]
if not tool_files:
    fail.append("Không thấy file nào gọi similaritySearch")
for p in tool_files:
    src = p.read_text(encoding="utf-8")
    if "retrievalTrace.add" in src:
        ok.append(f"{p.name} đã patch — bỏ qua")
        continue
    hits = list(re.finditer(r"List<Document>\s+(\w+)\s*=\s*[^;]*similaritySearch[^;]*;", src))
    if not hits:
        fail.append(f"{p.name}: không dò được 'List<Document> x = ...similaritySearch...;'")
        continue
    for h in reversed(hits):
        src = src[:h.end()] + f"\n        retrievalTrace.add({h.group(1)});" + src[h.end():]
    src = re.sub(r"(public class \w+\s*\{)",
                 r"\1\n    @org.springframework.beans.factory.annotation.Autowired\n"
                 r"    private RetrievalTrace retrievalTrace;", src, count=1)
    save(p, src)
    ok.append(f"{p.name}: {len(hits)} chỗ similaritySearch đã ghi trace")

# ---------- FILE MỚI 4: controller /v2 (delegate, không đụng bản cũ) ----------
ctrl = find("RagControllerQueryRouting.java")
if not ctrl:
    fail.append("Không thấy RagControllerQueryRouting.java")
else:
    csrc = ctrl.read_text(encoding="utf-8")
    m = re.search(r"public\s+String\s+(\w+)\s*\(\s*@RequestBody\s+([\w.<>,\s]+?)\s+(\w+)\s*\)", csrc)
    if not m:
        fail.append(f"{ctrl.name}: không dò được 'public String x(@RequestBody T y)'. Gửi tôi file này.")
    else:
        meth, typ, _ = m.group(1), m.group(2).strip(), m.group(3)
        save(DIR / "RagImageController.java", f'''package {PKG};

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import java.util.*;

/** Bản /v2 trả JSON kèm ảnh. Bản /routing cũ giữ nguyên text/plain. */
@RestController
public class RagImageController {{

    public record ImageRef(String entityId, String url, String license,
                           String author, String sourcePage) {{}}

    public record RagResponse(String answer, List<String> entities, List<ImageRef> images) {{}}

    private final {ctrl.stem} delegate;
    private final RetrievalTrace trace;

    public RagImageController({ctrl.stem} delegate, RetrievalTrace trace) {{
        this.delegate = delegate;
        this.trace = trace;
    }}

    @PostMapping(value = "/rag/query/routing/v2",
                 consumes = MediaType.APPLICATION_JSON_VALUE,
                 produces = MediaType.APPLICATION_JSON_VALUE)
    public RagResponse v2(@RequestBody {typ} req) {{
        trace.clear();
        try {{
            String answer = delegate.{meth}(req);
            LinkedHashMap<String, ImageRef> imgs = new LinkedHashMap<>();
            LinkedHashSet<String> eids = new LinkedHashSet<>();
            for (Map<String, Object> m : trace.get()) {{
                Object o = m.get("entity_id");
                if (o == null) continue;
                String eid = String.valueOf(o);
                eids.add(eid);
                String url = String.valueOf(m.getOrDefault("image_url", ""));
                if (url != null && !url.isBlank() && !"null".equals(url)) {{
                    imgs.putIfAbsent(eid, new ImageRef(eid, url,
                            String.valueOf(m.getOrDefault("image_license", "")),
                            String.valueOf(m.getOrDefault("image_author", "")),
                            String.valueOf(m.getOrDefault("image_source", ""))));
                }}
            }}
            return new RagResponse(answer, new ArrayList<>(eids), new ArrayList<>(imgs.values()));
        }} finally {{
            trace.clear();
        }}
    }}
}}
''', True)
        ok.append(f"RagImageController: delegate → {ctrl.stem}.{meth}({typ})")

print("\n" + "="*60)
for x in ok:   print("  ✔", x)
for x in fail: print("  ✗", x)
print("="*60)
if not APPLY:
    print("\nDRY-RUN — chưa ghi gì. Chạy lại với --apply để ghi thật.")
elif fail:
    print(f"\n⚠ Có {len(fail)} mục không patch được. Backup: {BAK}/")
else:
    print(f"\n✔ Xong. Backup: {BAK}/")
