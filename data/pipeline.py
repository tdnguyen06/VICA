"""
VICA — Orchestrator + ghi output + TỰ KIỂM TRA (v5, Phase 0+1)

Output:
  [OUTPUT_DIR]/entities/*.md
  [OUTPUT_DIR]/_manifest.csv           (toàn bộ thực thể, kể cả stub)
  [OUTPUT_DIR]/_embed_manifest.csv     (CHỈ thực thể có nội dung — dùng cho pgvector)
  [OUTPUT_DIR]/_province_coverage.csv  (đếm theo 34 tỉnh hiện hành)
  [OUTPUT_DIR]/_id_migration.csv       (ID đổi do sửa parser đa tỉnh)
  [OUTPUT_DIR]/_aliases.csv
  [OUTPUT_DIR]/_labels.csv
  [OUTPUT_DIR]/_report.md
  [OUTPUT_DIR]/_assumptions.md
  [OUTPUT_DIR]/vocab.json
  [OUTPUT_DIR]/_alias_suggestions.csv  (chỉ khi --suggest-alias)

Chạy:
  python pipeline.py --per-source 5 --skip-content   # Phase 0: test tỉnh, nhanh
  python pipeline.py --per-source 5                  # thử nhỏ đủ nội dung
  python pipeline.py --sources dsvh_intangible,dsvh_special,dsvh_national,chinhphu_ethnic,dsvh_treasures
  python pipeline.py                                 # toàn bộ
  python pipeline.py --s3
"""

import argparse
import csv
import json
import re
import time
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import config as C
import labelling as L
import processing as P
import seed_sources as S

NULL = P.NULL_TEXT


# ============================================================
# FALLBACK CẤU HÌNH — chạy được khi config.py chưa patch
# ============================================================
PROVINCE_CURRENT_ENUM = getattr(C, "PROVINCE_CURRENT_ENUM", [
    "Tỉnh Cao Bằng", "Tỉnh Điện Biên", "Tỉnh Hà Tĩnh", "Tỉnh Lai Châu",
    "Tỉnh Lạng Sơn", "Tỉnh Nghệ An", "Tỉnh Quảng Ninh", "Tỉnh Thanh Hóa",
    "Tỉnh Sơn La", "Thành phố Hà Nội", "Thành phố Huế",
    "Tỉnh Tuyên Quang", "Tỉnh Lào Cai", "Tỉnh Thái Nguyên", "Tỉnh Phú Thọ",
    "Tỉnh Bắc Ninh", "Tỉnh Hưng Yên", "Thành phố Hải Phòng", "Tỉnh Ninh Bình",
    "Tỉnh Quảng Trị", "Thành phố Đà Nẵng", "Tỉnh Quảng Ngãi", "Tỉnh Gia Lai",
    "Tỉnh Khánh Hòa", "Tỉnh Lâm Đồng", "Tỉnh Đắk Lắk", "Thành phố Hồ Chí Minh",
    "Tỉnh Đồng Nai", "Tỉnh Tây Ninh", "Thành phố Cần Thơ", "Tỉnh Vĩnh Long",
    "Tỉnh Đồng Tháp", "Tỉnh Cà Mau", "Tỉnh An Giang",
])
PROV_CSV = getattr(C, "LOCALITY_MAPPING_CSV", "") or "province_map.csv"
DIST_CSV = getattr(C, "DISTRICT_MAPPING_CSV", "district_map.csv")
RICH_WORDS = getattr(C, "CONTENT_TIER_RICH_WORDS", 200)
TARGET_COV = getattr(C, "TARGET_PER_PROVINCE", 100)
TARGET_RICH = getattr(C, "TARGET_RICH_PER_PROVINCE", 30)
COVERAGE_NOTES = getattr(C, "COVERAGE_NOTES", {
    "dsvh_national": (
        "Trang dsvh.gov.vn/danh-muc-di-tich-quoc-gia-1753 chỉ đăng 6 bản ghi "
        "(có dòng 'Tổng số | 06 di tích'). Con số 3.621 toàn quốc KHÔNG nằm trên "
        "trang này — phải đổi nguồn (Wikidata P1435 / danh sách theo tỉnh). "
        "Đây KHÔNG phải lỗi crawler."
    ),
})


# ============================================================
# PHASE 0: CHUẨN HOÁ TỈNH (tự chứa, không phụ thuộc processing.py)
# ============================================================
_PROV_PREFIX = getattr(P, "_PROV_PREFIX", re.compile(
    r"^(tỉnh|tình|thành phố|tp\.?|tx\.?|huyện|quận|xã|phường|thị xã)\s+", re.IGNORECASE))
_SUB_PREFIX = re.compile(r"^(tt|x|p|q|h|tx|tp)\.?\s+", re.IGNORECASE)

# Lưới an toàn: tách TRƯỚC mỗi 'Tỉnh '/'Thành phố ' không ở đầu chuỗi.
_PROV_BOUNDARY = re.compile(r"(?<!^)(?=\b(?:Tỉnh|Thành\s+phố|TP\.?)\s)", re.IGNORECASE)

_TONE_PAIRS = [
    ("òa", "oà"), ("óa", "oá"), ("ỏa", "oả"), ("õa", "oã"), ("ọa", "oạ"),
    ("òe", "oè"), ("óe", "oé"), ("ỏe", "oẻ"), ("õe", "oẽ"), ("ọe", "oẹ"),
    ("ùy", "uỳ"), ("úy", "uý"), ("ủy", "uỷ"), ("ũy", "uỹ"), ("ụy", "uỵ"),
]


def lp(raw):
    """Ô nhiều tỉnh -> list. Xử lý CẢ ô bị nghiền không dấu ngăn."""
    if not raw:
        return []
    out = []
    for chunk in re.split(r"[\n;]+", P.nfc(raw)):
        chunk = re.sub(r"\s+", " ", chunk).strip()
        if not chunk:
            continue
        pieces = [p.strip() for p in _PROV_BOUNDARY.split(chunk) if p.strip()]
        out.extend(pieces if len(pieces) > 1 else [chunk])
    seen, res = set(), []
    for p in out:
        k = p.lower()
        if k not in seen:
            seen.add(k)
            res.append(p)
    return res


