"""
VICA — Xử lý dữ liệu theo spec A/B/C/D.
Không tóm tắt, không diễn giải. Chỉ làm sạch + tái cấu trúc.
"""
import csv
import hashlib
import re
import unicodedata

import config as C

NULL_TEXT = "Chưa có dữ liệu"


# ================= A. LÀM SẠCH =================

def nfc(s: str | None) -> str:
    return unicodedata.normalize("NFC", s or "")


def collapse_ws(s: str) -> str:
    s = re.sub(r"[^\S\n]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return "\n".join(ln.strip() for ln in s.split("\n")).strip()


_BOILERPLATE = re.compile(
    r"^\s*(trang chủ|giới thiệu|liên hệ|hòm thư|sơ đồ website|tìm kiếm|"
    r"previous|next|xem tất cả|tin tức - sự kiện|văn bản pháp luật|"
    r"ấn phẩm tài liệu|liên kết website|bỏ qua nội dung)\s*$",
    re.IGNORECASE | re.MULTILINE)
_PAGE_NUM = re.compile(r"^\s*(trang\s*)?\d{1,4}\s*$", re.IGNORECASE | re.MULTILINE)


def clean_text(raw: str) -> str:
    """UTF-8 + NFC, bỏ menu/footer/số trang/header lặp. Không sửa nội dung câu."""
    t = nfc(raw)
    t = re.sub(r"</?[A-Za-z!][^>\n]*>", "", t)   # chỉ thẻ HTML thật, không ăn xuyên dòng
    t = _BOILERPLATE.sub("", t)
    t = _PAGE_NUM.sub("", t)
    lines, prev = [], None
    for ln in t.split("\n"):
        if ln.strip() and ln.strip() == prev:
            continue
        lines.append(ln)
        prev = ln.strip()
    return collapse_ws("\n".join(lines))


def table_to_lines(fields: dict) -> list[str]:
    """spec A: bảng -> dòng 'cột: giá trị', KHÔNG mất ô nào."""
    out = []
    for k, v in fields.items():
        k = re.sub(r"\s+", " ", nfc(k)).strip()
        v = nfc(v).strip()
        if "\n" in v:
            parts = [p.strip() for p in v.split("\n") if p.strip()]
            out.append(f"{k}: {C.MULTIVALUE_SEP.join(parts) if parts else NULL_TEXT}")
            for i, p in enumerate(parts, 1):
                out.append(f"{k} [{i}]: {p}")
        else:
            out.append(f"{k}: {v if v else NULL_TEXT}")
    return out


_OCR_SUSPECT = [
    (re.compile(r"\b[bcdfghklmnpqrstvwxz]{6,}\b", re.IGNORECASE), "chuỗi phụ âm dài"),
    (re.compile(r"[A-Za-z]\d[A-Za-z]\d[A-Za-z]"), "ký tự/số xen kẽ"),
    (re.compile(r"\b\d{1,2}/\d{1,2}/\d{2}\b"), "năm 2 chữ số"),
]


def flag_ocr(text: str) -> list[str]:
    """Chỉ BÁO CÁO, không tự sửa (spec A)."""
    flags = []
    for rx, why in _OCR_SUSPECT:
        for m in rx.finditer(text):
            tok = m.group(0)
            if why == "chuỗi phụ âm dài" and tok.isupper():
                continue            # viết tắt cơ quan (BVHTTDL, CHXHCN) không phải lỗi OCR
            flags.append(f"{why}: «{tok}»")
    return sorted(set(flags))[:20]


def dedupe_paragraphs(paras: list[str], min_words: int = 8) -> tuple[list[str], int]:
    """Chỉ khử trùng các đoạn đủ dài; dòng ngắn lặp lại (mục danh sách) là hợp lệ."""
    seen, kept, dropped = set(), [], 0
    for p in paras:
        key = re.sub(r"\s+", " ", nfc(p)).strip().lower()
        if not key:
            continue
        if len(key.split()) >= min_words and key in seen:
            dropped += 1
            continue
        if len(key.split()) >= min_words:
            seen.add(key)
        kept.append(p)
    return kept, dropped


# ================= D. CHUẨN HOÁ TRƯỜNG =================

_DATE_RX = re.compile(r"(\d{1,2})\s*[/\-]\s*(\d{1,2})\s*[/\-]\s*(\d{4})")


def normalize_date(raw: str | None) -> str | None:
    if not raw:
        return None
    m = _DATE_RX.search(nfc(raw))
    if not m:
        return None
    d, mo, y = (int(x) for x in m.groups())
    if not (1 <= d <= 31 and 1 <= mo <= 12):
        return None
    return f"{d:02d}/{mo:02d}/{y:04d}"


_DEC_RX = re.compile(
    r"(\d+(?:\s*/\s*\d{2,4})?)\s*/\s*([A-Za-zĐđ]+)\s*[-–—]\s*"
    r"([A-Za-zĐđ0-9][A-Za-zĐđ0-9\-]*)")


def parse_decision(raw: str | None) -> dict:
    """
    Văn bản đầu tiên là văn bản CHÍNH (dùng cho dòng ngữ cảnh); mọi văn bản khác trong ô
    vẫn được giữ ở 'all' và 'variants'. Số dạng '05/2010/QĐ-UBND' được nhận đủ cả '05/2010'.
    """
    out = {"raw": nfc(raw).strip() if raw else None, "normalized": None,
           "number": None, "year": None, "agency": None, "doc_type": None,
           "date": None, "variants": [], "all": []}
    if not raw:
        return out
    s = nfc(raw)
    out["date"] = normalize_date(s)
    ms = list(_DEC_RX.finditer(s))
    if not ms:
        return out
    variants = set()
    for i, m in enumerate(ms):
        num, dtype, agency = (re.sub(r"\s+", "", m.group(1)), m.group(2), m.group(3))
        norm = f"{num}/{dtype}-{agency}"
        out["all"].append(norm)
        if i == 0:
            out["number"], out["doc_type"], out["agency"] = num, dtype, agency
            out["normalized"] = norm
            if out["date"]:
                out["year"] = out["date"][-4:]
        ascii_norm = (norm.replace("đ", "d").replace("Đ", "D")
                      .encode("ascii", "ignore").decode())
        variants |= {norm, norm.lower(), ascii_norm, ascii_norm.lower(),
                     f"{num}/{dtype.upper()}-{agency.upper()}"}
    out["variants"] = sorted(variants)
    return out


def load_locality_mapping(path: str) -> dict:
    if not path:
        return {}
    mapping = {}
    with open(path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            old = nfc(row.get("old", "")).strip()
            cur = nfc(row.get("current", "")).strip()
            if old and cur:
                mapping[locality_key(old)] = cur
    return mapping


_PROV_PREFIX = re.compile(
    r"^(tỉnh|thành phố|tp\.?|tx\.?|huyện|quận|xã|phường|thị xã)\s+", re.IGNORECASE)


def locality_parts(raw: str | None) -> list[str]:
    """Ô nhiều tỉnh -> list. FIX: trước đây bị nghiền thành 1 chuỗi."""
    if not raw:
        return []
    parts = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"[\n;]+", raw)]
    return [p for p in parts if p]


