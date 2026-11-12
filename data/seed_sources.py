"""
VICA — Giai đoạn 1: thu thập seed records.

Nguồn chính thức (dsvh.gov.vn, chinhphu.vn) -> có metadata pháp lý.
Nguồn Wikipedia -> chỉ có nội dung, KHÔNG có metadata chính thức.

Mọi record giữ `raw_fields` = TẤT CẢ ô của bảng nguồn (spec A: không mất ô nào).
Ô nhiều giá trị (nhiều tỉnh / nhiều nhóm nhỏ) được giữ ranh giới dòng.
"""
import re
import time
import unicodedata
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

import config as C

_s = requests.Session()
_s.headers.update(C.HEADERS)

# Kênh chẩn đoán — pipeline đọc để ghi vào _report.md
SKIPPED_ROWS: list[tuple] = []    # (url, lý do, các ô)
SEARCH_ERRORS: list[tuple] = []   # (query, lỗi)

# LỖI GỐC (v3): "\x1f" là whitespace trong Python -> get_text(strip=True) xoá mất dấu ngăn,
# nên các tỉnh trong cùng một ô bị dính thành một chuỗi. Dùng ký tự vùng riêng (không phải whitespace).
_MARK = "\ue000"
_BLOCK_TAGS = ("br", "p", "div", "li")


# ============================================================
# HTTP + parse ô bảng
# ============================================================

def _get(url: str, params: dict | None = None) -> requests.Response:
    for attempt in range(3):
        try:
            r = _s.get(url, params=params, timeout=C.REQUEST_TIMEOUT)
            r.raise_for_status()
            return r
        except requests.RequestException:
            if attempt == 2:
                raise
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError("unreachable")


def _cells_text(tr) -> list[str]:
    """
    FIX: giữ ranh giới <br>/<p> (nhiều tỉnh trong 1 ô) + collapse khoảng trắng HTML.
    Trước đây get_text(" ") nghiền 'Tỉnh Đắk Lắk Tỉnh Đắk Nông...' thành 1 chuỗi.
    """
    out = []
    for td in tr.find_all(["td", "th"]):
        for tag in td.find_all(_BLOCK_TAGS):
            try:
                if tag.name == "br":
                    tag.replace_with(_MARK)
                else:
                    tag.insert_after(_MARK)
            except Exception:
                pass
        txt = unicodedata.normalize("NFC", td.get_text(" ", strip=True))
        parts = [re.sub(r"\s+", " ", p).strip() for p in txt.split(_MARK)]
        out.append("\n".join(p for p in parts if p))
    return out


def _norm_header(h: str) -> str:
    return re.sub(r"\s+", " ", h).strip()


def split_multivalue(v: str | None) -> list[str]:
    """Ô nhiều giá trị -> list. Giữ nguyên từng giá trị, không suy diễn."""
    if not v:
        return []
    parts = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"[\n;]+", v)]
    seen, out = set(), []
    for p in parts:
        if p and p.lower() not in seen:
            seen.add(p.lower())
            out.append(p)
    return out


def join_multivalue(v: str | None) -> str | None:
    parts = split_multivalue(v)
    return C.MULTIVALUE_SEP.join(parts) if parts else None


def _pick(fields: dict, *candidates: str) -> str | None:
    for k, v in fields.items():
        kl = k.lower()
        if v and any(c.lower() in kl for c in candidates):
            return v.strip()
    return None


def _key(s: str | None) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", s or "")).strip().lower()


# ============================================================
# NGUỒN 1: CỤC DI SẢN VĂN HÓA
# ============================================================

