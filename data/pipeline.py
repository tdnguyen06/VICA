"""
VICA Data Pipeline - Single File
Seed List → Wikipedia Deep Dive → AWS S3 (Zero Local Storage)
"""
import os
import re
import time
import unicodedata
import requests
import boto3
from dotenv import load_dotenv

# Import các hàm lấy seed list (file seed_sources.py phải cùng thư mục)
from seed_sources import (
    get_unesco_heritage_list,
    get_national_monuments_list,
    get_vietnamese_cuisine_list,
    get_festivals_list,
    get_ethnic_groups_list,
    get_craft_villages_list,
)

# ============ LOAD ENV ============
# Tìm .env ở thư mục gốc dự án
ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(ENV_PATH):
    load_dotenv(ENV_PATH)
else:
    load_dotenv()

# ============ CẤU HÌNH ============
WIKI_API = "https://vi.wikipedia.org/w/api.php"
WIKI_REST = "https://vi.wikipedia.org/api/rest_v1"
HEADERS = {"User-Agent": "VICA-CulturalAtlas-Bot/1.0 (contact@culturalatlas.vn)"}

S3_BUCKET = os.getenv("AWS_S3_BUCKET", "vica-537390611425-ap-southeast-1-an")
AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-1")
AWS_PROFILE = os.getenv("AWS_PROFILE", "default")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")


# ============ S3 CLIENT (GỌP TỪ s3_utils) ============
_S3_CLIENT_CACHE = {}

def get_s3_client():
    """Khởi tạo S3 client với cache để tái sử dụng"""
    cache_key = f"{AWS_PROFILE}:{AWS_REGION}"
    if cache_key in _S3_CLIENT_CACHE:
        return _S3_CLIENT_CACHE[cache_key]
    
    if AWS_PROFILE and AWS_PROFILE != "default":
        session = boto3.Session(profile_name=AWS_PROFILE, region_name=AWS_REGION)
        client = session.client("s3")
    elif AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        client = boto3.client(
            "s3",
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        )
    else:
        # Dùng credentials mặc định (~/.aws/credentials)
        client = boto3.client("s3", region_name=AWS_REGION)
    
    _S3_CLIENT_CACHE[cache_key] = client
    return client


# ============ UTILITIES ============
def to_slug(text: str) -> str:
    """Slug ASCII (an toàn cho S3 key & metadata)"""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("utf-8")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)


def dedup_items(items: list[dict]) -> list[dict]:
    """Dedup theo tên, merge metadata, ưu tiên sub_category quan trọng"""
    PRIORITY = {
        "unesco": 5, "national_monument": 4,
        "festivals": 3, "craft_villages": 3, "ethnic_groups": 3,
        "traditional_dish": 2,
    }
    seen = {}
    for item in items:
        name = item.get("name")
        if not name:
            continue
        if name in seen:
            existing = seen[name]
            for k in ("province", "year_recognized", "time", "linguistic_group"):
                if item.get(k) and not existing.get(k):
                    existing[k] = item[k]
            new_p = PRIORITY.get(item.get("sub_category"), 1)
            old_p = PRIORITY.get(existing.get("sub_category"), 1)
            if new_p > old_p:
                existing["sub_category"] = item["sub_category"]
        else:
            seen[name] = item.copy()
    return list(seen.values())


# ============ WIKIPEDIA DEEP DIVE ============
def deep_dive_wikipedia(title: str, retries: int = 2) -> dict | None:
    """Lấy summary + full text + tọa độ GIS từ Wikipedia API"""
    for attempt in range(retries):
        try:
            # 1. Summary + check disambiguation
            summary = ""
            is_disambiguation = False
            try:
                r_sum = requests.get(
                    f"{WIKI_REST}/page/summary/{title}",
                    headers=HEADERS, timeout=15,
                )
                if r_sum.status_code == 200:
                    sum_data = r_sum.json()
                    if sum_data.get("type") == "disambiguation":
                        is_disambiguation = True
                    else:
                        summary = sum_data.get("extract", "")
            except Exception:
                pass
            
            if is_disambiguation:
                print(f"    ⚠ Bỏ qua trang định hướng: {title}")
                return None
            
            # 2. Full text + coordinates + follow redirect
            r_txt = requests.get(
                WIKI_API,
                params={
                    "action": "query",
                    "prop": "extracts|coordinates|info",
                    "redirects": "1",
                    "explaintext": "1",
                    "titles": title,
                    "format": "json",
                    "formatversion": "2",
                },
                headers=HEADERS,
                timeout=20,
            )
            r_txt.raise_for_status()
            
            pages = r_txt.json().get("query", {}).get("pages", [])
            if not pages:
                return None
            
            page = pages[0]
            if "missing" in page:
                return None
            
            content = page.get("extract", "").strip()
            if not content or len(content) < 100:
                return None
            
            if "disambiguation" in page.get("pageprops", {}):
                print(f"    ⚠ Bỏ qua trang định hướng: {title}")
                return None
            
            coords_list = page.get("coordinates") or []
            coords = coords_list[0] if coords_list else {}
            
            return {
                "title": page.get("title", title),
                "summary": summary,
                "content": content,
                "lat": coords.get("lat"),
                "lon": coords.get("lon"),
            }
        
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(1 * (attempt + 1))
                continue
            print(f"    ✗ Lỗi request '{title}': {e}")
            return None
    return None