def locality_key(raw: str | None) -> str:
    """Khoá so khớp đa trị, bỏ tiền tố hành chính. Chỉ để nhóm, KHÔNG hiển thị."""
    keys = [_PROV_PREFIX.sub("", p.lower()).strip() for p in locality_parts(raw)]
    return "|".join(sorted(re.sub(r"\s+", " ", k) for k in keys))   # sort: không phụ thuộc thứ tự ô


def map_locality_current(raw: str | None, mapping: dict) -> tuple[str | None, list[str]]:
    """Trả về (chuỗi hiện hành, danh sách phần chưa映射 được)."""
    if not raw or not mapping:
        return None, locality_parts(raw)
    out, missing = [], []
    for p in locality_parts(raw):
        k = locality_key(p)
        if k in mapping:
            out.append(mapping[k])
        else:
            missing.append(p)
    return (C.MULTIVALUE_SEP.join(out) if out else None), missing


def name_key(raw: str) -> str:
    s = nfc(raw).strip().lower()
    s = re.sub(r"[–—−]", "-", s)
    s = re.sub(r"\s*-\s*", " - ", s)
    return re.sub(r"\s+", " ", s)


def to_slug(text: str) -> str:
    """FIX: cắt ở ranh giới từ, không cắt giữa con số ('1948-195')."""
    t = nfc(text).replace("đ", "d").replace("Đ", "D")
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    t = re.sub(r"[^\w\s-]", "", t).strip().lower()
    t = re.sub(r"[-\s]+", "-", t)
    maxlen = getattr(C, "SLUG_MAXLEN", 60)
    if len(t) > maxlen:
        cut = t[:maxlen]
        if "-" in cut:
            cut = cut.rsplit("-", 1)[0]
        t = cut
    return t.strip("-") or "entity"


