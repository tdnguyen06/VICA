import argparse
import csv
import re
import sys
from collections import Counter
from pathlib import Path

import config as C

csv.field_size_limit(min(sys.maxsize, 10_000_000))

JUNK_NAME_RX = re.compile(
    r"^(?:"
    r"\d{1,2}\s+tháng\s+\d{1,2}(?:\s+năm\s+\d{3,4})?"
    r"|tháng\s+\d{1,2}(?:\s+năm\s+\d{3,4})?"
    r"|(?:năm\s+)?\d{1,4}(?:\s+tcn)?"
    r"|thế\s*kỷ\s*(?:thứ\s*)?[ivx\d]+"
    r"|thập\s*(?:niên|kỷ)\s*\d{2,4}s?"
    r"|ngày\s+\d{1,2}\s+tháng\s+\d{1,2}"
    r")$",
    re.IGNORECASE,
)

JUNK_FILE_RX = re.compile(
    r"^vica-(?:\d{1,2}-thang-\d{1,2}|thang-\d{1,2}|nam-\d{1,4}|the-ky-[a-z0-9-]+)-[0-9a-f]{10}\.md$"
)


def read_csv(path: Path) -> tuple[list[str], list[dict]]:
    if not path.exists():
        return [], []
    with open(path, encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        return list(r.fieldnames or []), list(r)


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]):
    if not fieldnames:
        return
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        if rows:
            w.writerows(rows)


def count_lines(path: Path) -> int:
    if not path.exists():
        return 0
    return len(path.read_text(encoding="utf-8", errors="ignore").splitlines())


def calc_province_stats(manifest_rows: list[dict]) -> tuple[Counter, Counter]:
    total, rich = Counter(), Counter()
    for r in manifest_rows:
        provs = [p.strip() for p in (r.get("dia_phuong_hien_hanh") or "").split(";") if p.strip()]
        for p in provs:
            total[p] += 1
            if r.get("content_tier") == "rich":
                rich[p] += 1
    return total, rich


def rebuild_province_coverage(outdir: Path, manifest_rows: list[dict]):
    total, rich = calc_province_stats(manifest_rows)
    lines = ["province,entity_count,rich_count,dat_coverage,dat_usability"]
    for p in C.PROVINCE_CURRENT_ENUM:
        t, rc = total.get(p, 0), rich.get(p, 0)
        lines.append(f"{p},{t},{rc},{t >= C.TARGET_PER_PROVINCE},{rc >= C.TARGET_RICH_PER_PROVINCE}")
    with open(outdir / "_province_coverage.csv", "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")


