"""
VICA — Gán nhãn.

domain  : từ bảng ánh xạ (config), KHÔNG dùng LLM.
era/chủ đề: TỪ VỰNG ĐÓNG + LUẬT NHẬN DIỆN TƯỜNG MINH trong config (ERA_PATTERNS / TOPIC_PATTERNS).
            Bằng chứng = câu nguyên văn chứa chỗ khớp, nên kiểm tra được bằng phép chứa chuỗi con.
            Không cần API key. Kết quả lặp lại được (cùng input -> cùng nhãn).
LLM (tuỳ chọn, VICA_USE_LLM_LABELS=1): chạy THÊM sau luật, chỉ được chọn trong từ vựng,
            bằng chứng không khớp nguyên văn -> loại nhãn.

LÝ DO ĐỔI (v3 -> v4): bản cũ không có GEMINI_API_KEY nên era/chủ đề = null cho 100% thực thể,
còn bộ regex dự phòng sinh từ vựng rác ('nhà D67', 'nhà Tiên', 'nhà Châu').
"""
import json
import re
import time

import requests

import config as C
from processing import nfc

LAST_LLM_ERROR: str = ""        # pipeline đọc để báo cáo (không nuốt lỗi im lặng)


# ================= DOMAIN (không LLM) =================

def map_domain(loai_hinh: str | None,
               source_categories: list[str]) -> tuple[list[str], str]:
    if loai_hinh and loai_hinh in C.DOMAIN_BY_LOAI_HINH:
        return list(C.DOMAIN_BY_LOAI_HINH[loai_hinh]), "loại hình chính thức"
    domains = []
    for sc in source_categories:
        for d in C.DOMAIN_BY_SOURCE_CATEGORY.get(sc, []):
            if d not in domains:
                domains.append(d)
    if domains:
        return domains, "phân loại của nguồn (loại hình = null)"
    return [], "không xác định"


def match_loai_hinh(raw: str | None) -> tuple[str | None, str | None]:
    """Khớp NGUYÊN VĂN với enum (sau chuẩn hoá khoảng trắng). Ngoài enum -> None."""
    if not raw:
        return None, None
    v = re.sub(r"\s+", " ", nfc(raw)).strip()
    if v in C.LOAI_HINH_ENUM:
        return v, None
    return None, v


# ================= LUẬT TƯỜNG MINH =================

_RX_CACHE: dict[str, list[re.Pattern]] = {}


def _compiled(value: str, patterns: list[str]) -> list[re.Pattern]:
    key = value + "\x00" + "\x00".join(patterns)
    if key not in _RX_CACHE:
        _RX_CACHE[key] = [re.compile(p) for p in patterns]
    return _RX_CACHE[key]