def make_entity_id(nk: str, lk: str) -> str:
    h = hashlib.sha1(f"{nk}|{lk}".encode("utf-8")).hexdigest()[:10]
    return f"vica-{to_slug(nk)}-{h}"


# ================= B. ĐỊNH DANH + GỘP =================

def _is_ethnic(ent: dict) -> bool:
    return any("dân tộc" in (sc or "").lower() for sc in ent.get("source_categories", []))


def _compatible(cands: list[dict], r: dict) -> list[dict]:
    lk = locality_key(r.get("province_raw"))
    return [e for e in cands
            if not lk or lk == locality_key(e.get("province_decision"))]


def build_entities(records: list[dict]) -> tuple[list[dict], list[str]]:
    """
    - Nguồn chính thức làm mỏ neo: khoá = (tên, địa phương theo QĐ).
      Trùng tên KHÁC địa phương => KHÔNG gộp.
    - Wikipedia gộp vào mỏ neo khi: khớp tên/alias, HOẶC chứa chuỗi con (duy nhất).
    - Dân tộc: index thêm biến thể 'Người X' (chỉ để TRA CỨU, không đổi tên).
    """
    notes = []
    anchors: dict[tuple, dict] = {}
    wiki_only: list[dict] = []

    for r in records:
        if r.get("official"):
            key = (name_key(r["name"]), locality_key(r.get("province_raw")))
            if key in anchors:
                _merge_into(anchors[key], r, notes)
            else:
                anchors[key] = _new_entity(r)
        else:
            wiki_only.append(r)

    by_name: dict[str, list[dict]] = {}

    def index(ent: dict):
        keys = {name_key(ent["official_name"])}
        for a in ent["alias_entries"]:
            keys.add(name_key(a["alias"]))
        if _is_ethnic(ent):
            base = re.sub(r"\([^)]*\)", "", ent["official_name"]).strip()
            for k in list(keys) + [name_key(base)]:
                if k:
                    keys.add(name_key("Người " + k))
        for k in keys:
            if not k:
                continue
            lst = by_name.setdefault(k, [])
            if not any(e["entity_id"] == ent["entity_id"] for e in lst):
                lst.append(ent)

    for ent in list(anchors.values()):
        index(ent)

    min_tok = getattr(C, "SUBSTRING_MERGE_MIN_TOKENS", 2)
    for r in wiki_only:
        nk = name_key(r["name"])
        cands = _compatible(by_name.get(nk, []), r)
        how = "khớp tên/alias"
        if not cands:
            sub = []
            for ent in anchors.values():
                onk = name_key(ent["official_name"])
                if min(len(nk.split()), len(onk.split())) < min_tok:
                    continue
                if nk in onk or onk in nk:
                    sub.append(ent)
            cands = _compatible(sub, r)
            how = "khớp chứa chuỗi con"

        if len(cands) == 1:
            _merge_into(cands[0], r, notes)
            if how != "khớp tên/alias":
                notes.append(f"Gộp «{r['name']}» vào «{cands[0]['official_name']}» "
                             f"theo {how} (duy nhất, địa phương tương thích).")
            continue

        if len(cands) > 1:
            notes.append(f"Không gộp «{r['name']}»: khớp {len(cands)} thực thể "
                         f"cùng tên khác địa phương -> giữ riêng.")
        key = (nk, locality_key(r.get("province_raw")))
        if key in anchors:
            _merge_into(anchors[key], r, notes)
        else:
            ent = _new_entity(r)
            anchors[key] = ent
            index(ent)

    return list(anchors.values()), notes


def _source_bits(r: dict) -> dict:
    return {
        "sources": [{"label": r["source_label"], "url": r["source_url"],
                     "official": bool(r.get("official"))}],
        "source_categories": [r["source_category"]],
        "raw_tables": [{"source": r["source_label"], "fields": r["raw_fields"],
                        "official": bool(r.get("official"))}],
    }