def province_key(raw):
    s = P.nfc(raw).strip().lower()
    s = _PROV_PREFIX.sub("", s)
    s = _SUB_PREFIX.sub("", s)
    s = re.sub(r"\s*-\s*", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    for a, b in _TONE_PAIRS:
        s = s.replace(a, b)
    return s


def _ascii_key(raw):
    s = province_key(raw)
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()


def load_province_maps(prov_path, dist_path):
    out = {"prov": {}, "prov_ascii": {}, "dist": {}}
    if prov_path and Path(prov_path).exists():
        with open(prov_path, encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                old = P.nfc(row.get("old", "")).strip()
                cur = P.nfc(row.get("current", "")).strip()
                if old and cur:
                    out["prov"][province_key(old)] = cur
                    out["prov_ascii"][_ascii_key(old)] = cur
    if dist_path and Path(dist_path).exists():
        with open(dist_path, encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                d = P.nfc(row.get("district", "")).strip()
                cur = P.nfc(row.get("province_current", "")).strip()
                if d and cur:
                    out["dist"][province_key(d)] = cur
                    out["dist"][_ascii_key(d)] = cur
    return out


def map_province_current(raw, maps):
    """-> (tỉnh hiện hành đã khử trùng, phần chưa ánh xạ được)."""
    if not raw:
        return [], []
    if not maps.get("prov"):
        return [], lp(raw)
    hit, miss = [], []
    for part in lp(raw):
        new = maps["prov"].get(province_key(part)) or maps["prov_ascii"].get(_ascii_key(part))
        if not new:
            for sub in reversed(part.split(",")):
                new = (maps["dist"].get(province_key(sub))
                       or maps["dist"].get(_ascii_key(sub)))
                if new:
                    break
        if new:
            if new not in hit:
                hit.append(new)
        else:
            miss.append(part)
    return sorted(hit), miss


def content_tier(word_count):
    if word_count <= 0:
        return "stub"
    return "rich" if word_count >= RICH_WORDS else "thin"


# ============================================================
# BÁO CÁO
# ============================================================
class Report:
    def __init__(self):
        self.nulls = Counter()
        self.null_entities = {}
        self.enum_mismatch = []
        self.conflicts = []
        self.merge_notes = []
        self.ocr = []
        self.chunk_warns = []
        self.llm_rejected = []
        self.no_content = []
        self.content_review = []
        self.content_quarantine = []
        self.shared_page = []
        self.same_page_merges = []
        self.skipped_sections = []
        self.coverage = []
        self.locality_unmapped = []
        self.dedup_dropped = 0
        self.checks = []
        self.id_migration = []
        self.embed_count = 0
        self.tier_counts = Counter()
        self.prov_total = Counter()
        self.prov_rich = Counter()
        self.raw_mashed = []

    def null(self, eid, field):
        self.nulls[field] += 1
        self.null_entities.setdefault(field, []).append(eid)

    def check(self, name, ok, detail=""):
        self.checks.append((name, bool(ok), detail))


def write_text_lf(path: Path, text: str):
    """Luôn ghi LF — write_text mặc định của Windows đổi '\\n' thành '\\r\\n'."""
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


# ============================================================
# THU THẬP
# ============================================================
def _opt_collector(key, label, fname):
    """Collector mới chỉ được đăng ký nếu seed_sources.py đã có hàm đó."""
    fn = getattr(S, fname, None)
    return (key, label, fn) if callable(fn) else None


COLLECTORS = [
    ("dsvh_intangible", "DSVH phi vật thể quốc gia (dsvh)", S.get_dsvh_intangible_heritage),
    ("dsvh_special", "Di tích QG đặc biệt (dsvh)", S.get_dsvh_special_monuments),
    ("dsvh_national", "Di tích QG (dsvh)", S.get_dsvh_national_monuments),
    ("chinhphu_ethnic", "54 dân tộc (chinhphu.vn)", S.get_chinhphu_ethnic_groups),
    ("wiki_unesco", "Di sản thế giới (Wikipedia)", S.get_wiki_world_heritage),
    ("wiki_intangible", "DSVH phi vật thể (Wikipedia)", S.get_wiki_intangible),
    ("wiki_monument", "Di tích (Wikipedia)", S.get_wiki_monuments),
    ("wiki_cuisine", "Ẩm thực (Wikipedia)", S.get_wiki_cuisine),
    ("wiki_festival", "Lễ hội (Wikipedia)", S.get_wiki_festivals),
    ("wiki_ethnic", "Dân tộc (Wikipedia)", S.get_wiki_ethnic),
    ("wiki_craft", "Làng nghề (Wikipedia)", S.get_wiki_craft_villages),
    ("wiki_history", "Lịch sử (Wikipedia)", S.get_wiki_history),
]
for _c in (
    _opt_collector("dsvh_treasures", "Bảo vật quốc gia (dsvh)", "get_dsvh_national_treasures"),
    _opt_collector("dsvh_museums", "Bảo tàng (dsvh)", "get_dsvh_museums"),
    _opt_collector("wiki_monument_lists", "Danh sách di tích (Wikipedia)", "get_wiki_monument_lists"),
    _opt_collector("wiki_province_cats", "Văn hóa/Lịch sử/Ẩm thực theo tỉnh (Wiki)", "get_wiki_by_province_categories"),
    _opt_collector("wiki_district_heritage", "Di tích/Văn hóa từ bài tỉnh/huyện (Wiki)", "get_wiki_district_heritage"),
    _opt_collector("wikidata", "Văn hóa/Lịch sử/Ẩm thực (Wikidata)", "get_wikidata_cultural_by_province"),
):
    if _c:
        COLLECTORS.append(_c)


def collect_records(per_source=None, only=None, rep=None):
    out = []
    for key, label, fn in COLLECTORS:
        if only and key not in only:
            continue
        try:
            recs = fn()
        except Exception as e:
            print(f"  ! Lỗi {label}: {e}")
            continue
        fetched = len(recs)
        if per_source:
            recs = recs[:per_source]
        print(f"  + {label}: {len(recs)} record"
              + (f" (lấy được {fetched}, cắt còn {per_source})" if per_source else ""))
        out.extend(recs)
        exp = getattr(C, "COVERAGE_EXPECT", {}).get(key)
        if rep and exp:
            rep.coverage.append((label, key, fetched, exp, per_source))
    return out


def diverse_sample(entities, limit):
    if not limit or len(entities) <= limit:
        return entities
    buckets = defaultdict(list)
    for e in entities:
        buckets[e["source_categories"][0]].append(e)
    picked, keys, i = [], list(buckets), 0
    while len(picked) < limit and any(buckets.values()):
        k = keys[i % len(keys)]
        if buckets[k]:
            picked.append(buckets[k].pop(0))
        i += 1
    return picked

def coalesce_wiki_records(records: list[dict]) -> list[dict]:
    """
    Hợp nhất các record phi-chính-thức có cùng tiêu đề Wikipedia (hoặc cùng source_url)
    TRƯỚC build_entities để hợp nhất tập tỉnh đa trị và giữ hash entity_id ổn định.
    """
    officials, by_key, anon = [], {}, []
    for r in records:
        if r.get("official"):
            officials.append(r)
            continue
        wt = (r.get("wiki_titles") or [None])[0]
        k = ("wt", P.name_key(wt)) if wt else ("url", r.get("source_url") or P.name_key(r["name"]))
        if k not in by_key:
            by_key[k] = r
        else:
            acc = by_key[k]
            provs = lp(acc.get("province_raw")) + lp(r.get("province_raw"))
            uniq_provs = list(dict.fromkeys(provs))
            acc["province_raw"] = "\n".join(uniq_provs) if uniq_provs else None
            if r.get("loai_hinh_raw") and not acc.get("loai_hinh_raw"):
                acc["loai_hinh_raw"] = r["loai_hinh_raw"]
    return officials + list(by_key.values())


# ============================================================
# GHÉP NỘI DUNG
# ============================================================
_STOP = {"ở", "tại", "của", "và", "các", "những", "về", "cho", "the", "a", "an"}


def _seq(s, ignore=()):
    s = re.sub(r"[^\w\s]", " ", P.nfc(s).lower())
    return [t for t in s.split() if t and t not in _STOP and t not in ignore]


def _tokens(s, ignore=()):
    return set(_seq(s, ignore))


def _contiguous(small, large):
    n = len(small)
    return n > 0 and any(large[i:i + n] == small for i in range(len(large) - n + 1))


def match_score(a, b, ignore=()):
    sa, sb = _seq(a, ignore), _seq(b, ignore)
    A, B = set(sa), set(sb)
    if not A or not B:
        return 0.0
    if A == B:
        return 1.0
    inter = len(A & B)
    if not inter:
        return 0.0
    small, large = (sa, sb) if len(sa) <= len(sb) else (sb, sa)
    if len(small) >= C.CONTENT_CONTAINMENT_MIN_TOKENS and _contiguous(small, large):
        return C.CONTENT_CONTAINMENT_SCORE
    short = min(len(A), len(B))
    return round(0.5 * inter / short + 0.5 * inter / len(A | B), 3)


def _is_ethnic(ent):
    return any("dân tộc" in (c or "").lower() for c in ent.get("source_categories", []))


def best_score(ent, title):
    ign = {"người"} if _is_ethnic(ent) else set()
    sc = match_score(ent["official_name"], title, ign)
    for a in ent.get("alias_entries", [])[:8]:
        if _tokens(a["alias"], ign) and _tokens(a["alias"], ign) == _tokens(title, ign):
            sc = max(sc, 0.95)
    return sc


def _query_variants(name, cats=()):
    base = re.sub(r"\([^)]*\)", "", name).strip()
    v = [name, base,
         re.sub(r"\s+(ở|tại)\s+.+$", "", base),
         re.sub(r"^(Hát|Lễ hội|Hội|Dân ca|Nghệ thuật|Tín ngưỡng|Lễ|Khu|Quần thể)\s+", "", base)]
    if " - " in base:
        v.append(base.split(" - ")[0])
    if any("dân tộc" in (c or "").lower() for c in cats):
        v += [f"Người {base}", f"{base} (dân tộc)"]
    seen, out = set(), []
    for x in v:
        x = re.sub(r"\s+", " ", x).strip()
        if x and x.lower() not in seen:
            seen.add(x.lower())
            out.append(x)
    return out


def load_content_alias(path):
    if not path or not Path(path).exists():
        return {}
    m = {}
    with open(path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            k = P.name_key(row.get("official_name", ""))
            v = (row.get("wiki_title") or "").strip()
            if k and v:
                m[k] = v
    return m


def locality_terms(ent):
    terms = []
    for part in lp(ent.get("province_decision")):
        for sub in part.split(","):
            t = _PROV_PREFIX.sub("", sub.strip().lower()).strip()
            t = _SUB_PREFIX.sub("", t)
            if len(t) >= 3:
                terms.append(t)
    return terms


def verify_page(ent, got):
    lead = P.nfc((got.get("summary") or "") + " "
                 + (got.get("content") or "")[:C.VERIFY_LEAD_CHARS])
    low = lead.lower()
    for t in locality_terms(ent):
        if t in low:
            return True, f"địa danh «{t}» có trong đoạn mở đầu"
    ign = {"người"} if _is_ethnic(ent) else set()
    extra = _tokens(ent["official_name"], ign) - _tokens(got["title"], ign)
    if not extra:
        return True, "không có phần thừa"
    ratio = len(extra & _tokens(lead)) / len(extra)
    if ratio >= C.VERIFY_EXTRA_MIN_RATIO:
        return True, f"{ratio:.0%} phần thừa của tên có trong đoạn mở đầu"
    return False, (f"đoạn mở đầu trang không nhắc địa danh nào của thực thể và chỉ có "
                   f"{ratio:.0%} phần thừa của tên chính thức -> nghi trang sai chủ đề")


def resolve_content(ent, alias_map, rep):
    official = ent["official_name"]
    cands = []
    manual = alias_map.get(P.name_key(official))
    if manual:
        cands.append((manual, "ánh xạ thủ công (CONTENT_ALIAS_CSV)", 1.0))
    for t in ent.get("wiki_titles", []):
        cands.append((t, "tiêu đề Wikipedia đã gộp từ nguồn", 1.0))
    cands.append((official, "tên chính thức", None))
    for a in ent["alias_entries"][:6]:
        cands.append((a["alias"], f"alias:{a['alias_type']}", None))

    queries = _query_variants(official, ent.get("source_categories", []))
    if _is_ethnic(ent):
        for a in ent["alias_entries"]:
            if a["alias_type"] == "tên gọi khác":
                queries.append(f"Người {a['alias']}")
    for q in queries:
        for t in S.search_wikipedia_titles(q, 5):
            cands.append((t, f"srsearch «{q}»", None))
        for t in S.opensearch_titles(q, 5):
            cands.append((t, f"opensearch «{q}»", None))
        time.sleep(C.POLITENESS_DELAY)

    scored, seen = [], set()
    for title, method, forced in cands:
        k = P.name_key(title)
        if not k or k in seen:
            continue
        seen.add(k)
        scored.append((forced if forced is not None else best_score(ent, title),
                       title, method, forced))
    scored.sort(key=lambda x: -x[0])

    quarantined = set()
    for sc, title, method, forced in scored[:8]:
        if sc < C.CONTENT_MATCH_MIN:
            continue
        got = S.fetch_wikipedia_content(title)
        time.sleep(C.POLITENESS_DELAY)
        if not got:
            continue
        final = sc if (forced is not None or sc >= 1.0) else best_score(ent, got["title"])
        if final < C.CONTENT_MATCH_MIN:
            continue
        if forced is None and sc >= 1.0 and P.name_key(got["title"]) != P.name_key(title):
            rep.content_review.append(
                f"`{ent['entity_id']}` «{official}» → chuyển hướng Wikipedia "
                f"«{title}» ⇒ «{got['title']}» | điểm {final} | cách: {method}")
        if forced is None:
            lead_low = ((got.get("summary") or "") + " "
                        + (got.get("content") or "")[:C.VERIFY_LEAD_CHARS]).lower()
            reason = None
            if final < 1.0:
                ok, why = verify_page(ent, got)
                if not ok:
                    reason = why
            if reason is None and _is_ethnic(ent) and not (
                    "dân tộc" in lead_low and "việt nam" in lead_low):
                reason = ("thực thể thuộc nhóm dân tộc nhưng đoạn mở đầu trang không nhắc "
                          "đồng thời 'dân tộc' và 'Việt Nam' (nghi cùng tên với nhóm người ở nước khác)")
            if reason:
                if got["title"] not in quarantined:
                    quarantined.add(got["title"])
                    rep.content_quarantine.append(
                        (ent["entity_id"], official, got["title"], final, reason))
                continue
        if final < 1.0:
            rep.content_review.append(
                f"`{ent['entity_id']}` «{official}» ← «{got['title']}» "
                f"| điểm {final} | cách: {method}")
        return got, method, final
    return None, None, 0.0


def _accept_fetched_page(ent: dict, title: str, method: str, sc: float,
                         forced: float | None, got: dict,
                         quarantined: set, rep) -> tuple[bool, float]:
    official = ent["official_name"]
    final = sc if (forced is not None or sc >= 1.0) else best_score(ent, got["title"])
    if final < C.CONTENT_MATCH_MIN:
        return False, 0.0
    if forced is None and sc >= 1.0 and P.name_key(got["title"]) != P.name_key(title):
        rep.content_review.append(
            f"`{ent['entity_id']}` «{official}» → chuyển hướng Wikipedia "
            f"«{title}» ⇒ «{got['title']}» | điểm {final} | cách: {method}")
    if forced is None:
        lead_low = ((got.get("summary") or "") + " "
                    + (got.get("content") or "")[:C.VERIFY_LEAD_CHARS]).lower()
        reason = None
        if final < 1.0:
            ok, why = verify_page(ent, got)
            if not ok:
                reason = why
        if reason is None and _is_ethnic(ent) and not (
                "dân tộc" in lead_low and "việt nam" in lead_low):
            reason = ("thực thể thuộc nhóm dân tộc nhưng đoạn mở đầu trang không nhắc "
                      "đồng thời 'dân tộc' và 'Việt Nam' (nghi cùng tên với nhóm người ở nước khác)")
        if reason:
            if got["title"] not in quarantined:
                quarantined.add(got["title"])
                rep.content_quarantine.append(
                    (ent["entity_id"], official, got["title"], final, reason))
            return False, 0.0
    if final < 1.0:
        rep.content_review.append(
            f"`{ent['entity_id']}` «{official}» ← «{got['title']}» "
            f"| điểm {final} | cách: {method}")
    return True, final


def enrich_content(entities, rep):
    alias_map = load_content_alias(getattr(C, "CONTENT_ALIAS_CSV", ""))
    if alias_map:
        print(f"  Ánh xạ thủ công: {len(alias_map)} dòng")

    # PHA 1: Batch-fetch cho mọi thực thể đã biết tiêu đề / khớp trực tiếp (không tốn search)
    direct_cands: dict[str, list[tuple[str, str, float, float | None]]] = {}
    batch_titles: list[str] = []
    for ent in entities:
        eid = ent["entity_id"]
        cands = []
        manual = alias_map.get(P.name_key(ent["official_name"]))
        if manual:
            cands.append((manual, "ánh xạ thủ công (CONTENT_ALIAS_CSV)", 1.0, 1.0))
        for t in ent.get("wiki_titles", []):
            cands.append((t, "tiêu đề Wikipedia đã gộp từ nguồn", 1.0, 1.0))
        cands.append((ent["official_name"], "tên chính thức", 1.0, None))
        for a in ent.get("alias_entries", [])[:4]:
            cands.append((a["alias"], f"alias:{a['alias_type']}", 0.95, None))
        direct_cands[eid] = cands
        for t, *_ in cands:
            batch_titles.append(t)

    print(f"  [Pha 1] Batch fetch {len(set(batch_titles))} tiêu đề trực tiếp...")
    page_cache = S.fetch_wikipedia_batch(batch_titles)

    unresolved = []
    for ent in entities:
        eid = ent["entity_id"]
        quarantined = set()
        matched = False
        for title, method, sc, forced in direct_cands[eid]:
            got = page_cache.get(title)
            if not got:
                continue
            ok, final = _accept_fetched_page(ent, title, method, sc, forced, got, quarantined, rep)
            if ok:
                ent["content_match"] = {"method": method, "score": final, "page": got["title"]}
                ent["content_blocks"].append({
                    "source": f"Wikipedia tiếng Việt — {got['title']}",
                    "url": got["url"], "summary": got["summary"], "content": got["content"],
                    "lat": got["lat"], "lon": got["lon"],
                })
                matched = True
                break
        if not matched:
            unresolved.append(ent)

    print(f"  [Pha 1] Đã ghép: {len(entities) - len(unresolved)}/{len(entities)} | "
          f"Cần search fallback: {len(unresolved)}")

    # PHA 2: Chỉ search srsearch/opensearch cho các thực thể còn thiếu rồi batch-fetch ứng viên
    if not unresolved:
        return

    search_cands: dict[str, list[tuple[float, str, str]]] = {}
    to_fetch: list[str] = []
    for i, ent in enumerate(unresolved, 1):
        official = ent["official_name"]
        queries = _query_variants(official, ent.get("source_categories", []))
        if _is_ethnic(ent):
            for a in ent["alias_entries"]:
                if a["alias_type"] == "tên gọi khác":
                    queries.append(f"Người {a['alias']}")
        cands, seen = [], set()
        for q in queries:
            for t in S.search_wikipedia_titles(q, 5):
                k = P.name_key(t)
                if k and k not in seen:
                    seen.add(k)
                    sc = best_score(ent, t)
                    if sc >= C.CONTENT_MATCH_MIN:
                        cands.append((sc, t, f"srsearch «{q}»"))
            for t in S.opensearch_titles(q, 5):
                k = P.name_key(t)
                if k and k not in seen:
                    seen.add(k)
                    sc = best_score(ent, t)
                    if sc >= C.CONTENT_MATCH_MIN:
                        cands.append((sc, t, f"opensearch «{q}»"))
            time.sleep(0.15)
        cands.sort(key=lambda x: -x[0])
        top = cands[:6]
        search_cands[ent["entity_id"]] = top
        for _, t, _ in top:
            if t not in page_cache:
                to_fetch.append(t)
        if i % 50 == 0 or i == len(unresolved):
            print(f"  [Pha 2 search] {i}/{len(unresolved)}")

    if to_fetch:
        page_cache.update(S.fetch_wikipedia_batch(to_fetch))

    for ent in unresolved:
        eid = ent["entity_id"]
        quarantined = set()
        matched = False
        for sc, title, method in search_cands.get(eid, []):
            got = page_cache.get(title)
            if not got:
                continue
            ok, final = _accept_fetched_page(ent, title, method, sc, None, got, quarantined, rep)
            if ok:
                ent["content_match"] = {"method": method, "score": final, "page": got["title"]}
                ent["content_blocks"].append({
                    "source": f"Wikipedia tiếng Việt — {got['title']}",
                    "url": got["url"], "summary": got["summary"], "content": got["content"],
                    "lat": got["lat"], "lon": got["lon"],
                })
                matched = True
                break
        if not matched:
            ent["content_match"] = {"method": None, "score": 0.0, "page": None}
            rep.no_content.append(eid)

def merge_same_page(entities, rep):
    by_page = defaultdict(list)
    for e in entities:
        pg = (e.get("content_match") or {}).get("page")
        if pg:
            by_page[P.name_key(pg)].append(e)
    drop = set()
    for grp in by_page.values():
        if len(grp) < 2:
            continue
        officials = [e for e in grp if e["has_official"]]
        wikis = [e for e in grp if not e["has_official"]]
        if len(officials) > 1:
            rep.shared_page.append(
                (grp[0]["content_match"]["page"], [e["entity_id"] for e in grp]))
            continue
        anchor = officials[0] if officials else grp[0]
        for w in (wikis if officials else grp[1:]):
            known = {a["alias"].lower() for a in anchor["alias_entries"]}
            if (w["official_name"].lower() not in known
                    and P.name_key(w["official_name"]) != P.name_key(anchor["official_name"])):
                anchor["alias_entries"].append({
                    "alias": w["official_name"], "alias_type": "tên trên Wikipedia",
                    "source": w["sources"][0]["url"]})
            anchor["sources"] += [s for s in w["sources"] if s not in anchor["sources"]]
            for t in w.get("wiki_titles", []):
                if t not in anchor["wiki_titles"]:
                    anchor["wiki_titles"].append(t)
            drop.add(w["entity_id"])
            rep.same_page_merges.append(
                f"Gộp «{w['official_name']}» (`{w['entity_id']}`) vào "
                f"«{anchor['official_name']}» (`{anchor['entity_id']}`): "
                f"cùng trang nội dung «{anchor['content_match']['page']}».")
    entities[:] = [e for e in entities if e["entity_id"] not in drop]
    rep.no_content = [i for i in rep.no_content if i not in drop]


def suggest_aliases(entities, outdir):
    rows, seen_pair = [], set()
    targets = [e for e in entities if not e.get("content_blocks")]
    for i, ent in enumerate(targets, 1):
        print(f"  [suggest {i}/{len(targets)}] {ent['official_name']}")
        seen = set()
        for q in _query_variants(ent["official_name"], ent.get("source_categories", [])):
            for t in S.search_wikipedia_titles(q, 5) + S.opensearch_titles(q, 5):
                k = P.name_key(t)
                if not k or k in seen:
                    continue
                seen.add(k)
                pair = (ent["official_name"], t)
                if pair in seen_pair:
                    continue
                seen_pair.add(pair)
                rows.append({"official_name": ent["official_name"], "wiki_title": t,
                             "score": best_score(ent, t), "query": q, "note": ""})
            time.sleep(C.POLITENESS_DELAY)
    rows.sort(key=lambda r: (r["official_name"], -r["score"]))
    path = outdir / "_alias_suggestions.csv"
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["official_name", "wiki_title", "score", "query", "note"])
        w.writeheader()
        w.writerows(rows)
    print(f"  ✔ {len(rows)} gợi ý → {path}")
    print("  Duyệt tay: giữ dòng đúng, xoá dòng sai, lưu thành content_alias.csv,")
    print("  rồi đặt CONTENT_ALIAS_CSV trong config.py.")


# ============================================================
# CHUẨN HOÁ
# ============================================================
def normalize_fields(entities, prov_maps, rep):
    for ent in entities:
        lh, bad = L.match_loai_hinh(ent.get("loai_hinh_raw"))
        ent["loai_hinh"] = lh
        if bad:
            rep.enum_mismatch.append((ent["entity_id"], bad))
        if not lh:
            rep.null(ent["entity_id"], "loại hình")

        ent["decision"] = P.parse_decision(ent.get("decision_raw"))
        if not ent["decision"]["normalized"]:
            rep.null(ent["entity_id"], "số quyết định")

        prov = ent.get("province_decision")
        ent["province_parts"] = lp(prov)
        if not prov:
            rep.null(ent["entity_id"], "địa phương theo quyết định")
        elif _MASHED.search(prov):
            rep.raw_mashed.append(ent["entity_id"])

        # Phase 0: tỉnh hiện hành. KHÔNG đụng province_decision -> giữ hash ID.
        cur_list, missing = map_province_current(prov, prov_maps)
        ent["province_current_parts"] = cur_list
        ent["province_current"] = C.MULTIVALUE_SEP.join(cur_list) if cur_list else None
        if missing:
            rep.locality_unmapped.append((ent["entity_id"], missing))
        if not cur_list:
            rep.null(ent["entity_id"], "địa phương hiện hành")

        if not ent.get("residence"):
            rep.null(ent["entity_id"], "địa bàn cư trú")

        domains, basis = L.map_domain(lh, ent["source_categories"])
        ent["domain"], ent["domain_basis"] = domains, basis
        if not domains:
            rep.null(ent["entity_id"], "domain")


# ============================================================
# MARKDOWN
# ============================================================
def _norm_ws(s):
    return re.sub(r"\s+", " ", P.nfc(s)).strip()


def _summary_is_duplicate(summary, content):
    s, c = _norm_ws(summary), _norm_ws(content)
    return not s or s[:120] in c[:800]


def _locality_for_context(ent):
    parts = ent.get("province_current_parts") or lp(ent.get("province_decision"))
    if not parts:
        return None
    mx = getattr(C, "CONTEXT_MAX_PROVINCES", 3)
    if len(parts) <= mx:
        return "; ".join(parts)
    return "; ".join(parts[:mx]) + f" +{len(parts) - mx} nơi khác"


def _context_line(ent, heading=None):
    parts = [ent["official_name"]]
    if ent.get("loai_hinh"):
        parts.append(ent["loai_hinh"])
    elif ent.get("domain"):
        parts.append("/".join(ent["domain"]))
    loc = _locality_for_context(ent)
    if loc:
        parts.append(loc)
    dec = (ent.get("decision") or {}).get("normalized")
    if dec:
        parts.append(f"QĐ {dec}")
    line = " | ".join(parts)
    if heading:
        line += f" › {heading}"
    return f"[{line}]"


def build_markdown(ent, info, era_topic):
    d = ent["decision"]
    loc_short = _locality_for_context(ent)
    eras = sorted({x["value"] for x in era_topic if x["kind"] == "era"})
    topics = sorted({x["value"] for x in era_topic if x["kind"] == "chủ đề"})
    card = [f"# {ent['official_name']}" + (f" ({loc_short})" if loc_short else ""), "",
            "## Thẻ thực thể"]

    def add(label, value):
        if value not in (None, "", [], ()):
            card.append(f"{label}: {value}")

    add("Mã thực thể", ent["entity_id"])
    add("Tên chính thức", ent["official_name"])
    add("Tên gọi khác (alias)", "; ".join(a["alias"] for a in ent["alias_entries"]))
    add("Loại hình", ent.get("loai_hinh"))
    add("Địa phương theo quyết định", "; ".join(ent.get("province_parts", [])))
    add("Địa phương hiện hành", ent.get("province_current"))
    add("Địa bàn cư trú (nguồn dân tộc, không phải theo quyết định)", ent.get("residence"))
    add("Văn bản pháp lý (nguyên văn)", (d["raw"] or "").replace("\n", " / "))
    add("Văn bản pháp lý (dạng chuẩn hoá)", "; ".join(d["all"]))
    add("Số văn bản", d["number"])
    add("Loại văn bản", d["doc_type"])
    add("Cơ quan ban hành", d["agency"])
    add("Ngày ban hành", d["date"])
    add("Năm ban hành", d["year"])
    add("Các biến thể số hiệu", "; ".join(d["variants"]))
    add("Lĩnh vực (domain)", "; ".join(ent["domain"]))
    add("Thời kỳ (era)", "; ".join(eras))
    add("Chủ đề", "; ".join(topics))

    card.append("Nguồn:")
    seen_src = set()
    for s in ent["sources"]:
        k = (s["label"], s["url"])
        if k not in seen_src:
            seen_src.add(k)
            card.append(f"- {'[chính thức] ' if s['official'] else ''}{s['label']} — {s['url']}")
    for b in ent["content_blocks"]:
        card.append(f"- [nội dung] {b['source']} — {b['url']}")

    md = list(card) + [""]
    official_tables = [t for t in ent["raw_tables"] if t.get("official")]
    if official_tables:
        md += ["## Dữ liệu bảng nguồn", _context_line(ent, "Dữ liệu bảng nguồn")]
        for t in official_tables:
            md.append(f"Nguồn bảng: {t['source']}")
            md += P.table_to_lines(t["fields"])
            md.append("")
    if ent.get("_conflict_notes"):
        md += ["## Ghi chú về nguồn", _context_line(ent, "Ghi chú về nguồn")]
        md += [f"- {n}" for n in ent["_conflict_notes"]] + [""]
    for b in ent["content_blocks"]:
        if b.get("lat") and b.get("lon"):
            md += ["## Toạ độ", _context_line(ent, "Toạ độ"),
                   f"Vĩ độ: {b['lat']}", f"Kinh độ: {b['lon']}", ""]
        if b.get("summary") and not _summary_is_duplicate(b["summary"], b["content"]):
            md += ["## Tóm tắt", _context_line(ent, "Tóm tắt"), b["summary"], ""]
    for c in info["chunks"]:
        md += [f"## {c['title']}", _context_line(ent, c["heading"]), c["text"], ""]
    return "\n".join(md)


# ============================================================
# PHÂN BỐ TỈNH + TẬP EMBED  (MODULE LEVEL — không lồng trong main)
# ============================================================
def province_coverage(rows):
    """Entity đa tỉnh tính cho MỖI tỉnh (đúng ngữ nghĩa coverage)."""
    total, rich = Counter(), Counter()
    for r in rows:
        provs = [p.strip() for p in (r["dia_phuong_hien_hanh"] or "").split(";") if p.strip()]
        for p in provs:
            total[p] += 1
            if r["content_tier"] == "rich":
                rich[p] += 1
    return total, rich


def write_province_outputs(rows, outdir, rep):
    total, rich = province_coverage(rows)
    rep.prov_total, rep.prov_rich = total, rich

    lines = ["province,entity_count,rich_count,dat_coverage,dat_usability"]
    for p in PROVINCE_CURRENT_ENUM:
        t, rc = total.get(p, 0), rich.get(p, 0)
        lines.append(f"{p},{t},{rc},{t >= TARGET_COV},{rc >= TARGET_RICH}")
    write_text_lf(outdir / "_province_coverage.csv", "\n".join(lines) + "\n")

    # CHỈ thực thể có nội dung mới được embed. Stub ở lại corpus để đếm/quiz/bản đồ.
    embed = [r for r in rows if r["embeddable"]]
    with open(outdir / "_embed_manifest.csv", "w", encoding="utf-8-sig", newline="") as f:
        if rows:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            if embed:
                w.writerows(embed)
    rep.embed_count = len(embed)
    rep.tier_counts = Counter(r["content_tier"] for r in rows)

    # ID sẽ đổi khi processing.py được patch parser đa tỉnh — không để mất dấu
    mig = []
    legacy_fn = getattr(P, "_legacy_locality_key", None)
    for r in rows:
        raw = r["dia_phuong_quyet_dinh"]
        if legacy_fn:
            old_key = legacy_fn(raw)
        else:
            parts = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"[\n;]+", raw or "")]
            keys = [_PROV_PREFIX.sub("", p.lower()).strip() for p in parts if p]
            old_key = "|".join(sorted(re.sub(r"\s+", " ", k) for k in keys))
        new_key = "|".join(sorted(province_key(p) for p in lp(raw)))
        if old_key and old_key != new_key:
            legacy = P.make_entity_id(P.name_key(r["official_name"]), old_key)
            if legacy != r["entity_id"]:
                mig.append({"legacy_id": legacy, "entity_id": r["entity_id"],
                            "official_name": r["official_name"]})
    if mig:
        with open(outdir / "_id_migration.csv", "w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=["legacy_id", "entity_id", "official_name"])
            w.writeheader()
            w.writerows(mig)
    rep.id_migration = mig


# ============================================================
# BÁO CÁO
# ============================================================
def render_report(rep, n):
    x = ["# _report.md — Báo cáo dữ liệu & khoảng trống", "",
         f"Tổng số thực thể: **{n}**", "",
         "## 0. ĐỘ PHỦ NGUỒN — đọc mục này trước", "",
         "| Nguồn | Lấy được (trước khi cắt mẫu) | Kỳ vọng | Thiếu | Chế độ |",
         "|---|---|---|---|---|"]
    capped = False
    for label, key, got, exp, cap in rep.coverage:
        mode = f"thử: cắt {cap}/nguồn" if cap else "đầy đủ"
        capped = capped or bool(cap)
        x.append(f"| {label} | {got} | {exp} | {max(0, exp - got)} | {mode} |")
    x += ["", "Kỳ vọng chỉ áp cho NGUỒN CHÍNH THỨC. Nguồn Wikipedia không bị chấm theo kỳ vọng này.",
          "Cột 'Lấy được' là số dòng crawl được TRƯỚC khi cắt mẫu."]
    for label, key, got, exp, cap in rep.coverage:
        note = COVERAGE_NOTES.get(key)
        if note:
            x += ["", f"> **{label}** — {note}"]
    x += ["", "Nguồn chính thức chưa lấy đủ ⇒ **không được coi là corpus hoàn chỉnh**."]
    if capped:
        x.append("Đang ở chế độ thử (`--per-source`): số thực thể trong output nhỏ hơn corpus thật.")

    x += ["", "## 0b. PHÂN BỐ THEO TỈNH HIỆN HÀNH (Phase 0)", "",
          f"Mục tiêu: ≥ {TARGET_COV} thực thể/tỉnh (coverage) và ≥ {TARGET_RICH} thực thể 'rich'/tỉnh (usability).",
          "",
          f"Tầng nội dung: rich **{rep.tier_counts.get('rich', 0)}** | "
          f"thin **{rep.tier_counts.get('thin', 0)}** | stub **{rep.tier_counts.get('stub', 0)}**. "
          f"Tập embed (`_embed_manifest.csv`): **{rep.embed_count}** thực thể (đã loại stub).", "",
          "| Tỉnh | Entity | Rich | Đạt coverage | Đạt usability |", "|---|---|---|---|---|"]
    for p in PROVINCE_CURRENT_ENUM:
        t, rc = rep.prov_total.get(p, 0), rep.prov_rich.get(p, 0)
        x.append(f"| {p} | {t} | {rc} | {'✅' if t >= TARGET_COV else '—'} | "
                 f"{'✅' if rc >= TARGET_RICH else '—'} |")
    ok_cov = sum(1 for p in PROVINCE_CURRENT_ENUM if rep.prov_total.get(p, 0) >= TARGET_COV)
    ok_use = sum(1 for p in PROVINCE_CURRENT_ENUM if rep.prov_rich.get(p, 0) >= TARGET_RICH)
    x += ["", f"**{ok_cov}/34** tỉnh đạt coverage; **{ok_use}/34** đạt usability.",
          "Chi tiết máy đọc được: `_province_coverage.csv`."]
    if rep.id_migration:
        x += ["", f"### ID sẽ đổi khi patch parser đa tỉnh ({len(rep.id_migration)})", "",
              "Xem `_id_migration.csv`. Nguyên nhân: hash cũ tính trên chuỗi tỉnh bị nghiền.", ""]
        for m in rep.id_migration[:20]:
            x.append(f"- «{m['official_name']}»: `{m['legacy_id']}` → `{m['entity_id']}`")

    x += ["", "## 1. Trường thiếu (null)", "", "| Trường | Số thực thể thiếu |", "|---|---|"]
    for k, v in rep.nulls.most_common():
        x.append(f"| {k} | {v} |")
    x += ["", "### entity_id thiếu theo trường", ""]
    for k, ids in rep.null_entities.items():
        x.append(f"- **{k}** ({len(ids)}): {', '.join(ids[:40])}"
                 + (" …" if len(ids) > 40 else ""))

    x += ["", "## 2. Nội dung ghép KHÔNG khớp tuyệt đối — CẦN NGƯỜI KIỂM TRA", "",
          "Các dòng này đã vượt bước xác minh (đoạn mở đầu trang nhắc đúng địa danh/phần thừa của tên).", ""]
    x += ([f"- {r}" for r in rep.content_review] or ["- Không có."])

    x += ["", f"## 2b. CÁCH LY — trang ứng viên bị từ chối ({len(rep.content_quarantine)})", "",
          "Tên khớp một phần nhưng trang có vẻ sai chủ đề nên KHÔNG ghép (ưu tiên độ chính xác). "
          "Nếu trang đúng, ghi vào `content_alias.csv` để ghép thủ công.", ""]
    x += ([f"- `{e}` «{o}» ✗ «{t}» | điểm {s} | {why}"
           for e, o, t, s, why in rep.content_quarantine[:300]] or ["- Không có."])

    x += ["", f"## 3. Không ghép được nội dung ({len(rep.no_content)})", ""]
    x += ([f"- `{i}`" for i in rep.no_content[:300]] or ["- Không có."])
    x += ["", "Cách xử lý: chạy `--suggest-alias`, duyệt `_alias_suggestions.csv`, "
          "lưu thành `content_alias.csv`, đặt `CONTENT_ALIAS_CSV` trong config.py.",
          "", "## 4. Loại hình ngoài enum (đã null)", ""]
    x += ([f"- `{e}`: «{b}»" for e, b in rep.enum_mismatch] or ["- Không có."])

    x += ["", "## 5. Mâu thuẫn metadata (giữ cả hai, không sửa)", ""]
    x += ([f"- {i}" for i in rep.conflicts] or ["- Không phát hiện."])

    x += ["", "## 6. Gộp / không gộp thực thể", ""]
    x += ([f"- {i}" for i in rep.merge_notes[:300]] or ["- Không có."])
    x += ["", f"### 6b. Gộp thực thể trùng trang nội dung ({len(rep.same_page_merges)})", ""]
    x += ([f"- {i}" for i in rep.same_page_merges[:300]] or ["- Không có."])
    x += ["", f"### 6c. Nhiều thực thể CHÍNH THỨC dùng chung một trang ({len(rep.shared_page)}) — cần duyệt", ""]
    x += ([f"- «{pg}»: {', '.join(f'`{i}`' for i in ids)}" for pg, ids in rep.shared_page]
          or ["- Không có."])

    x += ["", "## 7. Địa phương chưa ánh xạ được sang hiện hành", ""]
    if rep.locality_unmapped:
        x.append(f"Số thực thể: **{len(rep.locality_unmapped)}**. Bảng ánh xạ: `{PROV_CSV}`.")
        x.append("Bổ sung vào `province_map.csv` (tỉnh cũ→mới) hoặc `district_map.csv` (huyện/xã→tỉnh mới).")
        for eid, parts in rep.locality_unmapped[:100]:
            x.append(f"- `{eid}`: {'; '.join(parts)}")
    else:
        x.append("- Không có.")
    if rep.raw_mashed:
        x += ["", f"### 7b. Ô tỉnh bị nghiền ở NGUỒN ({len(rep.raw_mashed)})", "",
              "Pipeline đã tách đúng bằng lưới an toàn regex, nhưng HTML nguồn vẫn dính. "
              "Sửa `_cells_text` trong seed_sources.py để khắc phục tận gốc.", ""]
        x += [f"- `{i}`" for i in rep.raw_mashed[:50]]

    x += ["", "## 8. Làm sạch", "",
          f"- Đoạn trùng đã loại: **{rep.dedup_dropped}**",
          f"- Cảnh báo cắt mục: **{len(rep.chunk_warns)}**",
          f"- Mục Wikipedia bị loại (tham khảo, liên kết ngoài...): **{len(rep.skipped_sections)}**", "",
          "### OCR đáng ngờ (GIỮ NGUYÊN, không tự sửa; viết tắt toàn chữ hoa đã được bỏ qua)", ""]
    x += ([f"- `{e}`: {', '.join(f)}" for e, f in rep.ocr] or ["- Không có."])
    x += ["", "### Mục bị loại (tên mục, số từ)", ""]
    x += ([f"- `{e}`: «{h}» ({n_} từ)" for e, h, n_ in rep.skipped_sections[:100]]
          or ["- Không có."])

    x += ["", "## 9. Dòng bảng bị loại khi parse (kiểm tra có mất bản ghi thật không)", ""]
    skipped = getattr(S, "SKIPPED_ROWS", [])
    if skipped:
        x.append(f"Tổng: **{len(skipped)}** dòng. 60 dòng đầu:")
        for url, why, cells in skipped[:60]:
            preview = " | ".join(c.replace("\n", " / ") for c in cells)[:220]
            x.append(f"- [{why}] {preview}  \n  nguồn: {url}")
    else:
        x.append("- Không có.")

    x += ["", "## 10. Lỗi tra cứu Wikipedia", ""]
    errs = getattr(S, "SEARCH_ERRORS", [])
    if errs:
        cnt = Counter(msg for _, msg in errs)
        x.append(f"Tổng: **{len(errs)}** lần. Phân bố:")
        for msg, c in cnt.most_common(20):
            x.append(f"- {c}× {msg}")
        x += ["", "30 truy vấn đầu bị lỗi:"]
        for q, msg in errs[:30]:
            x.append(f"- «{q}» — {msg}")
    else:
        x.append("- Không có.")

    x += ["", "## 11. Nhãn era/chủ đề bị loại (chỉ phát sinh khi bật LLM)", ""]
    if L.LAST_LLM_ERROR and C.USE_LLM_LABELS:
        x.append(f"Lỗi LLM gần nhất: {L.LAST_LLM_ERROR}")
    x += ([f"- {i}" for i in rep.llm_rejected[:200]] or ["- Không có."])

    x += ["", "## 12. TỰ KIỂM TRA", "", "| Kiểm tra | Kết quả | Chi tiết |", "|---|---|---|"]
    for name, ok, detail in rep.checks:
        x.append(f"| {name} | {'PASS' if ok else '**FAIL**'} | {detail} |")
    return "\n".join(x) + "\n"


def render_assumptions(era_vocab, topic_vocab, locked, vocab_source):
    a = ["# _assumptions.md — Giả định & quy tắc đã áp dụng", "",
         "## 1. Enum loại hình (khớp nguyên văn, ngoài enum → null)", ""]
    a += [f"- {i}" for i in C.LOAI_HINH_ENUM]
    a += ["", "Căn cứ: phân loại DSVH phi vật thể (7 loại) và di tích (4 loại) trong "
          "Luật Di sản văn hóa / quyết định công bố của Bộ VHTTDL.", "",
          "Bảng di tích của dsvh không có cột loại hình riêng (loại nằm trong tên viết tắt "
          "DTLS/KTNT/DTKC/DLTC). Không tách ⇒ loại hình = null.", "",
          "## 2. Bảng ánh xạ domain", "", "| Loại hình | domain |", "|---|---|"]
    for k, v in C.DOMAIN_BY_LOAI_HINH.items():
        a.append(f"| {k} | {'; '.join(v)} |")
    a += ["", "### Fallback khi loại hình = null: phân loại CỦA NGUỒN", "",
          "| Phân loại nguồn | domain |", "|---|---|"]
    for k, v in C.DOMAIN_BY_SOURCE_CATEGORY.items():
        a.append(f"| {k} | {'; '.join(v)} |")
    a += ["", "Cơ sở ghi ở cột `domain_basis` của _manifest.csv. Enum `ẩm thực` chỉ đến từ "
          "phân loại nguồn, vì enum loại hình chính thức không có loại ẩm thực.", "",
          "## 3. Địa phương (Phase 0)", "",
          f"- Bảng tỉnh cũ → hiện hành: `{PROV_CSV}`",
          f"- Bảng huyện/xã → tỉnh hiện hành: `{DIST_CSV}`",
          f"- Enum tỉnh hiện hành: **{len(PROVINCE_CURRENT_ENUM)}** đơn vị (28 tỉnh + 6 thành phố) "
          "sau sắp xếp 2025; cấp huyện đã bỏ.",
          "- Ô nhiều tỉnh tách theo ranh giới dòng/`;`, KÈM lưới an toàn regex tách trước "
          "mỗi 'Tỉnh '/'Thành phố ' khi HTML nguồn bị nghiền.",
          "- Chuẩn hoá khoá tra: bỏ tiền tố hành chính, gộp dấu gạch, chuẩn hoá vị trí dấu thanh "
          "('Hoà Bình' ≡ 'Hòa Bình'), fallback ASCII không dấu.",
          f"- Hiển thị ngăn bằng `{C.MULTIVALUE_SEP}`. Dòng ngữ cảnh chỉ hiện tối đa "
          f"{C.CONTEXT_MAX_PROVINCES} nơi, phần còn lại ghi `+N nơi khác`.",
          "- `Địa bàn cư trú` (nguồn dân tộc) là trường RIÊNG, không phải địa phương theo quyết định.",
          "- **`province_current` là cột MỚI, không thay `province_decision`** → hash entity_id giữ nguyên.",
          "", "## 4. Định danh & gộp", "",
          "- `entity_id = vica-<slug(tên)>-<sha1(tên|địa phương theo QĐ)[:10]>` (ổn định, tái tạo được).",
          f"- Slug cắt ở ranh giới từ, tối đa {C.SLUG_MAXLEN} ký tự — không cắt giữa con số.",
          "- Khoá gộp = (tên chuẩn hoá, địa phương theo quyết định). Trùng tên khác địa phương ⇒ KHÔNG gộp.",
          f"- Wikipedia gộp vào bản ghi chính thức khi khớp tên/alias, hoặc chứa chuỗi con "
          f"(≥ {C.SUBSTRING_MERGE_MIN_TOKENS} token, ứng viên DUY NHẤT, địa phương tương thích).",
          "- Thực thể chỉ-Wikipedia và thực thể chính thức cùng trỏ MỘT trang nội dung thì gộp. "
          "Nhiều thực thể chính thức dùng chung trang thì KHÔNG tự gộp (báo cáo 6c).",
          "- Nguồn dân tộc được index thêm biến thể `Người X` — chỉ để TÌM, không đổi tên.",
          "", "## 5. Ghép nội dung Wikipedia", "",
          "- Thứ tự: ánh xạ thủ công → tiêu đề Wikipedia đã gộp → tên chính thức → alias → tra cứu.",
          f"- Ngưỡng tương đồng tên: {C.CONTENT_MATCH_MIN}.",
          f"- Bao hàm: tên nhỏ phải là CỤM LIỀN KỀ (≥ {C.CONTENT_CONTAINMENT_MIN_TOKENS} token) "
          f"⇒ điểm {C.CONTENT_CONTAINMENT_SCORE}.",
          f"- Mọi ghép < 1.0 phải qua XÁC MINH: đoạn mở đầu nhắc địa danh hoặc "
          f"≥ {int(C.VERIFY_EXTRA_MIN_RATIO * 100)}% phần 'thừa' của tên. Không qua ⇒ CÁCH LY.",
          "- Thực thể dân tộc: đoạn mở đầu phải nhắc đồng thời 'dân tộc' và 'Việt Nam'.",
          "- Dưới ngưỡng ⇒ KHÔNG ghép, để null + báo cáo. Ưu tiên độ chính xác hơn độ phủ.",
          "", "## 6. Alias", "",
          "- Chỉ tên CÓ TRONG nguồn; ghi `alias_type` + `source` trong _aliases.csv.",
          "- `Tên gọi khác` → 'tên gọi khác'; `Các nhóm nhỏ` → 'nhóm nhỏ' (không phải đồng nghĩa).",
          "- Tên thực thể chỉ-Wikipedia được gộp vào → 'tên trên Wikipedia'.",
          "", "## 7. Làm sạch & chunk", "",
          "- UTF-8, NFC, ghi file bằng LF. Bỏ menu/footer/số trang/header lặp/HTML.",
          "- Tiêu đề `== X ==` thành TÊN MỤC. Chunk không vắt qua ranh giới mục.",
          f"- Mục bị loại: {', '.join(sorted(C.SKIP_HEADINGS))}.",
          "- OCR: chỉ PHÁT HIỆN, không tự sửa. Viết tắt toàn chữ hoa không coi là lỗi.",
          f"- Mục ≤ {C.MAX_SECTION_WORDS} từ (từ = token khoảng trắng/âm tiết).",
          "- Mỗi mục lặp dòng ngữ cảnh tất định, KHÔNG dùng LLM; trường thiếu thì BỎ HẲN.",
          "", "## 7b. Hai tầng thực thể (Phase 2)", "",
          f"- `rich` ≥ {RICH_WORDS} từ | `thin` 1–{RICH_WORDS - 1} từ | `stub` 0 từ.",
          "- **CHỈ `stub` bị loại khỏi `_embed_manifest.csv`.** Stub vẫn ở `_manifest.csv` "
          "để đếm coverage, hiện bản đồ, làm mồi quiz.",
          "- Lý do: embed stub tạo chunk rỗng → retrieval trả về không có nội dung → LLM bịa.",
          "", "## 8. Từ vựng era/chủ đề", "",
          f"- Trạng thái: {'ĐÃ KHOÁ' if locked else 'CHƯA KHOÁ'}",
          f"- Nguồn: {vocab_source}",
          f"- era ({len(era_vocab)}): {'; '.join(era_vocab) or 'chưa có'}",
          f"- chủ đề ({len(topic_vocab)}): {'; '.join(topic_vocab) or 'chưa có'}",
          "- Gán nhãn bằng LUẬT TƯỜNG MINH (`ERA_PATTERNS`/`TOPIC_PATTERNS`), không cần LLM.",
          f"- era: ≥ {C.LABEL_MIN_COUNT_ERA} lần khớp hoặc trong {C.LABEL_LEAD_CHARS} ký tự đầu; "
          f"chủ đề: ≥ {C.LABEL_MIN_COUNT_TOPIC} lần; tối đa {C.LABEL_MAX_PER_KIND} nhãn/loại.",
          "- Bằng chứng là câu nguyên văn; kiểm tra bằng phép chứa chuỗi con (_labels.csv).",
          f"- LLM bổ sung: {'BẬT' if C.USE_LLM_LABELS else 'tắt'} (`VICA_USE_LLM_LABELS=1`).",
          "", "## 9. Chưa làm (cố ý)", "",
          "- Chưa OCR thư viện Hán Nôm (ảnh scan chữ Hán/Nôm).",
          "- Chưa ingest fulltext tạp chí có bản quyền.",
          "- Không tự phát hiện mâu thuẫn ngữ nghĩa trong văn mô tả; chỉ so metadata giữa nguồn.",
          "- `district_map.csv` chưa đủ cho toàn bộ di tích cấp quốc gia (phần lớn chỉ có địa chỉ huyện/xã).",
          "- Chưa crawl di tích cấp TỈNH cho các tỉnh thưa (Điện Biên, Lai Châu, Cao Bằng...).",
          "- Chưa phân rã thực thể phức hợp (Hội An 63 mục → POI con).",
          "- Nội dung hiện chỉ từ Wikipedia; chưa có nguồn chuyên sâu hơn.",
          "- Phía Spring: chưa tách ingestion khỏi `@PostConstruct`, chưa filter theo `province_current`."]
    return "\n".join(a) + "\n"


def write_outputs(rows, alias_rows, label_rows, era_vocab, topic_vocab, locked, vocab_source,
                  rep, outdir, n):
    with open(outdir / "_manifest.csv", "w", encoding="utf-8-sig", newline="") as f:
        if rows:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
    with open(outdir / "_aliases.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["entity_id", "official_name", "alias",
                                          "alias_type", "source"])
        w.writeheader()
        w.writerows(alias_rows)
    with open(outdir / "_labels.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["entity_id", "kind", "value", "method", "count",
                                          "confidence", "evidence"])
        w.writeheader()
        w.writerows(label_rows)
    write_text_lf(outdir / C.VOCAB_FILE,
                  json.dumps({"era": era_vocab, "chu_de": topic_vocab,
                              "locked": locked, "source": vocab_source},
                             ensure_ascii=False, indent=2))
    write_text_lf(outdir / "_report.md", render_report(rep, n))
    write_text_lf(outdir / "_assumptions.md",
                  render_assumptions(era_vocab, topic_vocab, locked, vocab_source))