def _evidence_window(text: str, start: int, end: int, max_chars: int = 240) -> str:
    """Câu chứa chỗ khớp, cắt từ CHÍNH văn bản gốc (nên luôn là chuỗi con nguyên văn)."""
    lo = max(text.rfind(".", 0, start), text.rfind("\n", 0, start)) + 1
    hi_dot = text.find(".", end)
    hi_nl = text.find("\n", end)
    cands = [x for x in (hi_dot, hi_nl) if x != -1]
    hi = (min(cands) + 1) if cands else len(text)
    snippet = text[lo:hi].strip()
    if len(snippet) > max_chars:                       # câu quá dài -> cửa sổ quanh chỗ khớp
        a = max(lo, start - max_chars // 2)
        b = min(hi, end + max_chars // 2)
        snippet = text[a:b].strip()
    return snippet


def label_by_rules(content: str) -> list[dict]:
    """
    era    : nhận khi khớp >= LABEL_MIN_COUNT_ERA lần, HOẶC khớp trong LABEL_LEAD_CHARS ký tự đầu.
    chủ đề : nhận khi khớp >= LABEL_MIN_COUNT_TOPIC lần (chủ đề chung chung nên ngưỡng cao hơn).
    Mỗi loại giữ tối đa LABEL_MAX_PER_KIND nhãn có số lần khớp cao nhất.
    """
    if not content:
        return []
    text = nfc(content)
    out = []
    for kind, patterns_by_value, min_count, lead_ok in (
        ("era", C.ERA_PATTERNS, C.LABEL_MIN_COUNT_ERA, True),
        ("chủ đề", C.TOPIC_PATTERNS, C.LABEL_MIN_COUNT_TOPIC, False),
    ):
        found = []
        for value, patterns in patterns_by_value.items():
            first, count = None, 0
            for rx in _compiled(value, patterns):
                for m in rx.finditer(text):
                    count += 1
                    if first is None or m.start() < first.start():
                        first = m
            if not count:
                continue
            in_lead = first.start() < C.LABEL_LEAD_CHARS
            if count >= min_count or (lead_ok and in_lead):
                found.append((count, value, first))
        found.sort(key=lambda x: (-x[0], x[1]))
        for count, value, m in found[: C.LABEL_MAX_PER_KIND]:
            out.append({
                "kind": kind, "value": value,
                "evidence": _evidence_window(text, m.start(), m.end()),
                "confidence": round(min(0.95, 0.5 + 0.1 * count), 2),
                "method": "rule", "count": count,
            })
    return out


# ================= LLM (tuỳ chọn) =================

def _llm_json(prompt: str) -> dict | list | None:
    global LAST_LLM_ERROR
    if not C.GEMINI_API_KEY:
        LAST_LLM_ERROR = "Chưa có GEMINI_API_KEY"
        return None
    url = ("https://generativelanguage.googleapis.com/v1beta/models/"
           f"{C.GEMINI_MODEL}:generateContent")
    # Khoá đặt trong HEADER, không nằm trên URL (URL dễ bị lộ trong log/traceback).
    headers = {"x-goog-api-key": C.GEMINI_API_KEY}
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0, "responseMimeType": "application/json"}}
    for attempt in range(3):
        try:
            r = requests.post(url, headers=headers, json=body, timeout=C.REQUEST_TIMEOUT)
            if r.status_code != 200:
                LAST_LLM_ERROR = f"HTTP {r.status_code} (model={C.GEMINI_MODEL}): {r.text[:200]}"
                time.sleep(2 * (attempt + 1))
                continue
            txt = r.json()["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(txt)
        except Exception as e:
            LAST_LLM_ERROR = f"{type(e).__name__}: {e}"
            time.sleep(2 * (attempt + 1))
    return None


def _norm_for_match(s: str) -> str:
    return re.sub(r"\s+", " ", nfc(s)).strip()


def extract_era_topic_llm(content: str, era_vocab: list[str],
                          topic_vocab: list[str]) -> tuple[list[dict], list[str]]:
    if not content or not C.GEMINI_API_KEY:
        return [], []
    window = content[:12000]
    prompt = f"""Bạn trích nhãn cho tư liệu văn hóa Việt Nam. TUYỆT ĐỐI không thêm kiến thức ngoài văn bản.

TỪ VỰNG era (chỉ được chọn trong danh sách này): {json.dumps(era_vocab, ensure_ascii=False)}
TỪ VỰNG chủ đề (chỉ được chọn trong danh sách này): {json.dumps(topic_vocab, ensure_ascii=False)}

Yêu cầu:
- Mỗi nhãn phải kèm "evidence": MỘT đoạn TRÍCH NGUYÊN VĂN từ văn bản dưới đây (sao chép chính xác từng ký tự, không sửa, không rút gọn).
- "confidence": số thực 0..1.
- Không có bằng chứng rõ ràng thì KHÔNG trả nhãn đó.
- Chỉ trả JSON: {{"labels":[{{"kind":"era","value":"...","evidence":"...","confidence":0.0}}]}}
  kind chỉ được là "era" hoặc "chủ đề".

VĂN BẢN:
\"\"\"{window}\"\"\"
"""
    data = _llm_json(prompt)
    if not isinstance(data, dict):
        return [], [f"LLM không trả JSON hợp lệ ({LAST_LLM_ERROR})."]

    hay = _norm_for_match(window)
    labels, rejected = [], []
    for it in data.get("labels", []):
        kind = it.get("kind")
        val = nfc(str(it.get("value", ""))).strip()
        ev = nfc(str(it.get("evidence", ""))).strip()
        try:
            conf = float(it.get("confidence", 0))
        except (TypeError, ValueError):
            conf = 0.0
        vocab = era_vocab if kind == "era" else topic_vocab if kind == "chủ đề" else []
        if val not in vocab:
            rejected.append(f"Nhãn «{val}» ngoài từ vựng -> loại.")
            continue
        if not ev or _norm_for_match(ev) not in hay:
            rejected.append(f"Nhãn «{val}»: bằng chứng không có nguyên văn trong nguồn -> loại.")
            continue
        if conf < C.LLM_CONFIDENCE_MIN:
            rejected.append(f"Nhãn «{val}»: tin cậy {conf:.2f} < {C.LLM_CONFIDENCE_MIN} -> bỏ.")
            continue
        labels.append({"kind": kind, "value": val, "evidence": ev,
                       "confidence": round(conf, 2), "method": "llm", "count": 0})
    return labels, rejected


def extract_era_topic(content: str, era_vocab: list[str],
                      topic_vocab: list[str]) -> tuple[list[dict], list[str]]:
    """Luật trước (luôn chạy). LLM chỉ BỔ SUNG nhãn mà luật chưa có, và chỉ khi được bật."""
    labels = [x for x in label_by_rules(content)
              if x["value"] in (era_vocab if x["kind"] == "era" else topic_vocab)]
    rejected: list[str] = []
    if C.USE_LLM_LABELS:
        extra, rejected = extract_era_topic_llm(content, era_vocab, topic_vocab)
        have = {(x["kind"], x["value"]) for x in labels}
        labels += [x for x in extra if (x["kind"], x["value"]) not in have]
    return labels, rejected


# ================= ĐỀ XUẤT TỪ VỰNG (--pilot, cần LLM) =================

def propose_vocab(contents: list[str]) -> tuple[list[str], list[str]]:
    """Chỉ ĐỀ XUẤT để người duyệt rồi đưa vào config. Không tự khoá, không tự áp dụng."""
    joined = "\n\n---\n\n".join(c[:3000] for c in contents[:C.PILOT_SIZE])
    prompt = f"""Từ các tư liệu văn hóa/lịch sử/ẩm thực Việt Nam dưới đây, đề xuất bộ nhãn ĐÓNG.

Trả JSON: {{"era":[...],"chu_de":[...]}}
- era: thời kỳ/triều đại/giai đoạn CÓ THẬT trong tư liệu (dạng "nhà Lê", "Pháp thuộc").
  KHÔNG đưa mô tả kiến trúc hay danh từ thường.
- chu_de: chủ đề nội dung có thật trong tư liệu.
- Tổng số era + chu_de <= {C.VOCAB_TOTAL_MAX}. Không trùng nghĩa. Tiếng Việt, ngắn gọn.

TƯ LIỆU:
\"\"\"{joined[:60000]}\"\"\"
"""
    data = _llm_json(prompt)
    if not isinstance(data, dict):
        return [], []
    era = [nfc(x).strip() for x in data.get("era", []) if nfc(x).strip()]
    topic = [nfc(x).strip() for x in data.get("chu_de", []) if nfc(x).strip()]
    budget = C.VOCAB_TOTAL_MAX
    era = era[: max(1, budget // 2)]
    return era, topic[: budget - len(era)]