"""
Crawl ảnh đại diện từ Wikipedia cho các entity ĐÃ CÓ trong _manifest.csv.
Đứng riêng, không sửa pipeline. Chạy lại được nhiều lần.

  python fetch_images.py                    # đọc output/_manifest.csv
  python fetch_images.py --limit 20         # thử nhỏ
  python fetch_images.py --min-width 300    # lọc ảnh nhỏ

Ra: output/_images.csv
"""
import argparse
import csv
import html
import re
import time
from pathlib import Path

import requests
import config as C

_s = requests.Session()
_s.headers.update(C.HEADERS)

# Ảnh rác: sơ đồ, quốc kỳ, huy hiệu, icon wiki, trang định hướng
BAD_FILE = re.compile(
    r"\.svg$|\.gif$|Flag_of|Coat_of_arms|Locator|Emblem|Commons-logo|"
    r"Edit-clear|Question_book|Symbol_|Ambox|Disambig|Nuvola|Crystal_|"
    r"Wiki(letter|pedia)|Stub|Increase|Decrease|Steady",
    re.IGNORECASE)
GOOD_EXT = re.compile(r"\.(?:jpe?g|png|webp)$", re.IGNORECASE)


def _api(params: dict) -> dict:
    base = {"action": "query", "format": "json", "formatversion": "2"}
    base.update(params)
    for attempt in range(3):
        try:
            r = _s.get(C.WIKI_API, params=base, timeout=C.REQUEST_TIMEOUT)
            r.raise_for_status()
            return r.json().get("query", {})
        except requests.RequestException as e:
            if attempt == 2:
                print(f"    ! API lỗi: {type(e).__name__}: {e}")
                return {}
            time.sleep(1.5 * (attempt + 1))
    return {}


def _title_alias(query: dict, requested: list[str]) -> dict:
    """Ánh xạ tiêu đề yêu cầu -> tiêu đề cuối (chuẩn hoá + chuyển hướng)."""
    alias = {t: t for t in requested}
    for n in query.get("normalized", []):
        alias[n["from"]] = n["to"]
    for rd in query.get("redirects", []):
        for k, v in list(alias.items()):
            if v == rd["from"]:
                alias[k] = rd["to"]
    return alias


def _strip_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def fetch_lead_images(titles: list[str]) -> dict:
    """50 tiêu đề/lần. pageimages không bị chặn 20 như extracts."""
    out = {}
    for i in range(0, len(titles), 50):
        chunk = titles[i:i + 50]
        q = _api({
            "prop": "pageimages",
            "piprop": "thumbnail|name|original",
            "pithumbsize": 800,
            "pilimit": "max",
            "redirects": "1",
            "titles": "|".join(chunk),
        })
        alias = _title_alias(q, chunk)
        pages = {p.get("title"): p for p in q.get("pages", [])}
        for want, final in alias.items():
            p = pages.get(final)
            if not p or p.get("missing"):
                continue
            fname = p.get("pageimage")
            th = p.get("thumbnail") or {}
            if not fname or not th.get("source"):
                continue
            out[want] = {
                "page_title": p.get("title", final),
                "file": fname,
                "thumb_url": th["source"],
                "width": th.get("width") or 0,
                "height": th.get("height") or 0,
            }
        print(f"    [ảnh] {min(i + 50, len(titles))}/{len(titles)}")
        time.sleep(C.POLITENESS_DELAY)
    return out


