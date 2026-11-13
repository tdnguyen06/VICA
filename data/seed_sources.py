"""
VICA — Giai đoạn 1: thu thập seed records.

Nguồn chính thức (dsvh.gov.vn, chinhphu.vn) -> có metadata pháp lý.
Nguồn Wikipedia / Wikidata -> nội dung & độ phủ theo tỉnh, chỉ giữ văn hóa/lịch sử/ẩm thực.
"""
import copy
import csv
import re
import threading
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import quote, unquote

import requests
from bs4 import BeautifulSoup

import config as C
from processing import locality_parts, nfc

_s = requests.Session()
_s.headers.update(C.HEADERS)
_tls = threading.local()


def _ts() -> requests.Session:
    if not hasattr(_tls, "s"):
        s = requests.Session()
        s.headers.update(C.HEADERS)
        _tls.s = s
    return _tls.s

SKIPPED_ROWS: list[tuple] = []    # (url, lý do, các ô)
SEARCH_ERRORS: list[tuple] = []   # (query, lỗi)

_MARK = "\ue000"
_BLOCK_TAGS = ("br", "p", "div", "li")


# ============================================================
# HTTP + PARSE Ô BẢNG
# ============================================================

def _get(url: str, params: dict | None = None, timeout=None) -> requests.Response:
    to = timeout or C.REQUEST_TIMEOUT
    sess = _ts()
    for attempt in range(4):
        try:
            r = sess.get(url, params=params, timeout=to)
            if r.status_code == 429:
                wait = int(r.headers.get("Retry-After", 3 * (attempt + 1)))
                time.sleep(min(wait, 15))
                continue
            r.raise_for_status()
            return r
        except requests.RequestException:
            if attempt == 3:
                raise
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError("unreachable")


def _cells_text(tr) -> list[str]:
    """
    Giữ ranh giới đa trị trong 1 ô bằng deepcopy + _MARK, tuyệt đối không để rò _MARK.
    """
    out = []
    for td in tr.find_all(["td", "th"]):
        cell = copy.deepcopy(td)
        for tag in cell.find_all(_BLOCK_TAGS):
            try:
                if tag.name == "br":
                    tag.replace_with(_MARK)
                else:
                    tag.append(_MARK)
            except Exception:
                pass
        txt = unicodedata.normalize("NFC", cell.get_text(" ", strip=False))
        parts = [re.sub(r"\s+", " ", p.replace(_MARK, "")).strip()
                 for p in txt.split(_MARK)]
        parts = [p for p in parts if p]
        if not parts:
            clean = re.sub(r"\s+", " ", txt.replace(_MARK, "")).strip()
            parts = [clean] if clean else []
        out.append("\n".join(parts))
    return out


def _norm_header(h: str) -> str:
    return re.sub(r"\s+", " ", h.replace(_MARK, "")).strip()


def split_multivalue(v: str | None) -> list[str]:
    if not v:
        return []
    return locality_parts(v.replace(_MARK, ""))


_INSTITUTION = re.compile(
    r"^(bảo tàng|ban quản lý|ban quản trị|trung tâm|sở |viện |trường |công ty|ubnd)\b",
    re.IGNORECASE)


def province_only(v: str | None) -> str | None:
    parts = [p for p in split_multivalue(v) if not _INSTITUTION.match(p)]
    return C.MULTIVALUE_SEP.join(parts) if parts else None


def join_multivalue(v: str | None) -> str | None:
    parts = split_multivalue(v)
    return C.MULTIVALUE_SEP.join(parts) if parts else None


def _pick(fields: dict, *candidates: str) -> str | None:
    """Ưu tiên theo thứ tự candidates thay vì thứ tự cột trong dict."""
    for c in candidates:
        cl = c.lower()
        for k, v in fields.items():
            if v and cl in k.lower():
                clean = v.replace(_MARK, "").strip()
                if clean and clean not in {"-", "–", "—"}:
                    return clean
    return None


def _clean_single_line(s: str | None) -> str | None:
    if not s:
        return None
    clean = re.sub(r"\s+", " ", nfc(s.replace(_MARK, ""))).strip()
    return clean if clean and clean not in {"-", "–", "—"} else None


def _key(s: str | None) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", (s or "").replace(_MARK, ""))).strip().lower()


# ============================================================
# HELPER TỈNH (đọc từ province_map.csv để khớp chính xác 100%)
# ============================================================

_TONE_PAIRS = [
    ("òa", "oà"), ("óa", "oá"), ("ỏa", "oả"), ("õa", "oã"), ("ọa", "oạ"),
    ("òe", "oè"), ("óe", "oé"), ("ỏe", "oẻ"), ("õe", "oẽ"), ("ọe", "oẹ"),
    ("ùy", "uỳ"), ("úy", "uý"), ("ủy", "uỷ"), ("ũy", "uỹ"), ("ụy", "uỵ"),
]
_PROV_STRIP = re.compile(r"^(tỉnh|tình|thành phố|tp\.?|tx\.?|huyện|quận|xã|phường|thị xã)\s+", re.I)