def _new_entity(r: dict) -> dict:
    nk, lk = name_key(r["name"]), locality_key(r.get("province_raw"))
    bits = _source_bits(r)
    return {
        "entity_id": make_entity_id(nk, lk),
        "official_name": nfc(r["name"]).strip(),
        "loai_hinh_raw": r.get("loai_hinh_raw"),
        "province_decision": r.get("province_raw"),
        "residence": r.get("residence_raw"),
        "decision_raw": r.get("decision_raw"),
        "alias_entries": list(r.get("alias_entries", [])),
        # FIX: nhớ tiêu đề Wikipedia đã gộp -> dùng lại khi lấy nội dung, khớp 1.0
        "wiki_titles": [] if r.get("official") else [r["name"]],
        "has_official": bool(r.get("official")),
        "sources": bits["sources"],
        "source_categories": bits["source_categories"],
        "raw_tables": bits["raw_tables"],
        "content_blocks": [],
    }


def _merge_into(ent: dict, r: dict, notes: list[str]):
    """spec 2: metadata chính thức là chân lý. Mâu thuẫn -> ghi chú, KHÔNG sửa."""
    bits = _source_bits(r)
    ent["sources"] += bits["sources"]
    ent["raw_tables"] += bits["raw_tables"]
    for sc in bits["source_categories"]:
        if sc not in ent["source_categories"]:
            ent["source_categories"].append(sc)

    if not r.get("official") and r["name"] not in ent["wiki_titles"]:
        ent["wiki_titles"].append(r["name"])

    for fld, key in (("loai_hinh_raw", "loai_hinh_raw"),
                     ("province_decision", "province_raw"),
                     ("decision_raw", "decision_raw"),
                     ("residence", "residence_raw")):
        new, old = r.get(key), ent.get(fld)
        if new and not old:
            ent[fld] = new
        elif new and old and nfc(new).strip() != nfc(old).strip():
            notes.append(
                f"[{ent['entity_id']}] Mâu thuẫn trường «{fld}»: "
                f"«{old}» (nguồn: {ent['sources'][0]['label']}) vs "
                f"«{new}» (nguồn: {r['source_label']}). Giữ cả hai, không sửa.")

    known = {a["alias"].lower() for a in ent["alias_entries"]}
    for a in r.get("alias_entries", []):
        if a["alias"].lower() not in known:
            ent["alias_entries"].append(a)
            known.add(a["alias"].lower())
    ent["has_official"] = ent["has_official"] or bool(r.get("official"))


# ================= C. CHUNK + DÒNG NGỮ CẢNH =================

def locality_for_context(ent: dict) -> str | None:
    """Địa phương dùng trong dòng ngữ cảnh: hiện hành nếu có, không thì theo quyết định.
    (Bản cũ in 'Chưa có dữ liệu' dù thực thể có địa phương theo quyết định.)"""
    parts = locality_parts(ent.get("province_current") or ent.get("province_decision"))
    if not parts:
        return None
    mx = getattr(C, "CONTEXT_MAX_PROVINCES", 3)
    if len(parts) <= mx:
        return "; ".join(parts)
    return "; ".join(parts[:mx]) + f" +{len(parts) - mx} nơi khác"


def context_line(ent: dict, heading: str | None = None) -> str:
    """
    Dòng ngữ cảnh TẤT ĐỊNH ghép từ metadata, KHÔNG dùng LLM.
    Trường thiếu thì BỎ HẲN (không in 'Chưa có dữ liệu' vào chuỗi sẽ được embed).
    Có heading -> thêm ' › heading' để chunk biết nó thuộc mục nào của bài.
    """
    parts = [ent["official_name"]]
    if ent.get("loai_hinh"):
        parts.append(ent["loai_hinh"])
    elif ent.get("domain"):
        parts.append("/".join(ent["domain"]))
    loc = locality_for_context(ent)
    if loc:
        parts.append(loc)
    dec = (ent.get("decision") or {}).get("normalized")
    if dec:
        parts.append(f"QĐ {dec}")
    line = " | ".join(parts)
    if heading:
        line += f" › {heading}"
    return f"[{line}]"


def word_count(s: str) -> int:
    return len(s.split())


_HEAD_RX = re.compile(r"^(={2,6})\s*(.+?)\s*\1\s*$")
_SENT_SPLIT = re.compile(r"(?<=[.!?;])\s+")