def fetch_licenses(files: list[str]) -> dict:
    """50 File:/lần. extmetadata chứa giấy phép + tác giả (bắt buộc lưu)."""
    out = {}
    for i in range(0, len(files), 50):
        chunk = files[i:i + 50]
        req = [f"File:{f}" for f in chunk]
        q = _api({
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
            "iiurlwidth": 800,
            "titles": "|".join(req),
        })
        alias = _title_alias(q, req)
        pages = {p.get("title"): p for p in q.get("pages", [])}
        for want, final in alias.items():
            p = pages.get(final)
            if not p:
                continue
            ii = (p.get("imageinfo") or [{}])[0]
            em = ii.get("extmetadata") or {}

            def m(k):
                return _strip_html((em.get(k) or {}).get("value", ""))

            key = want.split(":", 1)[1]
            out[key] = {
                "image_url": ii.get("url", ""),
                "source_page": ii.get("descriptionurl", ""),
                "license": m("LicenseShortName"),
                "author": m("Artist")[:300],
                "credit": m("Credit")[:200],
            }
        print(f"    [giấy phép] {min(i + 50, len(files))}/{len(files)}")
        time.sleep(C.POLITENESS_DELAY)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", default=None)
    ap.add_argument("--out", default=None)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--min-width", type=int, default=250)
    args = ap.parse_args()

    outdir = Path(C.OUTPUT_DIR)
    mpath = Path(args.manifest) if args.manifest else outdir / "_manifest.csv"
    opath = Path(args.out) if args.out else outdir / "_images.csv"

    if not mpath.exists():
        print(f"✗ Không thấy {mpath}. Chạy pipeline.py trước.")
        return

    rows = list(csv.DictReader(open(mpath, encoding="utf-8-sig")))
    # content_page = tiêu đề Wikipedia CHÍNH XÁC đã ghép -> không cần tra cứu
    targets = [(r["entity_id"], r["official_name"], r["content_page"])
               for r in rows if (r.get("content_page") or "").strip()]
    if args.limit:
        targets = targets[:args.limit]

    print(f"Có {len(targets)}/{len(rows)} entity đã ghép được trang Wikipedia.")
    if not targets:
        print("✗ Không có content_page. Bạn đã chạy --skip-content? Chạy lại không có cờ đó.")
        return

    titles = sorted({t for _, _, t in targets})
    print(f"\n[1/2] Lấy ảnh đại diện ({len(titles)} trang)...")
    imgs = fetch_lead_images(titles)

    kept, dropped = {}, []
    for title, im in imgs.items():
        if not GOOD_EXT.search(im["file"]):
            dropped.append((title, im["file"], "không phải ảnh (âm thanh/video/khác)"))
            continue
        if BAD_FILE.search(im["file"]):
            dropped.append((title, im["file"], "ảnh rác (svg/kỳ/huy hiệu/icon)"))
            continue
        if im["width"] and im["width"] < args.min_width:
            dropped.append((title, im["file"], f"quá nhỏ ({im['width']}px)"))
            continue
        kept[title] = im

    print(f"  Giữ {len(kept)}, loại {len(dropped)}")
    if not kept:
        print("✗ Không còn ảnh nào.")
        return

    print(f"\n[2/2] Lấy giấy phép ({len(kept)} file)...")
    files = sorted({im["file"] for im in kept.values()})
    lic = fetch_licenses(files)

    out = []
    for eid, name, title in targets:
        im = kept.get(title)
        if not im:
            continue
        l = lic.get(im["file"], {})
        out.append({
            "entity_id": eid,
            "official_name": name,
            "page_title": im["page_title"],
            "source_file": im["file"],
            "image_url": l.get("image_url") or im["thumb_url"],
            "thumb_url": im["thumb_url"],
            "width": im["width"],
            "height": im["height"],
            "license": l.get("license", ""),
            "author": l.get("author", ""),
            "credit": l.get("credit", ""),
            "source_page": l.get("source_page", ""),
        })

    with open(opath, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0].keys()))
        w.writeheader()
        w.writerows(out)

    print(f"\n✔ {len(out)} ảnh → {opath}")
    print(f"  Coverage: {len(out)}/{len(rows)} = {len(out)/len(rows):.0%}")
    no_license = [r for r in out if not r["license"]]
    if no_license:
        print(f"  ⚠ {len(no_license)} ảnh thiếu giấy phép — KHÔNG dùng công khai:")
        for r in no_license[:10]:
            print(f"     {r['official_name']} — {r['source_file']}")
    if dropped:
        print(f"\n  Ảnh bị loại ({len(dropped)}), 10 đầu:")
        for t, fn, why in dropped[:10]:
            print(f"     «{t}» {fn} — {why}")


if __name__ == "__main__":
    main()