def _prov_norm_key(s: str | None) -> str:
    t = nfc(s or "").strip().lower()
    t = _PROV_STRIP.sub("", t)
    t = re.sub(r"\s*-\s*", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    for a, b in _TONE_PAIRS:
        t = t.replace(a, b)
    return t


def _load_valid_province_lookup() -> dict[str, str]:
    """Trả về {normalized_old_or_current_key: canonical_province_for_raw}."""
    lookup = {}
    p = Path(getattr(C, "LOCALITY_MAPPING_CSV", "province_map.csv") or "province_map.csv")
    if p.exists():
        with open(p, encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                old = nfc(row.get("old", "")).strip()
                cur = nfc(row.get("current", "")).strip()
                if old and cur:
                    lookup[_prov_norm_key(old)] = old
                    lookup.setdefault(_prov_norm_key(cur), cur)
    for cur in getattr(C, "PROVINCE_CURRENT_ENUM", []):
        lookup.setdefault(_prov_norm_key(cur), cur)
    return lookup


# ============================================================
# NGUỒN 1: CỤC DI SẢN VĂN HÓA
# ============================================================

def _crawl_dsvh_tables(start_url: str, max_pages: int = 60,
                       extra_urls: list[str] | None = None) -> tuple[list[dict], list[str]]:
    seen_urls, queue, rows = set(), [start_url] + list(extra_urls or []), []

    while queue and len(seen_urls) < max_pages:
        url = queue.pop(0)
        if url in seen_urls:
            continue
        seen_urls.add(url)
        try:
            r = _get(url)
        except Exception as e:
            print(f"    ! dsvh fetch fail {url}: {e}")
            continue
        soup = BeautifulSoup(r.text, "html.parser")

        for table in soup.find_all("table"):
            trs = table.find_all("tr")
            if len(trs) < 2:
                continue
            headers = [_norm_header(h) for h in _cells_text(trs[0])]
            if len(headers) < 3:
                continue
            stt_idx = next((i for i, h in enumerate(headers)
                            if h.strip().upper() in {"STT", "TT", "SỐ TT"}), None)
            name_idx = next((i for i, h in enumerate(headers)
                             if "tên" in h.lower()), None)
            if name_idx is None:
                continue

            for tr in trs[1:]:
                cells = _cells_text(tr)
                if len(cells) < 3 or not any(cells):
                    continue
                if stt_idx is not None and stt_idx < len(cells):
                    stt = cells[stt_idx].strip().rstrip(".")
                    if not stt.isdigit():
                        SKIPPED_ROWS.append((url, f"STT không phải số: «{stt}»", cells))
                        continue
                nm = cells[name_idx].strip() if name_idx < len(cells) else ""
                if not nm or nm.lower() == headers[name_idx].lower():
                    SKIPPED_ROWS.append((url, "tên rỗng / lặp header", cells))
                    continue
                if nm.lower().startswith(("tổng số", "tổng cộng")):
                    SKIPPED_ROWS.append((url, "dòng tổng", cells))
                    continue
                fields = {headers[i] if i < len(headers) else f"Cột {i+1}": v
                          for i, v in enumerate(cells)}
                rows.append({"url": url, "fields": fields})

        for a in soup.find_all("a", href=True):
            txt = a.get_text(" ", strip=True).lower()
            href = a["href"]
            if href.startswith("/"):
                href = C.DSVH_BASE + href
            if not href.startswith(C.DSVH_BASE):
                continue
            if ("page=" in href.lower()
                    or txt in {"next", "sau", "trang sau", "›", "»", ">>"}):
                if href not in seen_urls:
                    queue.append(href)
        time.sleep(C.POLITENESS_DELAY)

    uniq, seen_key = [], set()
    for row in rows:
        f = row["fields"]
        k = (_key(_pick(f, "Tên")),
             _key(_pick(f, "Quyết định")),
             _key(_pick(f, "Tỉnh", "Thành phố", "Địa điểm")),
             _key(_pick(f, "Loại hình")))
        if k in seen_key:
            SKIPPED_ROWS.append((row["url"], "trùng khoá (tên+QĐ+địa phương+loại hình)",
                                 list(f.values())))
            continue
        seen_key.add(k)
        uniq.append(row)
    return uniq, sorted(seen_urls)


def get_dsvh_intangible_heritage() -> list[dict]:
    url = f"{C.DSVH_BASE}/danh-muc-di-san-van-hoa-phi-vat-the-quoc-gia-1789"
    src_cat = "Di sản văn hóa phi vật thể quốc gia"
    try:
        rows, urls = _crawl_dsvh_tables(url)
    except Exception as e:
        print(f"  ! Lỗi dsvh intangible: {e}")
        return []
    out = []
    for row in rows:
        f = row["fields"]
        name = _clean_single_line(_pick(f, "Tên di sản", "Tên"))
        if not name:
            continue
        out.append({
            "name": name,
            "official": True,
            "kind": "intangible",
            "source_label": "Cục Di sản văn hóa — Danh mục DSVH phi vật thể quốc gia",
            "source_url": row["url"],
            "source_category": src_cat,
            "loai_hinh_raw": _clean_single_line(_pick(f, "Loại hình")),
            "province_raw": join_multivalue(_pick(f, "Tỉnh", "Thành phố")),
            "residence_raw": None,
            "decision_raw": _pick(f, "Quyết định"),
            "aliases": [],
            "alias_entries": [],
            "raw_fields": f,
            "content": None,
        })
    print(f"    [dsvh] {len(out)} dòng từ {len(urls)} trang")
    return out


def _dsvh_monuments(url: str, src_cat: str) -> list[dict]:
    try:
        rows, urls = _crawl_dsvh_tables(url)
    except Exception as e:
        print(f"  ! Lỗi dsvh {src_cat}: {e}")
        return []
    out = []
    for row in rows:
        f = row["fields"]
        name = _clean_single_line(_pick(f, "Tên di tích", "Tên"))
        if not name:
            continue
        out.append({
            "name": name,
            "official": True,
            "kind": "monument",
            "source_label": f"Cục Di sản văn hóa — {src_cat}",
            "source_url": row["url"],
            "source_category": src_cat,
            "loai_hinh_raw": _clean_single_line(_pick(f, "Loại hình")),
            "province_raw": join_multivalue(_pick(f, "Địa điểm", "Tỉnh", "Thành phố")),
            "residence_raw": None,
            "decision_raw": _pick(f, "Quyết định"),
            "aliases": [],
            "alias_entries": [],
            "raw_fields": f,
            "content": None,
        })
    print(f"    [dsvh] {src_cat}: {len(out)} dòng từ {len(urls)} trang")
    return out


def get_dsvh_special_monuments() -> list[dict]:
    return _dsvh_monuments(
        f"{C.DSVH_BASE}/danh-muc-di-tich-quoc-gia-dac-biet-1752",
        "Di tích quốc gia đặc biệt")


def get_dsvh_national_monuments() -> list[dict]:
    return _dsvh_monuments(
        f"{C.DSVH_BASE}/danh-muc-di-tich-quoc-gia-1753",
        "Di tích quốc gia")


_NATIONAL_MUSEUM_PROVINCE = {
    "bảo tàng lịch sử quốc gia": "Thành phố Hà Nội",
    "bảo tàng mỹ thuật việt nam": "Thành phố Hà Nội",
    "bảo tàng hồ chí minh": "Thành phố Hà Nội",
    "bảo tàng lịch sử quân sự việt nam": "Thành phố Hà Nội",
    "bảo tàng phòng không - không quân": "Thành phố Hà Nội",
    "bảo tàng tăng thiết giáp": "Thành phố Hà Nội",
    "bảo tàng hậu cần": "Thành phố Hà Nội",
    "bảo tàng công an nhân dân": "Thành phố Hà Nội",
    "trung tâm lưu trữ quốc gia iii": "Thành phố Hà Nội",
    "cục lưu trữ văn phòng trung ương đảng": "Thành phố Hà Nội",
    "bảo tàng quân khu 7": "Thành phố Hồ Chí Minh",
    "bảo tàng hải quân": "Thành phố Hải Phòng",
}


def _province_from_holding(holding: str | None, prov_lookup: dict[str, str]) -> str | None:
    if not holding:
        return None
    h = re.sub(r"\s+", " ", holding).strip()
    h = re.sub(r"\b([BCDĐKNT])\s+(hùa|ền|ình|i tích|hành)\b", r"\1\2", h)
    h = re.sub(r"Đà Nẵ\s+ng", "Đà Nẵng", h)
    hl = h.lower()
    for inst, prov in _NATIONAL_MUSEUM_PROVINCE.items():
        if inst in hl:
            return prov
    # Tìm các đoạn sau dấu phẩy hoặc cụm "tỉnh X" / "thành phố X" / "Bảo tàng tỉnh X"
    for m in re.finditer(
        r"(?:tỉnh|thành\s+phố|tp\.?|bảo\s+tàng(?:\s+tổng\s+hợp)?(?:\s+tỉnh|\s+thành\s+phố)?)\s+([A-ZĐÀ-Ỹ][^,;()]+)",
        h, re.IGNORECASE,
    ):
        cand = m.group(1).strip(" .")
        k = _prov_norm_key(cand)
        if k in prov_lookup:
            return prov_lookup[k]
    # Kiểm tra các mẩu tách theo dấu phẩy từ cuối lên
    for part in reversed(h.split(",")):
        k = _prov_norm_key(part)
        if k in prov_lookup:
            return prov_lookup[k]
    return None


def get_dsvh_national_treasures() -> list[dict]:
    """Bảo vật quốc gia — trích xuất tỉnh từ 'Nơi lưu giữ' khi bảng không có cột Tỉnh."""
    url = getattr(C, "DSVH_TREASURES_URL", "")
    if not url:
        return []
    src_cat = "Bảo vật quốc gia"
    prov_lookup = _load_valid_province_lookup()
    try:
        rows, urls = _crawl_dsvh_tables(url)
    except Exception as e:
        print(f"  ! Lỗi dsvh treasures: {e}")
        return []
    out = []
    for row in rows:
        f = row["fields"]
        name = _clean_single_line(_pick(f, "Tên bảo vật", "Tên"))
        if not name:
            continue
        holding = _clean_single_line(_pick(f, "Nơi lưu giữ"))
        prov_raw = join_multivalue(_pick(f, "Địa điểm", "Tỉnh", "Thành phố"))
        if not prov_raw:
            prov_raw = _province_from_holding(holding, prov_lookup)
        out.append({
            "name": name, "official": True, "kind": "treasure",
            "source_label": "Cục Di sản văn hóa — Bảo vật quốc gia",
            "source_url": row["url"], "source_category": src_cat,
            "loai_hinh_raw": None,
            "province_raw": prov_raw,
            "residence_raw": holding,
            "decision_raw": _pick(f, "Quyết định"),
            "aliases": [], "alias_entries": [], "raw_fields": f, "content": None,
        })
    print(f"    [dsvh] bảo vật: {len(out)} dòng từ {len(urls)} trang")
    return out


def get_dsvh_museums() -> list[dict]:
    urls = list(getattr(C, "DSVH_MUSEUM_URLS", []))
    if not urls:
        return []
    out = []
    for url in urls:
        src_cat = "Bảo tàng"
        try:
            rows, _ = _crawl_dsvh_tables(url)
        except Exception as e:
            print(f"  ! Lỗi dsvh museum {url}: {e}")
            continue
        for row in rows:
            f = row["fields"]
            name = _clean_single_line(_pick(f, "Tên bảo tàng", "Tên"))
            if not name:
                continue
            out.append({
                "name": name, "official": True, "kind": "museum",
                "source_label": "Cục Di sản văn hóa — Bảo tàng",
                "source_url": row["url"], "source_category": src_cat,
                "loai_hinh_raw": None,
                "province_raw": join_multivalue(_pick(f, "Địa điểm", "Tỉnh", "Thành phố", "Địa chỉ")),
                "residence_raw": None,
                "decision_raw": _pick(f, "Quyết định"),
                "aliases": [], "alias_entries": [], "raw_fields": f, "content": None,
            })
    print(f"    [dsvh] bảo tàng: {len(out)} dòng")
    return out


# ============================================================
# NGUỒN 2: CỔNG TTĐT CHÍNH PHỦ — 54 dân tộc
# ============================================================

def _split_names(raw: str | None) -> list[str]:
    """Tách dấu phẩy ngoài ngoặc, xử lý ' hay ' và nội dung trong ngoặc đơn."""
    if not raw:
        return []
    s = raw.replace(_MARK, "")
    s = re.sub(
        r"\(([^)]+)\)",
        lambda m: "(" + m.group(1).replace(",", "\ue001").replace(";", "\ue002") + ")",
        s,
    )
    out = []
    for chunk in re.split(r"[,;\n]|\shay\s", s):
        chunk = chunk.replace("\ue001", ",").replace("\ue002", ";")
        chunk = re.sub(r"\s+", " ", chunk).strip()
        if not chunk or chunk in {"-", "–", "—"}:
            continue
        m = re.search(r"\(([^)]+)\)", chunk)
        base = re.sub(r"\([^)]*\)", "", chunk).strip()
        if base:
            out.append(base)
        if m:
            inner = re.sub(r"\s+", " ", m.group(1)).strip()
            if inner:
                out.append(inner)
    seen, res = set(), []
    for x in out:
        if x.lower() not in seen:
            seen.add(x.lower())
            res.append(x)
    return res


def get_chinhphu_ethnic_groups() -> list[dict]:
    url = C.CHINHPHU_ETHNIC_URL
    src_cat = "Các dân tộc Việt Nam"
    try:
        r = _get(url)
    except Exception as e:
        print(f"  ! Lỗi chinhphu ethnic: {e}")
        return []
    soup = BeautifulSoup(r.text, "html.parser")

    best_idx, best_rows, best_headers = None, [], None
    for table in soup.find_all("table"):
        trs = table.find_all("tr")
        if len(trs) < 10:
            continue
        headers = [_norm_header(h) for h in _cells_text(trs[0])]
        low = [h.lower() for h in headers]
        idx = {
            "tt":   next((i for i, h in enumerate(low) if h in {"tt", "stt"}), None),
            "name": next((i for i, h in enumerate(low) if h == "tên gọi"), None),
            "alt":  next((i for i, h in enumerate(low) if "tên gọi khác" in h), None),
            "sub":  next((i for i, h in enumerate(low) if "nhóm nhỏ" in h), None),
            "loc":  next((i for i, h in enumerate(low) if "địa bàn" in h), None),
        }
        if idx["tt"] is None or idx["name"] is None or idx["loc"] is None:
            continue
        need = max(i for i in idx.values() if i is not None)
        rows = []
        for tr in trs[1:]:
            c = _cells_text(tr)
            if len(c) <= need:
                continue
            if not c[idx["tt"]].strip().rstrip(".").isdigit():
                continue
            nm = re.sub(r"\s+", " ", c[idx["name"]]).strip()
            if not nm or nm.lower() == "tên gọi":
                continue
            rows.append(c)
        if len(rows) > len(best_rows):
            best_idx, best_rows, best_headers = idx, rows, headers

    if not best_rows:
        print("  ! chinhphu: không nhận diện được bảng dân tộc")
        return []

    idx, headers = best_idx, best_headers
    out, seen = [], set()
    for c in best_rows:
        name = re.sub(r"\s+", " ", c[idx["name"]]).strip()
        if name in seen:
            continue
        seen.add(name)

        fields = {headers[i] if i < len(headers) else f"Cột {i+1}": v
                  for i, v in enumerate(c)}

        alias_entries = []
        for key, kind in (("alt", "tên gọi khác"), ("sub", "nhóm nhỏ")):
            i = idx[key]
            if i is None or i >= len(c):
                continue
            for a in _split_names(c[i]):
                if a and a != name:
                    alias_entries.append({"alias": a, "alias_type": kind, "source": url})

        out.append({
            "name": name,
            "official": True,
            "kind": "ethnic",
            "source_label": "Cổng TTĐT Chính phủ — Danh sách các dân tộc Việt Nam",
            "source_url": url,
            "source_category": src_cat,
            "loai_hinh_raw": None,
            "province_raw": None,
            "residence_raw": _clean_single_line(c[idx["loc"]]),
            "decision_raw": None,
            "aliases": [e["alias"] for e in alias_entries],
            "alias_entries": alias_entries,
            "raw_fields": fields,
            "content": None,
        })
    print(f"    [chinhphu] {len(out)} dân tộc")
    return out


# ============================================================
# NGUỒN 3: WIKIPEDIA (Categories + Danh sách Di tích theo tỉnh)
# ============================================================

NOISE_PREFIXES = ("Danh sách", "Bản mẫu:", "Thể loại:", "Thành viên:", "Tập tin:",
                  "Wikipedia:", "Trợ giúp:", "Cổng thông tin:", "Chủ đề:")

_ADMIN_OR_NOISE_TITLE = re.compile(
    r"^(Xã|Phường|Thị trấn|Huyện|Quận|Thị xã|Tỉnh|Thành phố|"
    r"Trường |Bệnh viện |Sân bay |Cảng hàng không |Nhà ga |Ga |"
    r"Công ty |Tập đoàn |Ngân hàng |Câu lạc bộ |Đội tuyển |Giải |Mùa giải |"
    r"Bầu cử |Kỳ họp |Quốc lộ |Tỉnh lộ |Đường cao tốc |Cầu vượt )\b",
    re.IGNORECASE,
)

# P31 trên Wikidata CẦN LOẠI nếu lỡ nằm trong thể loại tỉnh (chỉ giữ văn hóa/lịch sử/ẩm thực)
_EXCLUDE_P31_QIDS = {
    "Q5",         # human (trừ khi thực sự là chuyên mục di tích, tránh lẫn tiểu sử)
    "Q3914",      # school
    "Q3918",      # university
    "Q16917",     # hospital
    "Q4830453",   # business
    "Q43229",     # organization
    "Q476028",    # football club
    "Q1248784",   # airport
    "Q55488",     # railway station
    "Q56061",     # administrative territorial entity
    "Q486972",    # human settlement
    "Q532",       # village
    "Q3957",      # town
    "Q515",       # city
    "Q34442",     # road
    "Q11442",     # bicycle / misc
    "Q16521",     # taxon
}


def _wiki_query(params: dict) -> dict:
    base = {"format": "json", "formatversion": "2", "action": "query"}
    base.update(params)
    return _ts().get(C.WIKI_API, params=base, timeout=C.REQUEST_TIMEOUT).json()


def _category_titles(category: str, depth: int = 0, seen_cats: set | None = None,
                     subcat_skip_rx: re.Pattern | None = None) -> list[str]:
    if seen_cats is None:
        seen_cats = set()
    if category in seen_cats:
        return []
    seen_cats.add(category)

    titles, subcats, cont = [], [], None
    while True:
        p = {"list": "categorymembers", "cmtitle": f"Thể loại:{category}",
             "cmlimit": "500", "cmtype": "page|subcat", "cmprop": "title"}
        if cont:
            p["cmcontinue"] = cont
        try:
            data = _wiki_query(p)
        except Exception:
            break
        for m in data.get("query", {}).get("categorymembers", []):
            t = m.get("title", "")
            if t.startswith("Thể loại:"):
                sc = t[len("Thể loại:"):]
                if not subcat_skip_rx or not subcat_skip_rx.search(sc):
                    subcats.append(sc)
            else:
                titles.append(t)
        cont = data.get("continue", {}).get("cmcontinue")
        if not cont:
            break
    if depth > 0:
        for sc in subcats:
            titles.extend(_category_titles(sc, depth - 1, seen_cats, subcat_skip_rx))
    return titles


def _clean_titles(titles: list[str], blacklist: tuple = ()) -> list[str]:
    seen, out = set(), []
    for t in titles:
        t = t.strip()
        if (not t or t in seen or t in blacklist
                or t.startswith(NOISE_PREFIXES)
                or _ADMIN_OR_NOISE_TITLE.match(t)):
            continue
        seen.add(t)
        out.append(t)
    return out


def _wiki_records(category: str, kind: str, depth: int = 0,
                  blacklist: tuple = (), keyword_filter: tuple = ()) -> list[dict]:
    try:
        titles = _clean_titles(_category_titles(category, depth), blacklist)
    except Exception as e:
        print(f"  ! Lỗi Wikipedia '{category}': {e}")
        return []
    if keyword_filter:
        titles = [t for t in titles if any(k in t.lower() for k in keyword_filter)]
    return [{
        "name": t,
        "official": False,
        "kind": kind,
        "source_label": f"Wikipedia tiếng Việt — Thể loại:{category}",
        "source_url": "https://vi.wikipedia.org/wiki/" + quote(t.replace(" ", "_"), safe=""),
        "source_category": category,
        "loai_hinh_raw": None,
        "province_raw": None,
        "residence_raw": None,
        "decision_raw": None,
        "aliases": [],
        "alias_entries": [],
        "wiki_titles": [t],
        "raw_fields": {"Thể loại nguồn": category, "Tiêu đề": t},
        "content": None,
    } for t in titles]


def get_wiki_intangible() -> list[dict]:
    return _wiki_records("Di sản văn hóa phi vật thể tại Việt Nam", "intangible", depth=1)


def get_wiki_world_heritage() -> list[dict]:
    return _wiki_records("Di sản thế giới tại Việt Nam", "unesco",
                         blacklist=("Con đường di sản miền Trung",))


def get_wiki_monuments() -> list[dict]:
    return _wiki_records("Di tích quốc gia đặc biệt", "monument",
                         blacklist=("Di tích quốc gia đặc biệt",
                                    "Di tích quốc gia đặc biệt (Việt Nam)",
                                    "Đình", "Chùa", "Đền", "Tháp"))


def get_wiki_cuisine() -> list[dict]:
    kw = ("phở", "bún", "bánh", "nem", "chả", "canh", "cơm", "gỏi", "xôi", "chè",
          "mì", "miến", "nộm", "lẩu", "cuốn", "ram", "giò", "cháo", "cao lầu",
          "hủ tiếu", "mắm", "rượu cần", "cà phê", "kho", "hấp", "nướng", "thắng cố", "mèn mén")
    return _wiki_records("Ẩm thực Việt Nam", "cuisine", depth=1, keyword_filter=kw)


def get_wiki_festivals() -> list[dict]:
    return _wiki_records("Lễ hội Việt Nam", "festival", depth=1,
                         blacklist=("Lễ hội Việt Nam", "VietPride",
                                    "Ngày Văn hóa Việt Nam",
                                    "Năm Du lịch quốc gia 2020",
                                    "Năm Du lịch quốc gia 2021"))


def get_wiki_ethnic() -> list[dict]:
    return _wiki_records("Các dân tộc Việt Nam", "ethnic",
                         blacklist=("Con Rồng cháu Tiên", "Các dân tộc tại Việt Nam",
                                    "Bảo tàng Dân tộc học Việt Nam",
                                    "Nguồn gốc người Việt Nam", "Thổ ty",
                                    "Phân biệt dân tộc ở Việt Nam",
                                    "Người Kinh (Trung Quốc)",
                                    "Người Thái (Trung Quốc)",
                                    "Người Nhật tại Việt Nam",
                                    "Người Nigeria tại Việt Nam"))


def get_wiki_craft_villages() -> list[dict]:
    return _wiki_records("Làng nghề Việt Nam", "craft", depth=1,
                         blacklist=("Làng nghề Việt Nam",
                                    "Hiệp hội Làng nghề Việt Nam",
                                    "Ngành mây tre đan Việt Nam"))


def get_wiki_history() -> list[dict]:
    return _wiki_records("Lịch sử Việt Nam", "history",
                         blacklist=("Lịch sử Việt Nam",))


_EXCLUDE_P31_QIDS = {
    "Q5", "Q3914", "Q3918", "Q16917", "Q4830453", "Q43229", "Q476028",
    "Q1248784", "Q55488", "Q56061", "Q486972", "Q532", "Q3957", "Q515",
    "Q34442", "Q16521", "Q27686", "Q11315", "Q11424", "Q5398426",
    "Q11032", "Q483110", "Q13406463",
}


def _filter_titles_by_wikidata_p31(titles: list[str]) -> set[str]:
    if not titles:
        return set()
    print(f"    [p31 filter] kiểm tra {len(titles)} tiêu đề Wikipedia...")
    title_to_qid: dict[str, str] = {}

    def _fetch_qids(chunk):
        try:
            data = _wiki_query({
                "prop": "pageprops", "ppprop": "wikibase_item",
                "redirects": "1", "titles": "|".join(chunk),
            })
        except Exception:
            return {}
        q = data.get("query", {})
        alias = {t: t for t in chunk}
        for n in q.get("normalized", []):
            alias[n["from"]] = n["to"]
        for rd in q.get("redirects", []):
            for k, v in list(alias.items()):
                if v == rd["from"]:
                    alias[k] = rd["to"]
        by_final = {}
        for p in q.get("pages", []):
            qid = (p.get("pageprops") or {}).get("wikibase_item")
            if qid:
                by_final[p["title"]] = qid
        return {orig: by_final[final] for orig, final in alias.items() if final in by_final}

    chunks = [titles[i:i + 50] for i in range(0, len(titles), 50)]
    with ThreadPoolExecutor(max_workers=2) as ex:
        for res in ex.map(_fetch_qids, chunks):
            title_to_qid.update(res)
            time.sleep(0.05)

    bad_qids: set[str] = set()
    qids = sorted(set(title_to_qid.values()))
    qchunks = [qids[i:i + 50] for i in range(0, len(qids), 50)]

    def _check_p31(chunk):
        bad = set()
        try:
            r = _get("https://www.wikidata.org/w/api.php", params={
                "action": "wbgetentities", "ids": "|".join(chunk),
                "props": "claims", "format": "json",
            }, timeout=C.REQUEST_TIMEOUT)
            ents = r.json().get("entities", {})
            for qid, ent in ents.items():
                p31s = ent.get("claims", {}).get("P31", [])
                vals = set()
                for c in p31s:
                    v = c.get("mainsnak", {}).get("datavalue", {}).get("value", {})
                    if isinstance(v, dict) and v.get("id"):
                        vals.add(v["id"])
                if vals & _EXCLUDE_P31_QIDS:
                    bad.add(qid)
        except Exception:
            pass
        return bad

    with ThreadPoolExecutor(max_workers=2) as ex:
        for res in ex.map(_check_p31, qchunks):
            bad_qids.update(res)
            time.sleep(0.05)

    kept = {t for t in titles if title_to_qid.get(t) not in bad_qids}
    print(f"    [p31 filter] giữ {len(kept)}/{len(titles)} tiêu đề hợp lệ")
    return kept

def _match_province_in_text(text: str, prov_lookup: dict[str, str]) -> str | None:
    """Tìm tên tỉnh hợp lệ dài nhất xuất hiện trong tiêu đề/ô địa điểm."""
    tl = " " + _prov_norm_key(text) + " "
    # Ưu tiên khớp tên dài trước (vd: "bà rịa vũng tàu" trước "vũng tàu")
    for k in sorted(prov_lookup, key=len, reverse=True):
        if len(k) < 4:
            continue
        if re.search(rf"(?<![a-zđà-ỹ]){re.escape(k)}(?![a-zđà-ỹ])", tl):
            return prov_lookup[k]
    return None


def get_wiki_monument_lists() -> list[dict]:
    if not getattr(C, "USE_WIKI_MONUMENT_LISTS", True):
        return []
    prov_lookup = _load_valid_province_lookup()
    list_pages: set[str] = set()

    # 1) Dùng allpages tìm mọi trang bắt đầu bằng tiền tố danh sách di tích (không bỏ sót)
    for pref in ("Danh sách di tích", "Danh sách di sản", "Danh sách chùa",
                 "Danh sách lễ hội", "Danh sách bảo tàng", "Danh sách làng nghề",
                 "Danh sách vườn quốc gia", "Di tích tại", "Di tích quốc gia", "Di tích lịch sử"):
        cont = None
        while True:
            p = {"list": "allpages", "apprefix": pref, "apnamespace": "0", "aplimit": "500"}
            if cont:
                p["apcontinue"] = cont
            try:
                d = _wiki_query(p)
                for x in d.get("query", {}).get("allpages", []):
                    t = x.get("title", "")
                    if t:
                        list_pages.add(t)
                cont = d.get("continue", {}).get("apcontinue")
                if not cont:
                    break
            except Exception:
                break

    # 2) Quét thêm thể loại danh sách di tích
    for cat in ("Danh sách di tích tại Việt Nam", "Di tích quốc gia Việt Nam",
                "Di tích lịch sử văn hóa Việt Nam"):
        for t in _category_titles(cat, depth=1):
            if any(kw in t.lower() for kw in ("danh sách", "di tích tại", "di tích quốc gia")):
                list_pages.add(t)

    print(f"    [wiki lists] quét {len(list_pages)} trang danh sách...")
    out, seen_key = [], set()
    for idx, page in enumerate(sorted(list_pages), 1):
        page_prov = _match_province_in_text(page, prov_lookup)
        try:
            r = _get(C.WIKI_API, params={
                "action": "parse", "page": page, "prop": "text",
                "format": "json", "formatversion": "2",
            })
            html = r.json().get("parse", {}).get("text", "")
        except Exception:
            continue
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")
        added_from_table = 0
        for table in soup.find_all("table", class_=lambda c: c and "wikitable" in c):
            trs = table.find_all("tr")
            if len(trs) < 3:
                continue
            headers = [_norm_header(h) for h in _cells_text(trs[0])]
            low = [h.lower() for h in headers]
            name_idx = next((i for i, h in enumerate(low)
                             if any(w in h for w in ("tên", "di tích", "di sản"))), None)
            if name_idx is None:
                continue
            loc_idx = next((i for i, h in enumerate(low)
                            if any(w in h for w in ("địa điểm", "vị trí", "địa chỉ", "tỉnh", "huyện", "xã"))), None)
            type_idx = next((i for i, h in enumerate(low) if "loại" in h), None)

            for tr in trs[1:]:
                tds = tr.find_all(["td", "th"])
                if len(tds) <= name_idx:
                    continue
                cells = _cells_text(tr)
                if len(cells) <= name_idx:
                    continue
                name = _clean_single_line(re.sub(r"\[\d+\]", "", cells[name_idx]))
                if not name or len(name) < 3 or name.lower() == headers[name_idx].lower():
                    continue
                if _ADMIN_OR_NOISE_TITLE.match(name):
                    continue

                wiki_title = None
                for a in tds[name_idx].find_all("a", href=True):
                    href = a["href"]
                    if href.startswith("/wiki/") and "redlink=1" not in href and ":" not in href[6:]:
                        wiki_title = unquote(href[6:]).replace("_", " ").strip()
                        break

                loc_cell = cells[loc_idx] if (loc_idx is not None and loc_idx < len(cells)) else ""
                row_prov = _match_province_in_text(loc_cell, prov_lookup) or page_prov
                if not row_prov:
                    continue

                k = (_key(name), _key(row_prov))
                if k in seen_key:
                    continue
                seen_key.add(k)
                added_from_table += 1

                fields = {headers[i] if i < len(headers) else f"Cột {i+1}": v
                          for i, v in enumerate(cells)}
                lh_raw = _clean_single_line(cells[type_idx]) if (type_idx is not None and type_idx < len(cells)) else None
                out.append({
                    "name": name, "official": False, "kind": "monument",
                    "source_label": f"Wikipedia tiếng Việt — {page}",
                    "source_url": "https://vi.wikipedia.org/wiki/" + quote((wiki_title or page).replace(" ", "_"), safe=""),
                    "source_category": "Danh sách di tích (Wikipedia)",
                    "loai_hinh_raw": lh_raw, "province_raw": row_prov,
                    "residence_raw": None, "decision_raw": None,
                    "aliases": [], "alias_entries": [],
                    "wiki_titles": [wiki_title] if wiki_title else [],
                    "raw_fields": fields, "content": None,
                })

        # Fallback cho các trang danh sách tỉnh trình bày bằng gạch đầu dòng <ul><li>
        if added_from_table == 0 and page_prov:
            for ul in soup.select("div.mw-parser-output > ul"):
                for li in ul.find_all("li", recursive=False):
                    txt = _clean_single_line(re.sub(r"\[\d+\]", "", li.get_text(" ", strip=True)))
                    if not txt or len(txt) < 5 or len(txt) > 150:
                        continue
                    name = re.split(r"\s*[:(\-–]\s*", txt, maxsplit=1)[0].strip()
                    if not name or len(name) < 4 or _ADMIN_OR_NOISE_TITLE.match(name):
                        continue
                    wiki_title = None
                    for a in li.find_all("a", href=True):
                        href = a["href"]
                        if href.startswith("/wiki/") and "redlink=1" not in href and ":" not in href[6:]:
                            wiki_title = unquote(href[6:]).replace("_", " ").strip()
                            break
                    k = (_key(name), _key(page_prov))
                    if k in seen_key:
                        continue
                    seen_key.add(k)
                    out.append({
                        "name": name, "official": False, "kind": "monument",
                        "source_label": f"Wikipedia tiếng Việt — {page}",
                        "source_url": "https://vi.wikipedia.org/wiki/" + quote((wiki_title or page).replace(" ", "_"), safe=""),
                        "source_category": "Danh sách di tích (Wikipedia)",
                        "loai_hinh_raw": None, "province_raw": page_prov,
                        "residence_raw": None, "decision_raw": None,
                        "aliases": [], "alias_entries": [],
                        "wiki_titles": [wiki_title] if wiki_title else [],
                        "raw_fields": {"Danh sách": page, "Mục": txt}, "content": None,
                    })
        if idx % 20 == 0 or idx == len(list_pages):
            print(f"    [wiki lists] {idx}/{len(list_pages)} trang -> {len(out)} di tích")
    return out
_CAT_PREFIX_GROUPS = [
    ("Di tích - Lịch sử theo tỉnh (Wiki)", "monument",
     ("Di tích", "Di sản", "Lịch sử ", "Thành cổ", "Di chỉ", "Chiến trường", "Bảo tàng")),
    ("Văn hóa - Tôn giáo theo tỉnh (Wiki)", "monument",
     ("Chùa ", "Đền ", "Đình ", "Miếu ", "Lăng ", "Nhà thờ ", "Văn hóa ", "Kiến trúc ",
      "Vườn quốc gia", "Hang động", "Thác ", "Danh thắng", "Danh lam", "Khu bảo tồn", "Du lịch ")),
    ("Lễ hội - Làng nghề theo tỉnh (Wiki)", "festival",
     ("Lễ hội", "Làng nghề", "Nghề truyền thống")),
    ("Ẩm thực theo tỉnh (Wiki)", "cuisine",
     ("Ẩm thực", "Đặc sản", "Món ăn")),
]

_SUBCAT_SKIP = re.compile(
    r"(nhân vật|người |sinh năm|mất năm|chính trị gia|cầu thủ|câu lạc bộ|"
    r"trường học|bệnh viện|sân bay|nhà ga|đơn vị hành chính|"
    r"\bxã\b|\bphường\b|\bthị trấn\b|\bhuyện\b|\bquận\b|bầu cử|đại biểu|doanh nghiệp|công ty)",
    re.IGNORECASE,
)

_GOOD_SUBCAT_RX = re.compile(
    r"(di tích|di sản|chùa|đền|đình|miếu|lăng|nhà thờ|lễ hội|làng nghề|"
    r"ẩm thực|đặc sản|vườn quốc gia|hang động|thác|bảo tàng|danh thắng|danh lam|văn hóa|lịch sử)",
    re.IGNORECASE,
)


def get_wiki_by_province_categories() -> list[dict]:
    if not getattr(C, "USE_WIKI_PROVINCE_CATS", True):
        return []
    prov_lookup = _load_valid_province_lookup()
    safe_lookup = {k: v for k, v in prov_lookup.items() if len(k) >= 4}

    cat_hits: list[tuple[str, str, str, str]] = []
    seen_cats: set[str] = set()

    for src_cat, kind, prefixes in _CAT_PREFIX_GROUPS:
        for pref in prefixes:
            cont = None
            while True:
                p = {"list": "allcategories", "acprefix": pref, "aclimit": "500"}
                if cont:
                    p["accontinue"] = cont
                try:
                    data = _wiki_query(p)
                except Exception:
                    break
                for item in data.get("query", {}).get("allcategories", []):
                    cname = item.get("category", "")
                    if not cname or cname in seen_cats or _SUBCAT_SKIP.search(cname):
                        continue
                    prov = _match_province_in_text(cname, safe_lookup)
                    if prov:
                        seen_cats.add(cname)
                        cat_hits.append((cname, src_cat, kind, prov))
                cont = data.get("continue", {}).get("accontinue")
                if not cont:
                    break

    # Chạy 2 luồng + shared seen_global để lấy thêm subcat cấp huyện/thị xã mà không crawl trùng
    seen_global = set(seen_cats)
    lock = threading.Lock()

    def _crawl_cat(cname: str, depth: int) -> list[str]:
        titles, subcats, cont = [], [], None
        while True:
            p = {"list": "categorymembers", "cmtitle": f"Thể loại:{cname}",
                 "cmlimit": "500", "cmtype": "page|subcat", "cmprop": "title"}
            if cont:
                p["cmcontinue"] = cont
            try:
                data = _wiki_query(p)
            except Exception:
                break
            for m in data.get("query", {}).get("categorymembers", []):
                t = m.get("title", "")
                if t.startswith("Thể loại:"):
                    sc = t[len("Thể loại:"):]
                    if depth > 0 and _GOOD_SUBCAT_RX.search(sc) and not _SUBCAT_SKIP.search(sc):
                        with lock:
                            if sc not in seen_global:
                                seen_global.add(sc)
                                subcats.append(sc)
                else:
                    titles.append(t)
            cont = data.get("continue", {}).get("cmcontinue")
            if not cont:
                break
        time.sleep(0.08)
        for sc in subcats:
            titles.extend(_crawl_cat(sc, depth - 1))
        return titles

    print(f"    [wiki prov cats] tìm thấy {len(cat_hits)} thể loại -> tải (depth=1 có chống trùng)...")

    def _fetch_one(args):
        cname, src_cat, kind, prov = args
        titles = _clean_titles(_crawl_cat(cname, depth=1))
        return [(t, cname, src_cat, kind, prov) for t in titles]

    raw_items: list[tuple[str, str, str, str, str]] = []
    all_titles: set[str] = set()
    with ThreadPoolExecutor(max_workers=2) as ex:
        futs = [ex.submit(_fetch_one, item) for item in cat_hits]
        for idx, fut in enumerate(as_completed(futs), 1):
            for row in fut.result():
                raw_items.append(row)
                all_titles.add(row[0])
            if idx % 100 == 0 or idx == len(cat_hits):
                print(f"    [wiki prov cats] {idx}/{len(cat_hits)} thể loại -> {len(all_titles)} bài")

    valid_titles = _filter_titles_by_wikidata_p31(sorted(all_titles))
    out = []
    for title, cname, src_cat, kind, prov in raw_items:
        if title not in valid_titles:
            continue
        out.append({
            "name": title,
            "official": False,
            "kind": kind,
            "source_label": f"Wikipedia tiếng Việt — Thể loại:{cname}",
            "source_url": "https://vi.wikipedia.org/wiki/" + quote(title.replace(" ", "_"), safe=""),
            "source_category": src_cat,
            "loai_hinh_raw": None,
            "province_raw": prov,
            "residence_raw": None,
            "decision_raw": None,
            "aliases": [],
            "alias_entries": [],
            "wiki_titles": [title],
            "raw_fields": {"Thể loại nguồn": cname, "Tỉnh": prov, "Tiêu đề": title},
            "content": None,
        })
    print(f"    [wiki prov cats] giữ lại {len(out)} dòng hợp lệ")
    return out


# ============================================================
# NGUỒN 4: WIKIDATA (chia theo 63 Q-id tỉnh + lớp văn hóa/lịch sử/ẩm thực)
# ============================================================

_WD_CULTURAL_VN = """
SELECT DISTINCT ?item ?itemLabel ?a1Label ?a2Label ?article ?cls WHERE {
  VALUES ?cls { %s }
  ?item wdt:P17 wd:Q881 ;
        wdt:P31 ?cls .
  OPTIONAL {
    ?item wdt:P131 ?a1 .
    OPTIONAL { ?a1 wdt:P131 ?a2 . }
  }
  ?article schema:about ?item ;
           schema:isPartOf <https://vi.wikipedia.org/> .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "vi". }
}
"""

_WD_CLS_HERITAGE = (
    "wd:Q839954 wd:Q1081138 wd:Q4989906 wd:Q33506 wd:Q23413 wd:Q57821 "
    "wd:Q44539 wd:Q160742 wd:Q16970 wd:Q108325 wd:Q24398318 wd:Q570116 "
    "wd:Q15243209 wd:Q5003624 wd:Q2065736 wd:Q16560"
)
_WD_CLS_NATURE = (
    "wd:Q46169 wd:Q179049 wd:Q35509 wd:Q34038 wd:Q8502 wd:Q23397 "
    "wd:Q133056 wd:Q23442 wd:Q39594 wd:Q40080 wd:Q4022"
)

_WD_TOPIC_VN = """
SELECT DISTINCT ?item ?itemLabel ?locLabel ?article ?cls WHERE {
  VALUES ?cls { wd:Q132241 wd:Q746549 wd:Q1778821 wd:Q178561 }
  ?item wdt:P31/wdt:P279? ?cls .
  { ?item wdt:P17 wd:Q881 . } UNION { ?item wdt:P495 wd:Q881 . }
  OPTIONAL { ?item wdt:P131 ?loc . }
  OPTIONAL { ?item wdt:P276 ?loc . }
  ?article schema:about ?item ;
           schema:isPartOf <https://vi.wikipedia.org/> .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "vi". }
}
"""


def _wd_sparql(query: str, timeout_s: int = 60) -> list[dict]:
    for attempt in range(3):
        r = _s.get(
            C.WIKIDATA_SPARQL,
            params={"query": query, "format": "json"},
            headers={**C.HEADERS, "Accept": "application/sparql-results+json"},
            timeout=(10, timeout_s),
        )
        if r.status_code == 429:
            time.sleep(5 * (attempt + 1))
            continue
        r.raise_for_status()
        return r.json().get("results", {}).get("bindings", [])
    return []


def get_wikidata_cultural_by_province() -> list[dict]:
    if not getattr(C, "USE_WIKIDATA", True):
        return []
    prov_lookup = _load_valid_province_lookup()
    safe_lookup = {k: v for k, v in prov_lookup.items() if len(k) >= 4}
    skip_rx = re.compile(r"^(Xã|Phường|Thị trấn|Huyện|Quận|Thị xã|Tỉnh|Thành phố)\s", re.I)

    by_uri: dict[str, dict] = {}
    for label, cls_str in (
        ("di tích & công trình", _WD_CLS_HERITAGE),
        ("danh thắng (hang, thác, vườn QG, đảo, vịnh)", "wd:Q46169 wd:Q179049 wd:Q35509 wd:Q34038 wd:Q133056 wd:Q23442 wd:Q39594 wd:Q40080"),
        ("danh thắng (núi, hồ, sông)", "wd:Q8502 wd:Q23397 wd:Q4022"),
    ):
        try:
            bs = _wd_sparql(_WD_CULTURAL_VN % cls_str, timeout_s=60)
            print(f"    [wikidata] {label}: {len(bs)} dòng thô")
        except Exception as e:
            print(f"    ! wikidata {label}: {e}")
            continue
        for b in bs:
            name = b.get("itemLabel", {}).get("value", "").strip()
            if not name or re.fullmatch(r"Q\d+", name) or skip_rx.match(name) or _ADMIN_OR_NOISE_TITLE.match(name):
                continue
            uri = b["item"]["value"]
            art = b.get("article", {}).get("value", "")
            wtitle = unquote(art.rsplit("/", 1)[-1]).replace("_", " ").strip() if art else None
            rec = by_uri.setdefault(uri, {
                "name": name, "official": False, "kind": "monument",
                "source_label": "Wikidata + Wikipedia tiếng Việt",
                "source_url": uri, "source_category": "Di tích & Địa danh (Wikidata)",
                "loai_hinh_raw": None, "province_raw": None, "residence_raw": None,
                "decision_raw": None, "aliases": [], "alias_entries": [],
                "wiki_titles": [wtitle] if wtitle else [],
                "raw_fields": {"wikidata": uri, "viwiki": wtitle or ""},
                "content": None, "_provs": [],
            })
            for fld in ("a1Label", "a2Label"):
                lbl = b.get(fld, {}).get("value", "")
                pv = _match_province_in_text(lbl, safe_lookup) if lbl else None
                if pv and pv not in rec["_provs"]:
                    rec["_provs"].append(pv)
        time.sleep(1.5)

    out = []
    for rec in by_uri.values():
        provs = rec.pop("_provs")
        rec["province_raw"] = "\n".join(provs) if provs else None
        out.append(rec)

    try:
        topic_bs = _wd_sparql(_WD_TOPIC_VN, timeout_s=60)
        cat_map = {
            "Q132241": ("Lễ hội (Wikidata)", "festival"),
            "Q746549": ("Ẩm thực (Wikidata)", "cuisine"),
            "Q1778821": ("Ẩm thực (Wikidata)", "cuisine"),
            "Q178561": ("Lịch sử Việt Nam (Wikidata)", "history"),
        }
        for b in topic_bs:
            name = b.get("itemLabel", {}).get("value", "").strip()
            if not name or re.fullmatch(r"Q\d+", name) or _ADMIN_OR_NOISE_TITLE.match(name):
                continue
            cls_qid = b.get("cls", {}).get("value", "").rsplit("/", 1)[-1]
            src_cat, kind = cat_map.get(cls_qid, ("Di tích & Địa danh (Wikidata)", "monument"))
            loc_lbl = b.get("locLabel", {}).get("value", "")
            prov_name = _match_province_in_text(loc_lbl, safe_lookup) if loc_lbl else None
            art = b.get("article", {}).get("value", "")
            wtitle = unquote(art.rsplit("/", 1)[-1]).replace("_", " ").strip() if art else None
            uri = b["item"]["value"]
            out.append({
                "name": name, "official": False, "kind": kind,
                "source_label": "Wikidata + Wikipedia tiếng Việt",
                "source_url": uri, "source_category": src_cat,
                "loai_hinh_raw": None, "province_raw": prov_name, "residence_raw": None,
                "decision_raw": None, "aliases": [], "alias_entries": [],
                "wiki_titles": [wtitle] if wtitle else [],
                "raw_fields": {"wikidata": uri, "viwiki": wtitle or ""},
                "content": None,
            })
    except Exception as e:
        print(f"    ! wikidata topic VN: {e}")

    print(f"    [wikidata] tổng cộng {len(out)} dòng văn hóa/lịch sử/ẩm thực")
    return out

# Giữ lại 2 hàm cũ để tương thích ngược nếu gọi trực tiếp
_WD_QUERY = """
SELECT DISTINCT ?item ?itemLabel ?adminLabel ?coord ?article WHERE {
  ?item wdt:P17 wd:Q881 ;
        wdt:P1435 ?desig ;
        wdt:P131* ?admin .
  OPTIONAL { ?item wdt:P625 ?coord . }
  OPTIONAL { ?article schema:about ?item ;
                      schema:isPartOf <https://vi.wikipedia.org/> . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "vi,en" . }
}
LIMIT %d
"""


def get_wikidata_heritage() -> list[dict]:
    return get_wikidata_cultural_by_province()


def get_wikidata_bulk() -> list[dict]:
    return get_wikidata_cultural_by_province()


# ============================================================
# TRA CỨU + LẤY NỘI DUNG WIKIPEDIA
# ============================================================

def search_wikipedia_titles(query: str, limit: int = 5) -> list[str]:
    try:
        data = _wiki_query({"list": "search", "srsearch": query,
                            "srlimit": str(limit), "srnamespace": "0"})
        got = [x.get("title", "") for x in data.get("query", {}).get("search", [])]
        if not got:
            SEARCH_ERRORS.append((query, "srsearch trả 0 kết quả"))
        return got
    except Exception as e:
        SEARCH_ERRORS.append((query, f"srsearch {type(e).__name__}: {e}"))
        return []


def opensearch_titles(query: str, limit: int = 5) -> list[str]:
    try:
        r = _s.get(C.WIKI_API, params={
            "action": "opensearch", "search": query,
            "limit": str(limit), "namespace": "0", "format": "json",
        }, timeout=C.REQUEST_TIMEOUT)
        r.raise_for_status()
        j = r.json()
        return list(j[1]) if isinstance(j, list) and len(j) > 1 else []
    except Exception as e:
        SEARCH_ERRORS.append((query, f"opensearch {type(e).__name__}: {e}"))
        return []


def fetch_wikipedia_content(title: str) -> dict | None:
    try:
        r = _get(C.WIKI_API, params={
            "action": "query", "prop": "extracts|coordinates|info|pageprops",
            "inprop": "url", "redirects": "1", "explaintext": "1",
            "titles": title, "format": "json", "formatversion": "2",
        })
        pages = r.json().get("query", {}).get("pages", [])
        if not pages:
            return None
        p = pages[0]
        if p.get("missing") or "disambiguation" in p.get("pageprops", {}):
            return None
        content = (p.get("extract") or "").strip()
        if len(content) < 100:
            return None
        co = (p.get("coordinates") or [{}])[0]
        return {"title": p.get("title", title), "summary": "", "content": content,
                "lat": co.get("lat"), "lon": co.get("lon"), "url": p.get("fullurl", "")}
    except requests.RequestException as e:
        SEARCH_ERRORS.append((title, f"fetch {type(e).__name__}: {e}"))
        return None


def fetch_wikipedia_batch(titles: list[str]) -> dict:
    """
    Bước 1: Check tồn tại/chuyển hướng batch 50 tiêu đề/lần (tránh tải rác).
    Bước 2: Tải full văn bản từng bài hợp lệ (MediaWiki chỉ cho 1 full-extract/request)
            bằng 4 luồng song song.
    """
    uniq_titles = list(dict.fromkeys(t for t in titles if t))
    if not uniq_titles:
        return {}

    want_to_final: dict[str, str] = {}
    for i in range(0, len(uniq_titles), 50):
        chunk = uniq_titles[i:i + 50]
        try:
            data = _wiki_query({
                "prop": "info|pageprops", "redirects": "1", "titles": "|".join(chunk),
            })
        except Exception as e:
            SEARCH_ERRORS.append(("batch_check", f"{type(e).__name__}: {e}"))
            continue
        q = data.get("query", {})
        alias = {t: t for t in chunk}
        for n in q.get("normalized", []):
            alias[n["from"]] = n["to"]
        for rd in q.get("redirects", []):
            for k, v in list(alias.items()):
                if v == rd["from"]:
                    alias[k] = rd["to"]
        valid_finals = {
            p.get("title")
            for p in q.get("pages", [])
            if p.get("title") and not p.get("missing")
            and "disambiguation" not in p.get("pageprops", {})
        }
        for want, final in alias.items():
            if final in valid_finals:
                want_to_final[want] = final

    finals = sorted(set(want_to_final.values()))
    if not finals:
        return {}

    by_final: dict[str, dict] = {}
    def _load(t: str):
        res = fetch_wikipedia_content(t)
        time.sleep(0.05)
        return t, res

    with ThreadPoolExecutor(max_workers=4) as ex:
        for idx, (t, res) in enumerate(ex.map(_load, finals), 1):
            if res:
                by_final[t] = res
            if len(finals) > 40 and (idx % 100 == 0 or idx == len(finals)):
                print(f"    [fetch full] {idx}/{len(finals)} bài...")

    return {want: by_final[final]
            for want, final in want_to_final.items() if final in by_final}

_HERITAGE_SECTION_RX = re.compile(
    r"di\s*tích|văn\s*hóa|lễ\s*hội|ẩm\s*thực|đặc\s*sản|du\s*lịch|danh\s*thắng|làng\s*nghề|kiến\s*trúc|tôn\s*giáo",
    re.IGNORECASE,
)
_WIKILINK_RX = re.compile(r"\[\[([^|\[\]#]+)(?:\|[^\]]*)?\]\]")
_SECT_HEAD_RX = re.compile(r"^(={2,4})\s*([^=\n]+?)\s*\1\s*$", re.MULTILINE)


_VN_PROVINCE_WIKI_TITLES = [
    "An Giang", "Bà Rịa – Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh",
    "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau",
    "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên",
    "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội",
    "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên",
    "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn",
    "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận",
    "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh",
    "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên",
    "Thanh Hóa", "Thành phố Huế", "Tiền Giang", "Thành phố Hồ Chí Minh",
    "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái",
]

_ADMIN_UNIT_LINK_RX = re.compile(
    r"^(Huyện|Quận|Thị xã|Thành phố)\s+[A-ZĐÀ-Ỹ]",
)


def get_wiki_district_heritage() -> list[dict]:
    """
    Không gọi Wikidata SPARQL (tránh timeout). Đọc 63 bài tỉnh trên Wikipedia ->
    rút danh sách ~700 bài quận/huyện/thị xã -> quét mục Di tích/Văn hóa/Lễ hội/Ẩm thực/Du lịch.
    """
    if not getattr(C, "USE_WIKI_DISTRICT_HERITAGE", True):
        return []
    prov_lookup = _load_valid_province_lookup()
    safe_lookup = {k: v for k, v in prov_lookup.items() if len(k) >= 4}

    unit_to_prov: dict[str, str] = {}
    for pt in _VN_PROVINCE_WIKI_TITLES:
        pv = _match_province_in_text(pt, safe_lookup) or pt
        unit_to_prov[pt] = pv

    # Bước 1: Đọc 63 bài tỉnh (4 batch) để thu toàn bộ bài huyện/thị xã/quận/TP thuộc tỉnh
    for i in range(0, len(_VN_PROVINCE_WIKI_TITLES), 20):
        chunk = _VN_PROVINCE_WIKI_TITLES[i:i + 20]
        try:
            data = _wiki_query({
                "prop": "revisions", "rvprop": "content", "rvslots": "main",
                "redirects": "1", "titles": "|".join(chunk),
            })
        except Exception:
            continue
        for p in data.get("query", {}).get("pages", []):
            utitle = p.get("title", "")
            pv = _match_province_in_text(utitle, safe_lookup) or unit_to_prov.get(utitle)
            if not pv:
                continue
            revs = p.get("revisions") or []
            if not revs:
                continue
            wtext = ((revs[0].get("slots") or {}).get("main") or {}).get("content", "")
            for lm in _WIKILINK_RX.finditer(wtext):
                tgt = lm.group(1).strip()
                if ":" in tgt or len(tgt) < 5:
                    continue
                if _ADMIN_UNIT_LINK_RX.match(tgt):
                    # Bỏ qua nếu là tỉnh/TP trung ương khác
                    if not re.match(r"^Thành phố\s+(Hà Nội|Hồ Chí Minh|Hải Phòng|Đà Nẵng|Cần Thơ|Huế)$", tgt, re.I):
                        unit_to_prov.setdefault(tgt, pv)

    units = sorted(unit_to_prov)
    print(f"    [wiki district] quét mục văn hóa/di tích trong {len(units)} bài tỉnh/huyện...")

    raw_links: list[tuple[str, str, str]] = []
    seen_pair: set[tuple[str, str]] = set()
    for i in range(0, len(units), 20):
        chunk = units[i:i + 20]
        try:
            data = _wiki_query({
                "prop": "revisions", "rvprop": "content", "rvslots": "main",
                "redirects": "1", "titles": "|".join(chunk),
            })
        except Exception:
            continue
        for p in data.get("query", {}).get("pages", []):
            utitle = p.get("title", "")
            prov = unit_to_prov.get(utitle)
            if not prov:
                continue
            revs = p.get("revisions") or []
            if not revs:
                continue
            wtext = ((revs[0].get("slots") or {}).get("main") or {}).get("content", "")
            if not wtext:
                continue

            matches = list(_SECT_HEAD_RX.finditer(wtext))
            for idx_m, m in enumerate(matches):
                head = m.group(2).strip()
                if not _HERITAGE_SECTION_RX.search(head):
                    continue
                start = m.end()
                end = matches[idx_m + 1].start() if idx_m + 1 < len(matches) else len(wtext)
                sec_body = wtext[start:end]
                for lm in _WIKILINK_RX.finditer(sec_body):
                    tgt = lm.group(1).strip()
                    if (not tgt or ":" in tgt or len(tgt) < 4
                            or tgt.startswith(NOISE_PREFIXES)
                            or _ADMIN_OR_NOISE_TITLE.match(tgt)
                            or re.fullmatch(r"[\d\s\-–/.,]+", tgt)):
                        continue
                    pair = (tgt, prov)
                    if pair not in seen_pair:
                        seen_pair.add(pair)
                        raw_links.append((tgt, utitle, prov))
        time.sleep(0.08)

    all_targets = sorted({t for t, _, _ in raw_links})
    valid = _filter_titles_by_wikidata_p31(all_targets)

    out = []
    for tgt, utitle, prov in raw_links:
        if tgt not in valid:
            continue
        out.append({
            "name": tgt, "official": False, "kind": "monument",
            "source_label": f"Wikipedia tiếng Việt — mục di tích/văn hóa ({utitle})",
            "source_url": "https://vi.wikipedia.org/wiki/" + quote(tgt.replace(" ", "_"), safe=""),
            "source_category": "Di tích - Văn hóa theo địa phương (Wiki)",
            "loai_hinh_raw": None, "province_raw": prov,
            "residence_raw": None, "decision_raw": None,
            "aliases": [], "alias_entries": [],
            "wiki_titles": [tgt],
            "raw_fields": {"Bài địa phương": utitle, "Tỉnh": prov, "Tiêu đề": tgt},
            "content": None,
        })
    print(f"    [wiki district] thu được {len(out)} liên kết tỉnh-thực thể hợp lệ")
    return out


_LANDMARK_TO_PROVINCE = {
    "hội an": "Đà Nẵng", "mỹ sơn": "Đà Nẵng", "tam kỳ": "Đà Nẵng",
    "sa pa": "Lào Cai", "sapa": "Lào Cai", "mù cang chải": "Lào Cai", "nghĩa lộ": "Lào Cai", "bắc hà": "Lào Cai",
    "phú quốc": "An Giang", "hà tiên": "An Giang", "rạch giá": "An Giang", "núi sam": "An Giang",
    "đà lạt": "Lâm Đồng", "bảo lộc": "Lâm Đồng", "phan thiết": "Lâm Đồng", "mũi né": "Lâm Đồng",
    "nha trang": "Khánh Hòa", "cam ranh": "Khánh Hòa", "phan rang": "Khánh Hòa",
    "buôn ma thuột": "Đắk Lắk", "tuy hòa": "Đắk Lắk",
    "pleiku": "Gia Lai", "quy nhơn": "Gia Lai", "an nhơn": "Gia Lai", "tây sơn": "Gia Lai",
    "lý sơn": "Quảng Ngãi", "măng đen": "Quảng Ngãi",
    "hạ long": "Quảng Ninh", "móng cái": "Quảng Ninh", "uông bí": "Quảng Ninh", "yên tử": "Quảng Ninh", "đông triều": "Quảng Ninh", "vân đồn": "Quảng Ninh", "cô tô": "Quảng Ninh",
    "côn đảo": "Hồ Chí Minh", "vũng tàu": "Hồ Chí Minh", "thủ dầu một": "Hồ Chí Minh",
    "điện biên phủ": "Điện Biên", "mường phăng": "Điện Biên", "mường lay": "Điện Biên",
    "sìn hồ": "Lai Châu", "mường tè": "Lai Châu", "phong thổ": "Lai Châu",
    "mộc châu": "Sơn La", "mai sơn": "Sơn La", "thuận châu": "Sơn La",
    "đồng văn": "Tuyên Quang", "mèo vạc": "Tuyên Quang", "hoàng su phì": "Tuyên Quang", "na hang": "Tuyên Quang",
    "pác bó": "Cao Bằng", "trùng khánh": "Cao Bằng", "bản giốc": "Cao Bằng",
    "ba bể": "Thái Nguyên", "định hóa": "Thái Nguyên", "sông công": "Thái Nguyên",
    "mẫu sơn": "Lạng Sơn", "chi lăng": "Lạng Sơn", "bắc sơn": "Lạng Sơn",
    "việt trì": "Phú Thọ", "mai châu": "Phú Thọ", "tam đảo": "Phú Thọ", "vĩnh yên": "Phú Thọ",
    "từ sơn": "Bắc Ninh", "yên thế": "Bắc Ninh", "lục ngạn": "Bắc Ninh",
    "phố hiến": "Hưng Yên", "cát bà": "Hải Phòng", "đồ sơn": "Hải Phòng", "chí linh": "Hải Phòng", "côn sơn": "Hải Phòng",
    "hoa lư": "Ninh Bình", "tràng an": "Ninh Bình", "tam cốc": "Ninh Bình", "phủ lý": "Ninh Bình",
    "sầm sơn": "Thanh Hóa", "lam kinh": "Thanh Hóa", "pù luông": "Thanh Hóa",
    "cửa lò": "Nghệ An", "nam đàn": "Nghệ An", "kim liên": "Nghệ An",
    "hương sơn": "Hà Tĩnh", "kỳ anh": "Hà Tĩnh",
    "phong nha": "Quảng Trị", "đồng hới": "Quảng Trị", "lệ thủy": "Quảng Trị", "vĩnh linh": "Quảng Trị",
    "biên hòa": "Đồng Nai", "cát tiên": "Đồng Nai", "đồng xoài": "Đồng Nai",
    "trảng bàng": "Tây Ninh", "tân an": "Tây Ninh",
    "vị thanh": "Cần Thơ", "ngã bảy": "Cần Thơ",
    "mỹ tho": "Đồng Tháp", "gò công": "Đồng Tháp", "sa đéc": "Đồng Tháp", "cao lãnh": "Đồng Tháp",
    "năm căn": "Cà Mau", "đất mũi": "Cà Mau", "u minh hạ": "Cà Mau",
}


def enrich_wiki_provinces(records: list[dict]) -> None:
    targets = [r for r in records if not r.get("official") and not r.get("province_raw")
               and (r.get("wiki_titles") or [None])[0]]
    if not targets:
        return
    prov_lookup = _load_valid_province_lookup()
    safe_lookup = {k: v for k, v in prov_lookup.items() if len(k) >= 4}
    for lm, pv in _LANDMARK_TO_PROVINCE.items():
        safe_lookup.setdefault(lm, pv)

    titles = sorted({r["wiki_titles"][0] for r in targets})
    print(f"    [wiki prov enrich] suy tỉnh từ category/mở đầu cho {len(titles)} bài Wikipedia...")

    found_provs: dict[str, list[str]] = {}
    for i in range(0, len(titles), 20):
        chunk = titles[i:i + 20]
        try:
            data = _wiki_query({
                "prop": "categories|extracts", "cllimit": "max",
                "exintro": "1", "explaintext": "1", "exchars": "700",
                "redirects": "1", "titles": "|".join(chunk),
            })
        except Exception:
            continue
        q = data.get("query", {})
        alias = {t: t for t in chunk}
        for n in q.get("normalized", []):
            alias[n["from"]] = n["to"]
        for rd in q.get("redirects", []):
            for k, v in list(alias.items()):
                if v == rd["from"]:
                    alias[k] = rd["to"]
        pages = {p.get("title"): p for p in q.get("pages", [])}

        for orig, final in alias.items():
            p = pages.get(final)
            if not p or p.get("missing"):
                continue
            provs = []
            for c in p.get("categories", []):
                ct = c.get("title", "").replace("Thể loại:", "")
                if _SUBCAT_SKIP.search(ct):
                    continue
                pv = _match_province_in_text(ct, safe_lookup)
                if pv and pv not in provs:
                    provs.append(pv)
            if not provs:
                intro = p.get("extract") or ""
                for m in re.finditer(
                    r"(?:tỉnh|thành\s+phố|đặc\s+sản|nằm\s+ở|thuộc|tại|ở)\s+([A-ZĐÀ-Ỹ][^\n,.;()]{2,35})",
                    intro,
                ):
                    pv = _match_province_in_text(m.group(1), safe_lookup)
                    if pv and pv not in provs:
                        provs.append(pv)
            if provs:
                found_provs[orig] = provs
        time.sleep(0.08)

    updated = 0
    for r in targets:
        wt = r["wiki_titles"][0]
        if wt in found_provs:
            r["province_raw"] = "\n".join(found_provs[wt])
            updated += 1
    print(f"    [wiki prov enrich] đã gắn tỉnh cho {updated}/{len(targets)} bài")