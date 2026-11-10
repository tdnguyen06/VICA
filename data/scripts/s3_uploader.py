"""
S3 In-Memory Data Pipeline Utility for Vietnam Cultural Atlas (VICA)
Hỗ trợ stream và đẩy dữ liệu TRỰC TIẾP lên AWS S3 từ bộ nhớ (RAM),
HOÀN TOÀN KHÔNG LƯU FILE TRUNG GIAN TRÊN MÁY TÍNH CỤC BỘ.
"""

import os
import sys
import json
import io
import mimetypes
from pathlib import Path
from dotenv import load_dotenv
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from tqdm import tqdm

# Tự động tìm và load file .env từ thư mục gốc dự án (d:/VICA/.env)
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = ROOT_DIR / ".env"

if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
else:
    load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-1")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET") or os.getenv("DATALAKE_BUCKET")
AWS_PROFILE = os.getenv("AWS_PROFILE")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

# Thêm vào đầu file, sau khi khai báo biến môi trường:
_S3_CLIENT_CACHE = {}

def get_s3_client():
    """Khởi tạo S3 client (có cache để tái sử dụng)."""
    cache_key = f"{AWS_PROFILE}:{AWS_REGION}"
    if cache_key in _S3_CLIENT_CACHE:
        return _S3_CLIENT_CACHE[cache_key]
    
    if AWS_PROFILE:
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
        client = boto3.client("s3", region_name=AWS_REGION)
    
    _S3_CLIENT_CACHE[cache_key] = client
    return client

def get_s3_client():
    """
    Khởi tạo S3 client linh hoạt:
    1. Ưu tiên AWS_PROFILE nếu có (chuẩn bảo mật AWS)
    2. Dùng AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY nếu có
    3. Fallback sang AWS credentials mặc định
    """
    if AWS_PROFILE:
        session = boto3.Session(profile_name=AWS_PROFILE, region_name=AWS_REGION)
        return session.client("s3")
    elif AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        return boto3.client(
            "s3",
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        )
    else:
        return boto3.client("s3", region_name=AWS_REGION)


def _resolve_bucket(bucket: str = None) -> str:
    target_bucket = bucket or AWS_S3_BUCKET
    if not target_bucket:
        raise ValueError("Chưa thiết lập AWS_S3_BUCKET trong .env hoặc tham số hàm.")
    return target_bucket


def _normalize_s3_key(key: str) -> str:
    return key.replace("\\", "/").lstrip("/")


# ==============================================================================
# IN-MEMORY UPLOAD (KHÔNG LƯU Ổ ĐĨA CỤC BỘ - ĐẨY THẲNG LÊN S3)
# ==============================================================================

def upload_bytes(data: bytes, s3_key: str, content_type: str = "application/octet-stream", bucket: str = None) -> str:
    """
    Đẩy trực tiếp chuỗi bytes từ RAM lên S3 (Zero Local Storage).
    """
    target_bucket = _resolve_bucket(bucket)
    s3_key = _normalize_s3_key(s3_key)
    client = get_s3_client()

    client.put_object(
        Bucket=target_bucket,
        Key=s3_key,
        Body=data,
        ContentType=content_type,
    )

    s3_uri = f"s3://{target_bucket}/{s3_key}"
    print(f"✔ [In-Memory] Đã đẩy lên S3: {s3_uri} ({len(data)} bytes)")
    return s3_uri


def upload_json(data: dict | list, s3_key: str, indent: int = 2, bucket: str = None) -> str:
    """
    Serialize dictionary/list sang JSON string trong RAM và đẩy thẳng lên S3.
    """
    json_bytes = json.dumps(data, ensure_ascii=False, indent=indent).encode("utf-8")
    return upload_bytes(
        data=json_bytes,
        s3_key=s3_key,
        content_type="application/json; charset=utf-8",
        bucket=bucket,
    )


def upload_dataframe(df, s3_key: str, format: str = "parquet", bucket: str = None, **kwargs) -> str:
    """
    Ghi DataFrame (pandas hoặc polars) trực tiếp vào buffer RAM rồi đẩy lên S3.
    :param format: 'parquet', 'csv', hoặc 'json'
    """
    buffer = io.BytesIO()
    fmt = format.lower()

    if fmt == "parquet":
        df.to_parquet(buffer, index=False, **kwargs)
        content_type = "application/vnd.apache.parquet"
    elif fmt == "csv":
        df.to_csv(buffer, index=False, **kwargs)
        content_type = "text/csv; charset=utf-8"
    elif fmt == "json":
        df.to_json(buffer, orient="records", force_ascii=False, **kwargs)
        content_type = "application/json; charset=utf-8"
    else:
        raise ValueError(f"Định dạng chưa hỗ trợ: {format}. Hãy dùng 'parquet', 'csv', hoặc 'json'.")

    buffer.seek(0)
    return upload_bytes(
        data=buffer.getvalue(),
        s3_key=s3_key,
        content_type=content_type,
        bucket=bucket,
    )


