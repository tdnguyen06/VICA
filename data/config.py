"""
VICA — Cấu hình tập trung.
Ba chỗ cần điền: ENUM loại hình, đường dẫn mapping địa phương, từ vựng era/chủ đề.
Mọi giá trị ở đây được ghi lại vào _assumptions.md để truy vết.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_PATH if ENV_PATH.exists() else None)

# ================= OUTPUT =================
OUTPUT_DIR = os.getenv("VICA_OUTPUT_DIR", "output")

# ================= CHUNKING (spec C) =================
# "từ" = token cách nhau bởi khoảng trắng (âm tiết tiếng Việt)
MAX_SECTION_WORDS = 250
MIN_SECTION_WORDS = 40
# Mục Wikipedia KHÔNG mang nội dung (danh sách tham khảo...). Bị loại và ghi vào báo cáo.
SKIP_HEADINGS = {
    "tham khảo", "liên kết ngoài", "xem thêm", "chú thích", "ghi chú", "thư mục",
    "chú giải", "tài liệu tham khảo", "nguồn tham khảo", "đọc thêm", "thư viện ảnh",
    "hình ảnh", "nguồn", "chú thích và tham khảo",
}
# Dòng ngữ cảnh: tối đa bao nhiêu địa phương hiển thị (phần còn lại ghi "+N").
CONTEXT_MAX_PROVINCES = 3

# ================= ĐỊA PHƯƠNG (spec D) =================
# "" = chưa có bảng => địa phương hiện hành = null toàn corpus + báo cáo.
# CSV 2 cột: old,current
LOCALITY_MAPPING_CSV = ""
MULTIVALUE_SEP = "; "          # hiển thị ô nhiều giá trị (nhiều tỉnh)

# ================= ENUM LOẠI HÌNH =================
# Khớp NGUYÊN VĂN sau chuẩn hoá khoảng trắng. Ngoài enum -> null + báo cáo.
LOAI_HINH_ENUM = [
    "Tiếng nói, chữ viết",
    "Ngữ văn dân gian",
    "Nghệ thuật trình diễn dân gian",
    "Tập quán xã hội và tín ngưỡng",
    "Lễ hội truyền thống",
    "Nghề thủ công truyền thống",
    "Tri thức dân gian",
    "Di tích lịch sử",
    "Di tích kiến trúc nghệ thuật",
    "Di tích khảo cổ",
    "Danh lam thắng cảnh",
]

# ================= DOMAIN =================
DOMAIN_BY_LOAI_HINH = {
    "Tiếng nói, chữ viết":            ["văn hoá"],
    "Ngữ văn dân gian":               ["văn hoá"],
    "Nghệ thuật trình diễn dân gian": ["văn hoá"],
    "Tập quán xã hội và tín ngưỡng":  ["văn hoá"],
    "Lễ hội truyền thống":            ["văn hoá", "lịch sử"],
    "Nghề thủ công truyền thống":     ["văn hoá"],
    "Tri thức dân gian":              ["văn hoá"],
    "Di tích lịch sử":                ["lịch sử", "văn hoá"],
    "Di tích kiến trúc nghệ thuật":   ["văn hoá", "lịch sử"],
    "Di tích khảo cổ":                ["lịch sử"],
    "Danh lam thắng cảnh":            ["văn hoá"],
}

# Fallback khi loại hình = null: dùng CHÍNH phân loại của nguồn.
DOMAIN_BY_SOURCE_CATEGORY = {
    "Di sản văn hóa phi vật thể quốc gia":     ["văn hoá"],
    "Di sản văn hóa phi vật thể tại Việt Nam": ["văn hoá"],
    "Di tích quốc gia đặc biệt":               ["lịch sử", "văn hoá"],
    "Di tích quốc gia":                        ["lịch sử", "văn hoá"],
    "Di sản thế giới tại Việt Nam":            ["văn hoá", "lịch sử"],
    "Các dân tộc Việt Nam":                    ["văn hoá"],
    "Làng nghề Việt Nam":                      ["văn hoá"],
    "Lễ hội Việt Nam":                         ["văn hoá"],
    "Ẩm thực Việt Nam":                        ["ẩm thực", "văn hoá"],
    "Lịch sử Việt Nam":                        ["lịch sử"],
}
DOMAIN_ENUM = ["văn hoá", "lịch sử", "ẩm thực"]

# ================= ERA / CHỦ ĐỀ =================
# TỪ VỰNG ĐÓNG + LUẬT NHẬN DIỆN TƯỜNG MINH (không cần LLM, không cần API key).
# Mỗi nhãn = danh sách regex (phân biệt hoa/thường ở TÊN RIÊNG; _dyn() xử lý 'thời X' vs tên người). Bằng chứng gán nhãn
# luôn là câu nguyên văn chứa chỗ khớp -> kiểm tra được bằng phép chứa chuỗi con.
# ĐÂY LÀ ĐỀ XUẤT BAN ĐẦU: duyệt, sửa, thêm bớt cho phù hợp rồi coi như đã khoá.
def _dyn(name: str, *extra: str) -> list[str]:
    """
    'nhà/triều X' luôn nhận. 'thời / thời kỳ / thời đại X' chỉ nhận khi KHÔNG theo sau là tên
    riêng viết hoa: 'thời Lý' là triều đại, còn 'thời kỳ Trần Lãm' / 'thời Nguyễn Huệ' là tên người.
    """
    return [rf"(?:[Nn]hà|[Tt]riều) {name}\b",
            rf"(?:[Tt]hời kỳ|[Tt]hời đại|[Tt]hời) {name}\b(?! [A-ZĐ])", *extra]


ERA_PATTERNS: dict[str, list[str]] = {
    "Hồng Bàng - Văn Lang":  [r"Hồng Bàng", r"Văn Lang", r"Hùng Vương"],
    "Âu Lạc":                [r"Âu Lạc", r"An Dương Vương"],
    "Bắc thuộc":             [r"Bắc [Tt]huộc"],
    "nhà Ngô":               _dyn("Ngô"),
    "nhà Đinh":              _dyn("Đinh"),
    "nhà Tiền Lê":           _dyn("Tiền Lê"),
    "nhà Lý":                _dyn("Lý"),
    "nhà Trần":              _dyn("Trần"),
    "nhà Hồ":                _dyn("Hồ"),
    "nhà Hậu Lê":            _dyn("Hậu Lê", r"Lê sơ", r"Lê trung hưng"),
    "nhà Mạc":               _dyn("Mạc"),
    "nhà Lê":                _dyn("Lê"),
    "nhà Tây Sơn":           _dyn("Tây Sơn", r"(?:quân|phong trào|khởi nghĩa) Tây Sơn"),
    "nhà Nguyễn":            _dyn("Nguyễn"),
    "Pháp thuộc":            [r"Pháp thuộc", r"thực dân Pháp", r"Liên bang Đông Dương"],
    "kháng chiến chống Pháp": [r"kháng chiến chống Pháp"],
    "kháng chiến chống Mỹ":  [r"kháng chiến chống Mỹ"],
}
TOPIC_PATTERNS: dict[str, list[str]] = {
    "lễ hội":            [r"lễ hội", r"Lễ hội", r"hội làng"],
    "tín ngưỡng":        [r"tín ngưỡng", r"thờ cúng", r"thờ [A-ZĐ]", r"đền thờ"],
    "ẩm thực":           [r"ẩm thực", r"món ăn", r"nguyên liệu", r"nước chấm"],
    "nghề thủ công":     [r"làng nghề", r"nghề thủ công", r"thủ công mỹ nghệ"],
    "kiến trúc":         [r"kiến trúc", r"điêu khắc", r"mái ngói", r"tường thành"],
    "âm nhạc - trình diễn": [r"âm nhạc", r"ca trù", r"quan họ", r"hát xoan", r"dân ca", r"nhạc cụ", r"múa "],
    "trang phục":        [r"trang phục", r"y phục", r"áo dài"],
    "ngôn ngữ - chữ viết": [r"ngôn ngữ", r"chữ viết", r"chữ Nôm", r"chữ Hán", r"ngữ hệ"],
    "khảo cổ":           [r"khảo cổ", r"di chỉ"],
    "chiến tranh - quân sự": [r"chiến tranh", r"khởi nghĩa", r"quân đội", r"chiến thắng", r"kháng chiến"],
    "tôn giáo":          [r"Phật giáo", r"Công giáo", r"Nho giáo", r"Đạo giáo", r"Hồi giáo", r"Chăm Bà ni"],
    "dân tộc - cộng đồng": [r"dân tộc", r"cộng đồng"],
}
ERA_VOCAB: list[str] = list(ERA_PATTERNS)
TOPIC_VOCAB: list[str] = list(TOPIC_PATTERNS)
VOCAB_FILE = "vocab.json"
# Ngưỡng gán nhãn bằng luật: số lần khớp tối thiểu, HOẶC khớp trong LABEL_LEAD_CHARS ký tự đầu.
LABEL_MIN_COUNT_ERA = 2
LABEL_MIN_COUNT_TOPIC = 3
LABEL_LEAD_CHARS = 1000
LABEL_MAX_PER_KIND = 5          # mỗi thực thể giữ tối đa N nhãn era và N nhãn chủ đề (theo số lần khớp)
# LLM (tuỳ chọn, chạy THÊM sau luật). Mặc định tắt; cần GEMINI_API_KEY.
USE_LLM_LABELS = os.getenv("VICA_USE_LLM_LABELS", "0") == "1"
VOCAB_TOTAL_MAX = 30            # chỉ dùng khi --pilot nhờ LLM đề xuất từ vựng
LLM_CONFIDENCE_MIN = 0.6
PILOT_SIZE = 25
PILOT_MIN_DOCS = 10

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# ================= NGUỒN =================
HEADERS = {"User-Agent": "VICA-CulturalAtlas-Bot/1.0 (contact@culturalatlas.vn)"}
WIKI_API = "https://vi.wikipedia.org/w/api.php"
WIKI_REST = "https://vi.wikipedia.org/api/rest_v1"
DSVH_BASE = "https://dsvh.gov.vn"
CHINHPHU_ETHNIC_URL = (
    "https://chinhphu.vn/dan-toc/danh-sach-cac-dan-toc-viet-nam-10000494"
)
REQUEST_TIMEOUT = (10, 30)
POLITENESS_DELAY = 0.5
DSVH_EXTRA_URLS: list[str] = []

# ================= GHÉP NỘI DUNG =================
CONTENT_MATCH_MIN = 0.80
CONTENT_CONTAINMENT_MIN_TOKENS = 2
CONTENT_CONTAINMENT_SCORE = 0.90
CONTENT_ALIAS_CSV = ""          # CSV: official_name,wiki_title[,note]
# Khớp theo BAO HÀM (điểm < 1.0) chỉ được nhận khi trang tìm được vượt qua XÁC MINH:
# phần "thừa" của tên chính thức (địa phương, định ngữ) phải xuất hiện ở đoạn mở đầu trang.
# Không qua xác minh -> KHÔNG ghép, đưa vào danh sách cách ly để người duyệt.
VERIFY_LEAD_CHARS = 1500
VERIFY_EXTRA_MIN_RATIO = 0.5    # tỉ lệ token "thừa" phải có mặt (khi không có địa phương)
SUBSTRING_MERGE_MIN_TOKENS = 2  # gộp wiki->official theo chứa chuỗi con

# ================= ĐỘ PHỦ (khoá theo MÃ nguồn) =================
COVERAGE_EXPECT = {
    "dsvh_intangible": 485,
    "dsvh_special": 148,
    "dsvh_national": 3621,
    "chinhphu_ethnic": 54,
}

# ================= ĐỊNH DANH =================
SLUG_MAXLEN = 60                # cắt ở ranh giới từ, không cắt giữa số

# ================= S3 =================
S3_BUCKET = os.getenv("AWS_S3_BUCKET", "")
S3_PREFIX = os.getenv("VICA_S3_PREFIX", "processed/v2")
AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-1")
AWS_PROFILE = os.getenv("AWS_PROFILE", "default")