# ============================================================
# TỰ KIỂM TRA
# ============================================================
_MASHED = re.compile(r"[^\s;][ \t]+(Tỉnh|Thành phố)[ \t]+\w")
_CTX_NULL = re.compile(r"^\[[^\n]*Chưa có dữ liệu[^\n]*\]$", re.MULTILINE)


def self_check(entities, rows, alias_rows, md_map, rep, vocab_era, vocab_topic):
    ids = [e["entity_id"] for e in entities]
    rep.check("entity_id duy nhất", len(ids) == len(set(ids)), f"{len(ids)} id")
    rep.check("Mỗi thực thể 1 file", len(md_map) == len(entities),
              f"{len(md_map)}/{len(entities)}")
    rep.check("Số dòng _manifest = số file", len(rows) == len(md_map), f"{len(rows)} dòng")

    # ID phải tái tạo được theo ĐÚNG hàm mà build_entities đã dùng
    stable = all(
        e["entity_id"] == P.make_entity_id(P.name_key(e["official_name"]),
                                           P.locality_key(e.get("province_decision")))
        for e in entities)
    rep.check("entity_id tái tạo được (ổn định giữa các lần chạy)", stable, "")

    bad_ctx, bad_len, lost, null_ctx, head_leak, crlf = [], [], [], [], [], []
    for e in entities:
        md = md_map[e["entity_id"]]
        name = e["official_name"]
        for title, body in re.findall(r"^## (?!Thẻ thực thể)(.+?)$\n(.*?)(?=^## |\Z)",
                                      md, re.MULTILINE | re.DOTALL):
            if not body.lstrip().startswith("[" + name):
                bad_ctx.append(f"{e['entity_id']}::{title.strip()}")
        if _CTX_NULL.search(md):
            null_ctx.append(e["entity_id"])
        if "\r" in md:
            crlf.append(e["entity_id"])
        chunks = e.get("_chunks", [])
        for c in chunks:
            if P.word_count(c["text"]) > C.MAX_SECTION_WORDS:
                bad_len.append(e["entity_id"])
            if "==" in c["text"]:
                head_leak.append(e["entity_id"])
        orig = _norm_ws(" ".join(e.get("_kept_lines", [])))
        joined = _norm_ws(" ".join(c["text"] for c in chunks))
        if orig != joined or any(c["text"] not in md for c in chunks):
            lost.append(e["entity_id"])

    rep.check("Mọi mục có dòng ngữ cảnh của thực thể ở đầu", not bad_ctx, f"{len(bad_ctx)} mục thiếu")
    rep.check("Dòng ngữ cảnh không chứa 'Chưa có dữ liệu'", not null_ctx, f"{len(null_ctx)} thực thể")
    rep.check(f"Mọi mục ≤ {C.MAX_SECTION_WORDS} từ", not bad_len, f"{len(bad_len)} vượt")
    rep.check("Không mất văn bản khi chunk", not lost, f"{len(lost)} lệch")
    rep.check("Không còn tiêu đề '== X ==' lẫn trong nội dung", not head_leak, f"{len(head_leak)} thực thể")
    rep.check("File dùng LF (không có \\r)", not crlf, f"{len(crlf)} file")
    rep.check("Alias đều có nguồn", all(a["alias"] and a["source"] for a in alias_rows),
              f"{len(alias_rows)} alias")
    ws_bad = [a["alias"] for a in alias_rows if re.search(r"\s{2,}", a["alias"])]
    rep.check("Alias không có khoảng trắng lặp (sạch HTML)", not ws_bad, f"{len(ws_bad)} alias bẩn")

    # Phase 0: kiểm tra trên PARTS (đã tách), không trên raw — raw có thể vẫn dính ở nguồn
    mashed_parts = [e["entity_id"] for e in entities
                    if any(_MASHED.search(p) for p in e.get("province_parts", []))]
    rep.check("Ô nhiều tỉnh đã tách đúng (mỗi phần = 1 tỉnh)", not mashed_parts,
              f"{len(mashed_parts)} thực thể còn dính")
    wrong_cnt = [e["entity_id"] for e in entities
                 if len(e.get("province_parts", [])) != len(lp(e.get("province_decision")))]
    rep.check("Số địa phương đếm đúng", not wrong_cnt, f"{len(wrong_cnt)} sai")

    bad_prov = [p for e in entities for p in e.get("province_current_parts", [])
                if p not in PROVINCE_CURRENT_ENUM]
    rep.check("province_current ⊂ 34 tỉnh hiện hành", not bad_prov, f"{len(bad_prov)} giá trị lạ")
    have_dec = [e for e in entities if e.get("province_decision")]
    mapped   = [e for e in have_dec if e.get("province_current_parts")]
    rep.check("Ánh xạ tỉnh thành công (thực thể CÓ địa phương theo QĐ)",
              len(mapped) == len(have_dec),
              f"{len(mapped)}/{len(have_dec)} ánh xạ được")
    no_dec = [e for e in entities if not e.get("province_decision")]
    rep.check("Thực thể chỉ-Wikipedia chưa có tỉnh", True,
              f"{len(no_dec)}/{len(entities)} — gán ở Phase 2 (Wikidata P131)")

    # Phase 2: stub không được lọt vào tập embed
    stub_leak = [r["entity_id"] for r in rows if r["embeddable"] and r["word_count"] == 0]
    rep.check("Không có stub trong tập embed", not stub_leak, f"{len(stub_leak)} rò rỉ")
    tier_bad = [r["entity_id"] for r in rows
                if r["content_tier"] != content_tier(r["word_count"])]
    rep.check("content_tier khớp word_count", not tier_bad, f"{len(tier_bad)} lệch")

    rep.check("domain ⊂ enum",
              all(d in C.DOMAIN_ENUM for e in entities for d in e["domain"]), "")
    rep.check("loại hình ⊂ enum hoặc null",
              all(e["loai_hinh"] is None or e["loai_hinh"] in C.LOAI_HINH_ENUM
                  for e in entities), "")
    ev_ok = True
    for e in entities:
        hay = _norm_ws(" ".join(e.get("_kept_lines", [])))
        for x in e.get("_era_topic", []):
            if _norm_ws(x["evidence"]) not in hay:
                ev_ok = False
    rep.check("Bằng chứng era/chủ đề là nguyên văn", ev_ok, "")
    rep.check("Ngày chuẩn dd/mm/yyyy",
              all(e["decision"]["date"] is None or
                  re.fullmatch(r"\d{2}/\d{2}/\d{4}", e["decision"]["date"])
                  for e in entities), "")
    rep.check("Ghép nội dung đều ≥ ngưỡng",
              all(e["content_match"]["score"] == 0.0 or
                  e["content_match"]["score"] >= C.CONTENT_MATCH_MIN for e in entities), "")
    pages = Counter(P.name_key(e["content_match"]["page"]) for e in entities
                    if e["content_match"]["page"])
    dup_pages = [p for p, n_ in pages.items() if n_ > 1]
    rep.check("Không có hai thực thể dùng chung một trang nội dung", not dup_pages,
              f"{len(dup_pages)} trang dùng chung (xem báo cáo 6c)")
    era_set, topic_set = set(), set()
    for e in entities:
        for x in e.get("_era_topic", []):
            (era_set if x["kind"] == "era" else topic_set).add(x["value"])
    rep.check("Nhãn dùng đúng từ vựng đã khoá",
              era_set <= set(vocab_era) and topic_set <= set(vocab_topic),
              f"{len(era_set)} era, {len(topic_set)} chủ đề")


