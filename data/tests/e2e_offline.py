"""Chạy pipeline end-to-end OFFLINE: thay các hàm mạng của seed_sources bằng dữ liệu giả
mô phỏng đúng các ca lỗi thấy trong output thật. Không gọi mạng."""
import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
tmp = tempfile.mkdtemp(prefix="vica_out_")
os.environ["VICA_OUTPUT_DIR"] = tmp
import config as C
C.POLITENESS_DELAY = 0
import seed_sources as S

def off(name, prov, dec, cat, kind, lh=None):
    return {"name": name, "official": True, "kind": kind, "source_label": f"dsvh — {cat}",
            "source_url": "https://dsvh.gov.vn/x", "source_category": cat, "loai_hinh_raw": lh,
            "province_raw": prov, "residence_raw": None, "decision_raw": dec, "aliases": [],
            "alias_entries": [], "raw_fields": {"Tên": name, "Tỉnh": prov or ""}, "content": None}

def wiki(name, cat):
    return {"name": name, "official": False, "kind": "wiki", "source_label": f"Wikipedia — Thể loại:{cat}",
            "source_url": "https://vi.wikipedia.org/wiki/" + name.replace(" ", "_"), "source_category": cat,
            "loai_hinh_raw": None, "province_raw": None, "residence_raw": None, "decision_raw": None,
            "aliases": [], "alias_entries": [], "raw_fields": {"Thể loại nguồn": cat, "Tiêu đề": name}, "content": None}

def ethnic(name, alts, res):
    ae = [{"alias": a, "alias_type": "tên gọi khác", "source": "https://chinhphu.vn/x"} for a in alts]
    return {"name": name, "official": True, "kind": "ethnic", "source_label": "chinhphu.vn",
            "source_url": "https://chinhphu.vn/x", "source_category": "Các dân tộc Việt Nam",
            "loai_hinh_raw": None, "province_raw": None, "residence_raw": res, "decision_raw": None,
            "aliases": alts, "alias_entries": ae, "raw_fields": {"Tên gọi": name, "Địa bàn cư trú": res}, "content": None}

CONG = "Tỉnh Đắk Lắk\nTỉnh Đắk Nông\nTỉnh Gia Lai\nTỉnh Kon Tum\nTỉnh Lâm Đồng"
INT = [
  off("Không gian văn hóa Cồng chiêng Tây Nguyên", CONG, "5079/QĐ - BVHTTDL Ngày 27/12/2012", "Di sản văn hóa phi vật thể quốc gia", "i", "Nghệ thuật trình diễn dân gian"),
  off("Nhã nhạc - Âm nhạc Cung đình Việt Nam", "Tỉnh Thừa Thiên Huế", "5079/QĐ - BVHTTDL Ngày 27/12/2012", "Di sản văn hóa phi vật thể quốc gia", "i", "Nghệ thuật trình diễn dân gian"),
]
SPECIAL = [off("Đô thị cổ Hội An", "Tỉnh Quảng Nam", "1272/QĐ-TTg Ngày 12/8/2009", "Di tích quốc gia đặc biệt", "m")]
NATIONAL = [off("Địa điểm Văn phòng Hội đồng quốc phòng tối cao (1949)", "Xã Hợp Thành, Huyện Sơn Dương", "617/QĐ-BVHTTDL", "Di tích quốc gia", "m")]
ETH = [ethnic("Kinh (Việt)", ["Việt"], "Cả nước"), ethnic("Thái", ["Táy"], "Sơn La, Điện Biên")]
WIKI_MON = [wiki("Phố cổ Hội An", "Di sản thế giới tại Việt Nam")]
WIKI_HIS = [wiki("12 sứ quân", "Lịch sử Việt Nam")]

S.get_dsvh_intangible_heritage = lambda: INT
S.get_dsvh_special_monuments = lambda: SPECIAL
S.get_dsvh_national_monuments = lambda: NATIONAL
S.get_chinhphu_ethnic_groups = lambda: ETH
for n in ("get_wiki_world_heritage","get_wiki_monuments"): setattr(S, n, lambda: WIKI_MON)
for n in ("get_wiki_intangible","get_wiki_cuisine","get_wiki_festivals","get_wiki_ethnic","get_wiki_craft_villages"):
    setattr(S, n, lambda: [])
S.get_wiki_history = lambda: WIKI_HIS