def parse_sections(text: str) -> tuple[list[dict], list[tuple[str, int]]]:
    """
    Tách văn bản Wikipedia (explaintext) theo tiêu đề '== X =='.
    Mỗi dòng không rỗng là một đoạn. Mục không mang nội dung (SKIP_HEADINGS) bị loại,
    kể cả mục con của nó; trả về danh sách (tên mục, số từ) đã loại để báo cáo.
    """
    secs, skipped = [], []
    cur = {"heading": "Mở đầu", "level": 1, "paras": []}
    skip_level = None            # đang bỏ qua một mục ở cấp này

    def flush():
        if cur["paras"]:
            secs.append(cur)

    skipped_words = {}
    for ln in nfc(text).split("\n"):
        ln = ln.strip()
        if not ln:
            continue
        m = _HEAD_RX.match(ln)
        if m:
            level, head = len(m.group(1)), re.sub(r"\s+", " ", m.group(2)).strip()
            if skip_level is not None and level > skip_level:
                continue                      # mục con của mục bị loại
            skip_level = None
            if head.lower() in getattr(C, "SKIP_HEADINGS", set()):
                flush()
                cur = {"heading": head, "level": level, "paras": []}
                skip_level = level
                skipped_words.setdefault(head, 0)
                continue
            flush()
            cur = {"heading": head, "level": level, "paras": []}
            continue
        if skip_level is not None:
            key = cur["heading"]
            skipped_words[key] = skipped_words.get(key, 0) + word_count(ln)
            continue
        cur["paras"].append(ln)
    if skip_level is None:
        flush()
    skipped = [(h, n) for h, n in skipped_words.items()]
    return secs, skipped


def _pack(paras: list[str], max_words: int) -> tuple[list[str], list[str]]:
    """Gom đoạn thành chunk <= max_words. Đoạn dài thì tách theo câu; câu dài thì theo từ."""
    warns, pieces = [], []
    for p in paras:
        if word_count(p) <= max_words:
            pieces.append(p)
            continue
        buf = []
        for sent in _SENT_SPLIT.split(p):
            if word_count(sent) > max_words:
                if buf:
                    pieces.append(" ".join(buf))
                    buf = []
                words = sent.split()
                for i in range(0, len(words), max_words):
                    pieces.append(" ".join(words[i:i + max_words]))
                warns.append(f"Cắt cứng theo từ (câu > {max_words} từ), giữ nguyên nội dung.")
                continue
            if word_count(" ".join(buf + [sent])) > max_words:
                pieces.append(" ".join(buf))
                buf = [sent]
            else:
                buf.append(sent)
        if buf:
            pieces.append(" ".join(buf))

    chunks, buf = [], []
    for pc in pieces:
        if word_count("\n".join(buf + [pc])) <= max_words:
            buf.append(pc)
        else:
            if buf:
                chunks.append("\n".join(buf))
            buf = [pc]
    if buf:
        chunks.append("\n".join(buf))
    return chunks, warns


def build_chunks(texts: list[str]) -> dict:
    """
    texts: danh sách văn bản đã clean_text (mỗi nguồn nội dung một phần tử).
    Chunk KHÔNG BAO GIỜ vắt qua ranh giới mục. Tiêu đề '== X ==' trở thành tên mục,
    không còn nằm lẫn trong câu. Trả về:
      chunks: [{heading, title, text}], kept_lines (để kiểm tra không mất chữ),
      skipped: [(mục, số từ)], dedup_dropped, warns
    """
    max_w = C.MAX_SECTION_WORDS
    seen, dropped = set(), 0
    kept_lines, chunks, warns, skipped_all = [], [], [], []
    for t in texts:
        secs, skipped = parse_sections(t)
        skipped_all += skipped
        for sec in secs:
            lines = []
            for ln in sec["paras"]:
                key = re.sub(r"\s+", " ", ln).strip().lower()
                if len(key.split()) >= 8 and key in seen:
                    dropped += 1
                    continue
                if len(key.split()) >= 8:
                    seen.add(key)
                lines.append(ln)
            if not lines:
                continue
            kept_lines += lines
            parts, w = _pack(lines, max_w)
            warns += w
            n = len(parts)
            for i, body in enumerate(parts, 1):
                title = sec["heading"] if n == 1 else f"{sec['heading']} (phần {i}/{n})"
                chunks.append({"heading": sec["heading"], "title": title, "text": body})
    return {"chunks": chunks, "kept_lines": kept_lines, "skipped": skipped_all,
            "dedup_dropped": dropped, "warns": warns}