# ============================================================
# S3
# ============================================================
def sync_s3(outdir):
    import boto3
    bucket = C.S3_BUCKET
    if not bucket:
        print("✗ Chưa đặt AWS_S3_BUCKET — bỏ qua sync S3.")
        return
    if C.AWS_PROFILE and C.AWS_PROFILE != "default":
        client = boto3.Session(profile_name=C.AWS_PROFILE,
                               region_name=C.AWS_REGION).client("s3")
    else:
        client = boto3.client("s3", region_name=C.AWS_REGION)
    prefix = C.S3_PREFIX.strip("/")
    n = 0
    for p in sorted(outdir.rglob("*")):
        if not p.is_file():
            continue
        key = f"{prefix}/{p.relative_to(outdir).as_posix()}"
        ctype = ("text/markdown; charset=utf-8" if p.suffix == ".md"
                 else "text/csv; charset=utf-8" if p.suffix == ".csv"
                 else "application/json; charset=utf-8" if p.suffix == ".json"
                 else "application/octet-stream")
        client.put_object(Bucket=bucket, Key=key, Body=p.read_bytes(), ContentType=ctype)
        n += 1
    print(f"✔ Sync {n} file → s3://{bucket}/{prefix}/")


# ============================================================
# MAIN
# ============================================================
def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--pilot", action="store_true",
                    help="nhờ LLM ĐỀ XUẤT từ vựng -> vocab_proposal.json (không tự áp dụng)")
    ap.add_argument("--limit", type=int, default=None, help="số THỰC THỂ tối đa (mẫu đa dạng)")
    ap.add_argument("--per-source", type=int, default=None, help="cap record mỗi nguồn")
    ap.add_argument("--sources", type=str, default=None,
                    help="vd: dsvh_intangible,wiki_cuisine,chinhphu_ethnic")
    ap.add_argument("--suggest-alias", action="store_true",
                    help="sinh _alias_suggestions.csv cho thực thể chưa có nội dung")
    ap.add_argument("--skip-content", action="store_true",
                    help="BỎ bước ghép Wikipedia — chỉ test tỉnh/coverage cho nhanh")
    ap.add_argument("--s3", action="store_true", help="sync output lên S3")
    args = ap.parse_args(argv)

    outdir = Path(C.OUTPUT_DIR)
    (outdir / "entities").mkdir(parents=True, exist_ok=True)
    rep = Report()

    print("=" * 70)
    print(" VICA PIPELINE v5 — SEED → CLEAN → ENTITY → LABEL → OUTPUT")
    print(f" Output: {outdir.resolve()}")
    print("=" * 70)

    only = set(args.sources.split(",")) if args.sources else None

    print("\n[GĐ 1] Thu thập seed records...")
    records = collect_records(args.per_source, only, rep)
    print(f"  Tổng record: {len(records)}")
    for label, key, got, exp, _cap in rep.coverage:
        if got < exp:
            note = COVERAGE_NOTES.get(key)
            print(f"  ⚠ ĐỘ PHỦ {label}: crawl được {got}/{exp} (thiếu {exp - got})"
                  + ("  ← XEM GHI CHÚ Ở _report.md MỤC 0" if note else ""))
    if getattr(S, "SKIPPED_ROWS", []):
        print(f"  ⚠ {len(S.SKIPPED_ROWS)} dòng bảng bị loại — xem _report.md mục 9")

    print("\n[GĐ 2] Định danh + gộp...")
    if hasattr(S, "enrich_wiki_provinces"):
        S.enrich_wiki_provinces(records)
    
    records = coalesce_wiki_records(records)
    print(f"  Sau hợp nhất đa tỉnh nguồn Wiki/Wikidata: {len(records)} record")
    entities, notes = P.build_entities(records)
    rep.merge_notes = notes
    rep.conflicts = [n for n in notes if "Mâu thuẫn" in n]
    for e in entities:
        e["_conflict_notes"] = [n for n in notes if n.startswith(f"[{e['entity_id']}]")]
    print(f"  Sau gộp: {len(entities)}")

    entities = diverse_sample(entities, args.limit)
    if args.limit:
        print(f"  Lấy mẫu đa dạng: {len(entities)} thực thể")
    if not entities:
        print("Không có thực thể nào. Kiểm tra mạng / nguồn.")
        return

    print("\n[GĐ 3] Ghép nội dung...")
    if args.skip_content:
        print("  --skip-content: BỎ qua. Mọi thực thể sẽ là stub (không embed).")
        for e in entities:
            e["content_match"] = {"method": None, "score": 0.0, "page": None}
            rep.no_content.append(e["entity_id"])
    else:
        enrich_content(entities, rep)
        n_before = len(entities)
        merge_same_page(entities, rep)
        if len(entities) != n_before:
            print(f"  Gộp {n_before - len(entities)} thực thể trùng trang → còn {len(entities)}")
        if rep.content_quarantine:
            print(f"  ⚠ {len(rep.content_quarantine)} ghép bị CÁCH LY — xem _report.md mục 2b")
        if args.suggest_alias:
            print("\n[GĐ 3b] Sinh gợi ý ánh xạ...")
            suggest_aliases(entities, outdir)

    print("\n[GĐ 4] Chuẩn hoá trường (Phase 0: tỉnh hiện hành)...")
    prov_maps = load_province_maps(PROV_CSV, DIST_CSV)
    if not prov_maps["prov"]:
        print(f"  ⚠ Không đọc được {PROV_CSV} → province_current = null toàn corpus")
    else:
        print(f"  Bảng tỉnh: {len(prov_maps['prov'])} khoá | huyện/xã: {len(prov_maps['dist'])} khoá")
    normalize_fields(entities, prov_maps, rep)

    print("\n[GĐ 5] Làm sạch + chunk + nhãn...")
    era_vocab, topic_vocab = list(C.ERA_VOCAB), list(C.TOPIC_VOCAB)
    locked, vocab_source = True, "config (từ vựng đóng + luật tường minh)"
    print(f"  Từ vựng: {len(era_vocab)} era, {len(topic_vocab)} chủ đề (ĐÃ KHOÁ)")

    if args.pilot:
        docs = [b["content"] for e in entities for b in e["content_blocks"]]
        if not C.GEMINI_API_KEY:
            print("  ⚠ --pilot cần GEMINI_API_KEY; bỏ qua.")
        else:
            pe, pt = L.propose_vocab(docs[:C.PILOT_SIZE])
            if pe or pt:
                write_text_lf(outdir / "vocab_proposal.json",
                              json.dumps({"era": pe, "chu_de": pt}, ensure_ascii=False, indent=2))
                print(f"  Đề xuất {len(pe)} era + {len(pt)} chủ đề → vocab_proposal.json "
                      "(KHÔNG tự áp dụng)")
            else:
                print(f"  LLM không đề xuất được từ vựng ({L.LAST_LLM_ERROR}).")

    quar_by_eid = defaultdict(list)
    for eid, _o, title, _s, _why in rep.content_quarantine:
        quar_by_eid[eid].append(title)

    rows, alias_rows, label_rows, md_map = [], [], [], {}
    for e in entities:
        texts = []
        for b in e["content_blocks"]:
            cl = P.clean_text(b["content"])
            fl = P.flag_ocr(cl)
            if fl:
                rep.ocr.append((e["entity_id"], fl))
            b["content"] = cl
            texts.append(cl)

        info = P.build_chunks(texts)
        e["_chunks"], e["_kept_lines"] = info["chunks"], info["kept_lines"]
        rep.dedup_dropped += info["dedup_dropped"]
        rep.chunk_warns += [f"{e['entity_id']}: {w}" for w in info["warns"]]
        rep.skipped_sections += [(e["entity_id"], h, n_) for h, n_ in info["skipped"]]

        labels, rejected = L.extract_era_topic("\n".join(info["kept_lines"]),
                                               era_vocab, topic_vocab)
        e["_era_topic"] = labels
        rep.llm_rejected += [f"{e['entity_id']}: {r}" for r in rejected]
        for x in labels:
            label_rows.append({"entity_id": e["entity_id"], "kind": x["kind"],
                               "value": x["value"], "method": x.get("method", ""),
                               "count": x.get("count", 0), "confidence": x["confidence"],
                               "evidence": _norm_ws(x["evidence"])})

        md = build_markdown(e, info, labels)
        md_map[e["entity_id"]] = md
        write_text_lf(outdir / "entities" / f"{e['entity_id']}.md", md)

        for a in e["alias_entries"]:
            alias_rows.append({"entity_id": e["entity_id"],
                               "official_name": e["official_name"], **a})

        d, cm = e["decision"], e["content_match"]
        blk = next((b for b in e["content_blocks"] if b.get("lat") and b.get("lon")), {})
        wc = sum(P.word_count(c["text"]) for c in info["chunks"])
        tier = content_tier(wc)

        rows.append({
            "entity_id": e["entity_id"],
            "file": f"entities/{e['entity_id']}.md",
            "official_name": e["official_name"],
            "alias_count": len(e["alias_entries"]),
            "loai_hinh_raw": e.get("loai_hinh_raw") or "",
            "loai_hinh": e.get("loai_hinh") or "",
            "dia_phuong_quyet_dinh": "; ".join(e.get("province_parts", [])),
            "dia_phuong_quyet_dinh_count": len(e.get("province_parts", [])),
            "dia_phuong_hien_hanh": e.get("province_current") or "",
            "province_current_count": len(e.get("province_current_parts", [])),
            "dia_ban_cu_tru": e.get("residence") or "",
            "so_quyet_dinh_raw": (d["raw"] or "").replace("\n", " / "),
            "so_quyet_dinh_norm": d["normalized"] or "",
            "so_quyet_dinh_tat_ca": "; ".join(d["all"]),
            "so_van_ban": d["number"] or "",
            "loai_van_ban": d["doc_type"] or "",
            "co_quan_ban_hanh": d["agency"] or "",
            "ngay_ban_hanh": d["date"] or "",
            "nam_ban_hanh": d["year"] or "",
            "domain": "; ".join(e["domain"]),
            "domain_basis": e["domain_basis"],
            "era": "; ".join(sorted({x["value"] for x in labels if x["kind"] == "era"})),
            "chu_de": "; ".join(sorted({x["value"] for x in labels if x["kind"] == "chủ đề"})),
            "lat": blk.get("lat", ""),
            "lon": blk.get("lon", ""),
            "content_status": "ok" if e["content_blocks"] else "missing",
            "content_page": cm["page"] or "",
            "content_match_method": cm["method"] or "",
            "content_match_score": cm["score"],
            "content_quarantined": "; ".join(quar_by_eid.get(e["entity_id"], [])),
            "wiki_titles": "; ".join(e.get("wiki_titles", [])),
            "has_official_metadata": e["has_official"],
            "source_count": len(e["sources"]),
            "section_count": len(info["chunks"]),
            "word_count": wc,
            "content_tier": tier,
            "embeddable": tier != "stub",
            "has_conflict": bool(e.get("_conflict_notes")),
        })

    print("\n[GĐ 5b] Phân bố tỉnh + tập embed...")
    write_province_outputs(rows, outdir, rep)
    print(f"  rich {rep.tier_counts.get('rich', 0)} | thin {rep.tier_counts.get('thin', 0)} "
          f"| stub {rep.tier_counts.get('stub', 0)} → embed {rep.embed_count}")
    if rep.id_migration:
        print(f"  ⚠ {len(rep.id_migration)} entity_id sẽ đổi khi patch parser → _id_migration.csv")

    print("\n[GĐ 6] Tự kiểm tra...")
    self_check(entities, rows, alias_rows, md_map, rep, era_vocab, topic_vocab)
    for name, ok, detail in rep.checks:
        print(f"  {'PASS' if ok else 'FAIL'} — {name} {detail}")

    write_outputs(rows, alias_rows, label_rows, era_vocab, topic_vocab, locked, vocab_source,
                  rep, outdir, len(entities))

    ok_content = len(entities) - len(rep.no_content)
    print(f"\n✔ {len(md_map)} file + _manifest.csv + _embed_manifest.csv + "
          f"_province_coverage.csv + _aliases.csv + _labels.csv + _report.md + _assumptions.md")
    print(f"  Nội dung ghép được: {ok_content}/{len(entities)}")
    print(f"  Cần người kiểm tra: {len(rep.content_review)} ghép chưa tuyệt đối, "
          f"{len(rep.content_quarantine)} bị cách ly")
    print(f"  Nhãn: {len(label_rows)} dòng trong _labels.csv")

    ok_cov = sum(1 for p in PROVINCE_CURRENT_ENUM if rep.prov_total.get(p, 0) >= TARGET_COV)
    ok_use = sum(1 for p in PROVINCE_CURRENT_ENUM if rep.prov_rich.get(p, 0) >= TARGET_RICH)
    print(f"  Tỉnh đạt coverage: {ok_cov}/34 | đạt usability: {ok_use}/34")

    failed = [n for n, ok, _ in rep.checks if not ok]
    if failed:
        print(f"⚠ FAIL: {', '.join(failed)} — đọc _report.md trước khi ingest.")

    if args.s3:
        print()
        sync_s3(outdir)


if __name__ == "__main__":
    main()