LONG = ("Hội An là đô thị cổ ở Quảng Nam, từng là thương cảng quốc tế sầm uất. Nhà Nguyễn và nhà Nguyễn sau đó giữ gìn phố cổ.\n"
        "Nhiều nhà cổ được xây dựng từ thế kỷ 17 theo kiến trúc truyền thống và kiến trúc đặc trưng.\n\n\n== Lịch sử ==\n"
        "Thời nhà Nguyễn, thương cảng suy giảm. Dưới thời Bắc thuộc đã có dấu tích. Triều Nguyễn cho trùng tu nhiều đền thờ. "
        "Dưới thời Pháp thuộc, thực dân Pháp để lại vài công trình.\n== Du lịch ==\nLễ hội đèn lồng, lễ hội Rằm là lễ hội lớn; lễ hội diễn ra hằng tháng.\n"
        "== Tham khảo ==\n[1] Nguồn A\n[2] Nguồn B\n== Liên kết ngoài ==\nTrang web chính thức")
PAGES = {
 "Phố cổ Hội An": {"title": "Phố cổ Hội An", "summary": "Hội An là đô thị cổ ở Quảng Nam, từng là thương cảng quốc tế sầm uất.", "content": LONG, "lat": 15.88, "lon": 108.33},
 "Văn Cao": {"title": "Văn Cao", "summary": "Văn Cao là nhạc sĩ, họa sĩ, nhà thơ Việt Nam, tác giả Tiến quân ca.", "content": "Văn Cao sinh năm 1923 tại Nam Định. " * 20},
 "Kinh Thánh tiếng Việt (1925)": {"title": "Kinh Thánh tiếng Việt (1925)", "summary": "Bản dịch Kinh Thánh sang tiếng Việt năm 1925.", "content": "Bản dịch Kinh Thánh. " * 30},
 "Âm nhạc": {"title": "Âm nhạc", "summary": "Âm nhạc là nghệ thuật sắp xếp âm thanh theo thời gian.", "content": "Âm nhạc gồm giai điệu, hòa âm, tiết tấu. " * 30},
 "Nhã nhạc": {"title": "Nhã nhạc", "summary": "Nhã nhạc là âm nhạc cung đình Việt Nam, thịnh hành ở Huế dưới triều Nguyễn.", "content": "Nhã nhạc cung đình Huế. " * 40},
 "Người Việt": {"title": "Người Việt", "summary": "Người Việt hay người Kinh là một dân tộc sinh sống chủ yếu ở Việt Nam.", "content": "Người Việt là dân tộc đông nhất. " * 30},
 "Người Thái": {"title": "Người Thái", "summary": "Người Thái là một nhóm dân tộc ở Thái Lan.", "content": "Dân số Thái Lan. " * 30},
 "Cồng chiêng": {"title": "Cồng chiêng", "summary": "Cồng chiêng là nhạc cụ gõ, đặc biệt gắn với không gian văn hóa Tây Nguyên.", "content": "Cồng chiêng Tây Nguyên. " * 40},
 "12 sứ quân": {"title": "12 sứ quân", "summary": "12 sứ quân là các thủ lĩnh cát cứ thời Ngô.", "content": "12 sứ quân là các thủ lĩnh cát cứ thời Ngô. Nhà Ngô suy yếu nên loạn.\n== Dấu tích ==\nThành Đỗ Động còn dấu tích. Nhà Ngô và nhà Đinh để lại di chỉ. Thời Đinh thống nhất.\n== Tham khảo =="},
}
SEARCH = {
 "Địa điểm Văn phòng Hội đồng quốc phòng tối cao (1949)": ["Văn Cao"],
 "Kinh (Việt)": ["Kinh Thánh tiếng Việt (1925)"], "Kinh": ["Kinh Thánh tiếng Việt (1925)"],
 "Người Kinh": ["Người Việt"], "Người Việt": ["Người Việt"], "Việt": [],
 "Nhã nhạc - Âm nhạc Cung đình Việt Nam": ["Âm nhạc", "Nhã nhạc"], "Nhã nhạc": ["Nhã nhạc"],
 "Người Thái": ["Người Thái"], "Thái": ["Người Thái"], "Táy": [],
 "Đô thị cổ Hội An": ["Phố cổ Hội An"],
 "Không gian văn hóa Cồng chiêng Tây Nguyên": ["Cồng chiêng"], "Cồng chiêng Tây Nguyên": ["Cồng chiêng"],
}
S.search_wikipedia_titles = lambda q, limit=5: SEARCH.get(q, [])
S.opensearch_titles = lambda q, limit=5: []
REDIRECT = {"Đô thị cổ Hội An": "Phố cổ Hội An"}      # giống redirects=1 của API thật
def _fetch(t):
    p = PAGES.get(REDIRECT.get(t, t))
    if not p:
        return None
    return {"url": "https://vi.wikipedia.org/wiki/" + p["title"].replace(" ", "_"), "lat": None, "lon": None, **p}
S.fetch_wikipedia_content = _fetch

import pipeline
pipeline.main([])
print("\nOUT:", tmp)