def _crawl_dsvh_tables(start_url: str, max_pages: int = 60) -> tuple[list[dict], list[str]]:
    extra = list(getattr(C, "DSVH_EXTRA_URLS", []))
    seen_urls, queue, rows = set(), [start_url] + extra, []

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

    # FIX: khoá dedup phải gồm ĐỊA PHƯƠNG + LOẠI HÌNH (spec B).
    # Khoá cũ (tên, QĐ) làm mất 4 bản ghi cùng tên cùng QĐ khác tỉnh.
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
        name = _pick(f, "Tên di sản")
        if not name:
            continue
        out.append({
            "name": name,
            "official": True,
            "kind": "intangible",
            "source_label": "Cục Di sản văn hóa — Danh mục DSVH phi vật thể quốc gia",
            "source_url": row["url"],
            "source_category": src_cat,
            "loai_hinh_raw": _pick(f, "Loại hình"),
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
        name = _pick(f, "Tên di tích")
        if not name:
            continue
        out.append({
            "name": name,
            "official": True,
            "kind": "monument",
            "source_label": f"Cục Di sản văn hóa — {src_cat}",
            "source_url": row["url"],
            "source_category": src_cat,
            # Bảng di tích dsvh KHÔNG có cột loại hình riêng -> null (spec 1)
            "loai_hinh_raw": _pick(f, "Loại hình"),
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


# ============================================================
# NGUỒN 2: CỔNG TTĐT CHÍNH PHỦ — 54 dân tộc
# ============================================================

def _split_names(raw: str | None) -> list[str]:
    """
    FIX: tách cả ' hay ' và tên trong ngoặc.
    'Táy Chiềng hay Táy Mương (Hàng Tổng)' -> 3 alias, không dính 1.
    """
    out = []
    for chunk in re.split(r"[,;\n]|\shay\s", raw or ""):
        chunk = re.sub(r"\s+", " ", chunk).strip()
        if not chunk:
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
    """
    Bảng: TT | Tên gọi | Tên gọi khác | Các nhóm nhỏ | Địa bàn cư trú.
    FIX:
      - lấy tên bằng CHỈ MỤC i_name (bản cũ dùng next(...) phụ thuộc thứ tự dict)
      - 'Địa bàn cư trú' -> residence_raw, KHÔNG phải địa phương theo quyết định
      - alias tách đủ, collapse khoảng trắng
    """
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
            nm = c[idx["name"]].strip()
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
        name = c[idx["name"]].strip()
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
            "province_raw": None,                       # không có quyết định
            "residence_raw": c[idx["loc"]].strip(),     # địa bàn phân bố
            "decision_raw": None,
            "aliases": [e["alias"] for e in alias_entries],
            "alias_entries": alias_entries,
            "raw_fields": fields,
            "content": None,
        })
    print(f"    [chinhphu] {len(out)} dân tộc")
    return out


# ============================================================
# NGUỒN 3: WIKIPEDIA
# ============================================================

NOISE_PREFIXES = ("Danh sách", "Bản mẫu:", "Thể loại:", "Thành viên:", "Tập tin:",
                  "Wikipedia:", "Trợ giúp:", "Cổng thông tin:", "Chủ đề:")


def _wiki_query(params: dict) -> dict:
    base = {"format": "json", "formatversion": "2", "action": "query"}
    base.update(params)
    return _get(C.WIKI_API, base).json()


def _category_titles(category: str, depth: int = 0) -> list[str]:
    titles, subcats, cont = [], [], None
    while True:
        p = {"list": "categorymembers", "cmtitle": f"Thể loại:{category}",
             "cmlimit": "500", "cmtype": "page|subcat", "cmprop": "title"}
        if cont:
            p["cmcontinue"] = cont
        data = _wiki_query(p)
        for m in data.get("query", {}).get("categorymembers", []):
            t = m.get("title", "")
            if t.startswith("Thể loại:"):
                subcats.append(t[len("Thể loại:"):])
            else:
                titles.append(t)
        cont = data.get("continue", {}).get("cmcontinue")
        if not cont:
            break
    if depth > 0:
        for sc in subcats:
            titles.extend(_category_titles(sc, depth - 1))
    return titles


def _clean_titles(titles: list[str], blacklist: tuple = ()) -> list[str]:
    seen, out = set(), []
    for t in titles:
        t = t.strip()
        if not t or t in seen or t in blacklist or t.startswith(NOISE_PREFIXES):
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
        "raw_fields": {"Thể loại nguồn": category, "Tiêu đề": t},
        "content": None,
    } for t in titles]


def get_wiki_intangible() -> list[dict]:
    return _wiki_records("Di sản văn hóa phi vật thể tại Việt Nam", "intangible")


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
          "hủ tiếu", "mắm", "rượu cần", "cà phê", "kho", "hấp", "nướng")
    return _wiki_records("Ẩm thực Việt Nam", "cuisine", keyword_filter=kw)


def get_wiki_festivals() -> list[dict]:
    return _wiki_records("Lễ hội Việt Nam", "festival",
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


# ============================================================
# TRA CỨU + LẤY NỘI DUNG WIKIPEDIA
# ============================================================

def search_wikipedia_titles(query: str, limit: int = 5) -> list[str]:
    """Lỗi được GHI LẠI, không nuốt im lặng (bản cũ trả [] câm)."""
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
    """Kênh tra cứu thứ hai (khớp tiền tố) khi srsearch rỗng."""
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
    """Chỉ LẤY nội dung, không suy diễn metadata."""
    try:
        summary = ""
        try:
            rs = _s.get(
                f"{C.WIKI_REST}/page/summary/{quote(title.replace(' ', '_'), safe='')}",
                timeout=C.REQUEST_TIMEOUT)
            if rs.status_code == 200:
                j = rs.json()
                if j.get("type") == "disambiguation":
                    return None
                summary = j.get("extract", "") or ""
        except requests.RequestException:
            pass

        r = _s.get(C.WIKI_API, params={
            "action": "query", "prop": "extracts|coordinates|info|pageprops",
            "inprop": "url", "redirects": "1", "explaintext": "1",
            "titles": title, "format": "json", "formatversion": "2",
        }, timeout=C.REQUEST_TIMEOUT)
        r.raise_for_status()
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
        return {"title": p.get("title", title), "summary": summary, "content": content,
                "lat": co.get("lat"), "lon": co.get("lon"), "url": p.get("fullurl", "")}
    except requests.RequestException as e:
        SEARCH_ERRORS.append((title, f"fetch {type(e).__name__}: {e}"))
        return None