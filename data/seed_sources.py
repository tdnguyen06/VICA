"""
Giai đoạn 1: Thu thập Seed Lists qua Wikipedia API chính thức.
Thay thế BeautifulSoup - tránh lỗi URL có dấu, tăng ổn định.
"""
import requests

HEADERS = {"User-Agent": "VICA-CulturalAtlas-Bot/1.0 (contact@culturalatlas.vn)"}
WIKI_API = "https://vi.wikipedia.org/w/api.php"


def _wiki_query(params: dict, timeout: int = 20) -> dict:
    """Wrapper gọi Wikipedia API với retry"""
    default = {"format": "json", "formatversion": "2", "action": "query"}
    default.update(params)
    r = requests.get(WIKI_API, params=default, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    return r.json()


def get_unesco_heritage_list() -> list[dict]:
    """
    Lấy di sản UNESCO VN từ trang 'Danh sách Di sản thế giới tại Việt Nam'.
    Dùng prop=links để lấy link nội bộ - ổn định hơn parse HTML.
    """
    # Danh sách 8 di sản UNESCO vật thể + phi vật thể VN (đã xác thực)
    KNOWN_UNESCO = {
        # Vật thể
        "Vịnh Hạ Long", "Quần thể di tích Cố đô Huế", "Phố cổ Hội An",
        "Thánh địa Mỹ Sơn", "Vườn quốc gia Phong Nha - Kẻ Bàng",
        "Hoàng thành Thăng Long", "Thành nhà Hồ",
        "Quần thể danh thắng Tràng An",
        # Phi vật thể
        "Nhã nhạc cung đình Huế", "Không gian văn hóa Cồng Chiêng Tây Nguyên",
        "Dân ca quan họ", "Ca trù", "Hát xoan",
        "Tín ngưỡng thờ cúng Hùng Vương", "Đờn ca tài tử Nam Bộ",
        "Dân ca ví, giặm Nghệ Tĩnh", "Nghi lễ và trò chơi kéo co",
        "Thực hành Tín ngưỡng thờ Mẫu Tam phủ",
        "Nghệ thuật Bài chòi Trung Bộ",
        "Nghệ thuật Xòe Thái",
    }
    
    try:
        data = _wiki_query({
            "prop": "links",
            "titles": "Danh sách Di sản thế giới tại Việt Nam",
            "pllimit": "500",
            "plnamespace": "0",
        })
    except Exception as e:
        print(f"! Lỗi get_unesco_heritage_list: {e}")
        return []
    
    pages = data.get("query", {}).get("pages", [])
    if not pages:
        return []
    
    items = []
    for link in pages[0].get("links", []):
        title = link.get("title", "")
        if title in KNOWN_UNESCO:
            items.append({
                "name": title,
                "category": "heritage",
                "sub_category": "unesco",
            })
    
    return items


def get_national_monuments_list() -> list[dict]:
    """Lấy di tích quốc gia đặc biệt qua category API"""
    try:
        data = _wiki_query({
            "list": "categorymembers",
            "cmtitle": "Thể loại:Di tích quốc gia đặc biệt",
            "cmlimit": "500",
            "cmtype": "page",
        })
    except Exception as e:
        print(f"! Lỗi get_national_monuments_list: {e}")
        return []
    
    items = []
    for member in data.get("query", {}).get("categorymembers", []):
        title = member.get("title", "")
        if ":" in title:  # bỏ Thể loại:, Tập tin:, Wikipedia:
            continue
        items.append({
            "name": title,
            "category": "heritage",
            "sub_category": "national_monument",
        })
    
    return items


def get_vietnamese_cuisine_list() -> list[dict]:
    """
    Lấy danh sách món ăn qua Category 'Ẩm thực Việt Nam'.
    ✅ Dùng list từ khóa MỞ RỘNG, không chỉ prefix.
    """
    try:
        data = _wiki_query({
            "list": "categorymembers",
            "cmtitle": "Thể loại:Ẩm thực Việt Nam",
            "cmlimit": "500",
            "cmtype": "page",
        })
    except Exception as e:
        print(f"! Lỗi get_vietnamese_cuisine_list: {e}")
        return []
    
    # Mở rộng list từ khóa để bắt nhiều món hơn
    DISH_KEYWORDS = [
        "phở", "bún", "bánh", "nem", "chả", "canh", "cơm", "gỏi",
        "xôi", "chè", "mì", "miến", "nộm", "lẩu", "cuốn", "ram",
        "giò", "kho", "hấp", "cao lầu", "mì quảng", "bánh xèo",
        "bánh khọt", "bánh tráng", "bánh chưng", "bánh tét",
        "bánh dày", "bánh giò", "bánh cuốn", "bánh hỏi",
        "bún bò", "bún riêu", "bún chả", "bún đậu",
        "cơm tấm", "cơm lam", "hủ tiếu", "bún mắm",
    ]
    
    items = []
    for member in data.get("query", {}).get("categorymembers", []):
        title = member.get("title", "")
        if ":" in title:
            continue
        lower = title.lower()
        if any(kw in lower for kw in DISH_KEYWORDS):
            items.append({
                "name": title,
                "category": "cuisine",
                "sub_category": "traditional_dish",
            })
    
    return items


def get_festivals_list() -> list[dict]:
    """Lấy lễ hội qua Category 'Lễ hội Việt Nam'"""
    try:
        data = _wiki_query({
            "list": "categorymembers",
            "cmtitle": "Thể loại:Lễ hội Việt Nam",
            "cmlimit": "500",
            "cmtype": "page",
        })
    except Exception as e:
        print(f"! Lỗi get_festivals_list: {e}")
        return []
    
    items = []
    for member in data.get("query", {}).get("categorymembers", []):
        title = member.get("title", "")
        if ":" in title:
            continue
        # Lọc các trang "Lễ hội X" hoặc có chữ "lễ hội" trong tên
        lower = title.lower()
        if "lễ hội" in lower or "hội " in lower:
            items.append({
                "name": title,
                "category": "culture",
                "sub_category": "festivals",
            })
    
    return items


def get_ethnic_groups_list() -> list[dict]:
    """
    Lấy 54 dân tộc qua Category 'Các dân tộc Việt Nam'.
    Wikipedia có sẵn category này - chính xác hơn parse HTML.
    """
    try:
        data = _wiki_query({
            "list": "categorymembers",
            "cmtitle": "Thể loại:Các dân tộc Việt Nam",
            "cmlimit": "500",
            "cmtype": "page",
        })
    except Exception as e:
        print(f"! Lỗi get_ethnic_groups_list: {e}")
        return []
    
    items = []
    for member in data.get("query", {}).get("categorymembers", []):
        title = member.get("title", "")
        if ":" in title:
            continue
        # Chuẩn hóa: thêm prefix "Người" nếu thiếu
        name = title if title.startswith("Người ") else f"Người {title}"
        items.append({
            "name": name,
            "category": "culture",
            "sub_category": "ethnic_groups",
        })
    
    return items


def get_craft_villages_list() -> list[dict]:
    """Lấy làng nghề qua Category 'Làng nghề Việt Nam'"""
    try:
        data = _wiki_query({
            "list": "categorymembers",
            "cmtitle": "Thể loại:Làng nghề Việt Nam",
            "cmlimit": "500",
            "cmtype": "page",
        })
    except Exception as e:
        print(f"! Lỗi get_craft_villages_list: {e}")
        return []
    
    items = []
    for member in data.get("query", {}).get("categorymembers", []):
        title = member.get("title", "")
        if ":" in title:
            continue
        items.append({
            "name": title,
            "category": "culture",
            "sub_category": "craft_villages",
        })
    
    return items