# ============ S3 UPLOAD ============
def upload_to_s3(item: dict, wiki_info: dict):
    """Ghép metadata + content → stream thẳng S3"""
    category = item.get("category", "general")
    sub_cat = item.get("sub_category", "default")
    slug = to_slug(wiki_info["title"])
    s3_key = f"processed/{category}/{sub_cat}/{slug}.md"
    
    md_lines = [
        f"# {wiki_info['title']}\n",
        f"> {wiki_info['summary']}\n" if wiki_info.get("summary") else "",
        "## Thông tin định danh",
        f"- **Tên thực thể:** {item['name']}",
        f"- **Thể loại:** {category} ({sub_cat})",
    ]
    if item.get("province"):
        md_lines.append(f"- **Địa phương:** {item['province']}")
    if item.get("year_recognized"):
        md_lines.append(f"- **Năm công nhận:** {item['year_recognized']}")
    if item.get("time"):
        md_lines.append(f"- **Thời gian tổ chức:** {item['time']}")
    if item.get("linguistic_group"):
        md_lines.append(f"- **Nhóm ngôn ngữ:** {item['linguistic_group']}")
    if wiki_info.get("lat") and wiki_info.get("lon"):
        md_lines.append(f"- **Tọa độ GIS:** {wiki_info['lat']}, {wiki_info['lon']}")
    
    md_lines.extend([
        "\n## Nội dung chi tiết & Lịch sử văn hóa\n",
        wiki_info["content"],
    ])
    
    markdown_text = "\n".join(md_lines)
    
    # ✅ FIX: Metadata CHỈ dùng ASCII (slug thay vì title có dấu)
    s3 = get_s3_client()
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=s3_key,
        Body=markdown_text.encode("utf-8"),
        ContentType="text/markdown; charset=utf-8",
        Metadata={
            "category": category,
            "subcategory": sub_cat,
            "slug": slug,
            "seedname": to_slug(item["name"]),
        },
    )
    print(f"  ✔ s3://{S3_BUCKET}/{s3_key}")


# ============ PIPELINE ORCHESTRATOR ============
def run_full_pipeline():
    print("=" * 65)
    print(" VICA PIPELINE: SEED LIST → WIKI DEEP DIVE → S3")
    print(f" Bucket: s3://{S3_BUCKET}")
    print("=" * 65)
    
    # GĐ 1: Thu thập seed lists
    print("\n[GĐ 1] Thu thập seed lists...")
    collectors = [
        ("UNESCO Heritage", get_unesco_heritage_list),
        ("Di tích QG đặc biệt", get_national_monuments_list),
        ("Ẩm thực 3 miền", get_vietnamese_cuisine_list),
        ("Lễ hội", get_festivals_list),
        ("54 dân tộc", get_ethnic_groups_list),
        ("Làng nghề", get_craft_villages_list),
    ]
    
    all_items = []
    for label, fn in collectors:
        try:
            items = fn()
            print(f"  + {label}: {len(items)} thực thể")
            all_items.extend(items)
        except Exception as e:
            print(f"  ! Lỗi {label}: {e}")
    
    print(f"\n  Tổng raw: {len(all_items)}")
    items = dedup_items(all_items)
    print(f"  Sau dedup: {len(items)}\n")
    
    # GĐ 2 & 3: Deep dive + S3
    print("[GĐ 2 & 3] Deep-dive Wikipedia + upload S3...")
    ok, skip, err = 0, 0, 0
    
    for idx, item in enumerate(items, 1):
        name = item["name"]
        print(f"[{idx}/{len(items)}] {name}...")
        try:
            wiki_info = deep_dive_wikipedia(name)
            if not wiki_info:
                skip += 1
                continue
            
            upload_to_s3(item, wiki_info)
            ok += 1
            time.sleep(0.6)
        except Exception as e:
            print(f"  ✗ Lỗi: {e}")
            err += 1
    
    print(f"\n{'=' * 65}")
    print(f"✔ Thành công: {ok} | ⚠ Bỏ qua: {skip} | ✗ Lỗi: {err}")
    print(f"{'=' * 65}")


if __name__ == "__main__":
    run_full_pipeline()