# ==============================================================================
# IN-MEMORY READ (ĐỌC TRỰC TIẾP TỪ S3 VÀO RAM - KHÔNG TẢI VỀ Ổ ĐĨA)
# ==============================================================================

def read_bytes_from_s3(s3_key: str, bucket: str = None) -> bytes:
    """Đọc dữ liệu nhị phân từ S3 trực tiếp vào bộ nhớ."""
    target_bucket = _resolve_bucket(bucket)
    s3_key = _normalize_s3_key(s3_key)
    client = get_s3_client()

    response = client.get_object(Bucket=target_bucket, Key=s3_key)
    return response["Body"].read()


def read_json_from_s3(s3_key: str, bucket: str = None) -> dict | list:
    """Đọc và parse file JSON từ S3 trực tiếp trong bộ nhớ."""
    data_bytes = read_bytes_from_s3(s3_key, bucket=bucket)
    return json.loads(data_bytes.decode("utf-8"))


def read_dataframe_from_s3(s3_key: str, format: str = "parquet", bucket: str = None, **kwargs):
    """
    Đọc dữ liệu từ S3 nạp trực tiếp vào Pandas DataFrame.
    """
    import pandas as pd
    data_bytes = read_bytes_from_s3(s3_key, bucket=bucket)
    buffer = io.BytesIO(data_bytes)
    fmt = format.lower()

    if fmt == "parquet":
        return pd.read_parquet(buffer, **kwargs)
    elif fmt == "csv":
        return pd.read_csv(buffer, **kwargs)
    elif fmt == "json":
        return pd.read_json(buffer, **kwargs)
    else:
        raise ValueError(f"Định dạng chưa hỗ trợ: {format}")


def list_s3_files(prefix: str = "", bucket: str = None) -> list[str]:
    """Liệt kê danh sách các object keys trên S3 theo prefix."""
    target_bucket = _resolve_bucket(bucket)
    prefix = _normalize_s3_key(prefix)
    client = get_s3_client()

    paginator = client.get_paginator("list_objects_v2")
    keys = []
    for page in paginator.paginate(Bucket=target_bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            keys.append(obj["Key"])
    return keys


# ==============================================================================
# LEGACY FILE UTILS (NẾU CẦN UPLOAD FILE CÓ SẴN)
# ==============================================================================

def upload_file(local_path: str | Path, s3_key: str = None, bucket: str = None) -> str:
    """Upload một file có sẵn trên máy lên S3."""
    file_path = Path(local_path).resolve()
    if not file_path.is_file():
        raise FileNotFoundError(f"Không tìm thấy file: {local_path}")

    target_bucket = _resolve_bucket(bucket)
    if not s3_key:
        s3_key = file_path.name

    s3_key = _normalize_s3_key(s3_key)
    content_type, _ = mimetypes.guess_type(str(file_path))
    content_type = content_type or "application/octet-stream"

    client = get_s3_client()
    client.upload_file(
        Filename=str(file_path),
        Bucket=target_bucket,
        Key=s3_key,
        ExtraArgs={"ContentType": content_type},
    )

    s3_uri = f"s3://{target_bucket}/{s3_key}"
    print(f"✔ Đã upload: {file_path.name} -> {s3_uri}")
    return s3_uri


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="In-Memory S3 Pipeline Utility for VICA")
    parser.add_argument("--list", type=str, nargs="?", const="", help="Liệt kê danh sách file trên S3 theo prefix")
    parser.add_argument("--file", type=str, help="Upload file cục bộ lên S3")
    parser.add_argument("--prefix", type=str, default="", help="Prefix trên S3")
    parser.add_argument("--bucket", type=str, default=None, help="Tên bucket")

    args = parser.parse_args()

    try:
        if args.list is not None:
            files = list_s3_files(prefix=args.list, bucket=args.bucket)
            print(f"📁 Tìm thấy {len(files)} files trên s3://{_resolve_bucket(args.bucket)}/{args.list}:")
            for f in files:
                print(f"  - {f}")
        elif args.file:
            upload_file(args.file, s3_key=args.prefix, bucket=args.bucket)
        else:
            parser.print_help()
    except Exception as e:
        print(f"❌ Lỗi: {e}", file=sys.stderr)
        sys.exit(1)