def s3_client():
    import boto3
    if C.AWS_PROFILE and C.AWS_PROFILE != "default":
        return boto3.Session(profile_name=C.AWS_PROFILE, region_name=C.AWS_REGION).client("s3")
    return boto3.client("s3", region_name=C.AWS_REGION)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-lines", type=int, default=30,
                    help="Xóa file .md có số dòng < N (mặc định: 30)")
    ap.add_argument("--delete", action="store_true", help="Thực thi xóa (mặc định chỉ xem trước)")
    ap.add_argument("--s3", action="store_true", help="Xóa file bị lọc trên S3 và upload lại 5 CSV")
    ap.add_argument("--extra-ids", type=str, default="",
                    help="Xóa thêm entity_id cụ thể, cách nhau bởi dấu phẩy")
    args = ap.parse_args()

    outdir = Path(C.OUTPUT_DIR)
    ent_dir = outdir / "entities"
    m_fields, m_rows = read_csv(outdir / "_manifest.csv")
    if not m_rows:
        print(f"Không tìm thấy dữ liệu trong {outdir / '_manifest.csv'}")
        return

    extra = {x.removesuffix(".md").strip() for x in args.extra_ids.split(",") if x.strip()}
    junk_ids: set[str] = set()
    reason_cnt = Counter()
    samples: list[tuple[str, str, str]] = []

    for r in m_rows:
        eid = r["entity_id"]
        name = (r.get("official_name") or "").strip()
        fpath = ent_dir / f"{eid}.md"
        n_lines = count_lines(fpath)

        why = []
        if eid in extra:
            why.append("extra-ids")
        if JUNK_NAME_RX.match(name) or JUNK_FILE_RX.match(f"{eid}.md"):
            why.append("ngày/tháng rác")
        if n_lines < args.min_lines:
            why.append(f"{n_lines} dòng < {args.min_lines}")

        if why:
            junk_ids.add(eid)
            tag = ", ".join(why)
            for w in why:
                reason_cnt[w.split(" <")[0] if "<" in w else w] += 1
            if len(samples) < 30:
                samples.append((eid, name, tag))

    orphan_files = []
    if ent_dir.exists():
        for p in ent_dir.glob("*.md"):
            if p.stem in junk_ids:
                continue
            if p.stem in extra or JUNK_FILE_RX.match(p.name) or count_lines(p) < args.min_lines:
                orphan_files.append(p)

    kept_rows = [r for r in m_rows if r["entity_id"] not in junk_ids]
    total_prov, _ = calc_province_stats(kept_rows)
    ok_cov = sum(1 for p in C.PROVINCE_CURRENT_ENUM if total_prov.get(p, 0) >= C.TARGET_PER_PROVINCE)

    print(f"Tổng ban đầu: {len(m_rows)} thực thể")
    print(f"Sẽ XÓA: {len(junk_ids)} thực thể trong manifest"
          + (f" + {len(orphan_files)} file mồ côi" if orphan_files else ""))
    print(f"CÒN LẠI: {len(kept_rows)} thực thể ({ok_cov}/34 tỉnh đạt >= {C.TARGET_PER_PROVINCE})")
    print("\n30 mẫu đầu bị xóa:")
    for eid, name, tag in samples:
        print(f"  - {eid}  |  {name}  [{tag}]")

    if not args.delete:
        print("\n[CHẾ ĐỘ XEM TRƯỚC] Chưa xóa gì cả. Chạy thêm --delete để xóa ở local"
              " (hoặc --delete --s3 để cập nhật luôn lên S3).")
        return

    deleted_files = 0
    for eid in junk_ids:
        p = ent_dir / f"{eid}.md"
        if p.exists():
            p.unlink()
            deleted_files += 1
    for p in orphan_files:
        p.unlink()
        deleted_files += 1

    write_csv(outdir / "_manifest.csv", m_fields, kept_rows)
    for csv_name in ("_embed_manifest.csv", "_aliases.csv", "_labels.csv"):
        cpath = outdir / csv_name
        fields, rows = read_csv(cpath)
        if fields:
            write_csv(cpath, fields, [r for r in rows if r["entity_id"] not in junk_ids])

    rebuild_province_coverage(outdir, kept_rows)
    print(f"\n✔ Đã xóa {deleted_files} file .md và cập nhật lại toàn bộ CSV.")

    if args.s3:
        if not C.S3_BUCKET:
            print("✗ Chưa có AWS_S3_BUCKET trong .env — bỏ qua S3.")
            return
        client = s3_client()
        prefix = C.S3_PREFIX.strip("/")
        del_keys = [{"Key": f"{prefix}/entities/{eid}.md"} for eid in junk_ids]
        del_keys += [{"Key": f"{prefix}/entities/{p.name}"} for p in orphan_files]
        for i in range(0, len(del_keys), 1000):
            client.delete_objects(Bucket=C.S3_BUCKET, Delete={"Objects": del_keys[i:i + 1000]})
        for csv_name in ("_manifest.csv", "_embed_manifest.csv", "_aliases.csv",
                         "_labels.csv", "_province_coverage.csv"):
            p = outdir / csv_name
            if p.exists():
                client.put_object(Bucket=C.S3_BUCKET, Key=f"{prefix}/{csv_name}",
                                  Body=p.read_bytes(), ContentType="text/csv; charset=utf-8")
        print(f"✔ Đã xóa {len(del_keys)} file trên S3 và upload lại 5 CSV lên s3://{C.S3_BUCKET}/{prefix}/")


if __name__ == "__main__":
    main()