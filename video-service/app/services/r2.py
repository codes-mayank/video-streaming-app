from uuid import uuid4

import boto3
from botocore.client import Config

from app.core.config import (
    effective_r2_access_key_id,
    effective_r2_endpoint_url,
    effective_r2_region,
    effective_r2_secret_access_key,
    settings,
)


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=effective_r2_endpoint_url(),
        aws_access_key_id=effective_r2_access_key_id(),
        aws_secret_access_key=effective_r2_secret_access_key(),
        region_name=effective_r2_region(),
        config=Config(signature_version="s3v4"),
    )


def build_object_key(content_type: str) -> str:
    ext_map = {
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/quicktime": "mov",
    }
    ext = ext_map.get(content_type, "bin")
    return f"videos/{uuid4()}.{ext}"


def generate_presigned_upload_url(object_key: str, content_type: str) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.R2_BUCKET_NAME,
            "Key": object_key,
            "ContentType": content_type,
        },
        ExpiresIn=settings.R2_PRESIGNED_EXPIRES_SECONDS,
    )


def generate_presigned_download_url(object_key: str, expires_seconds: int = 900) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.R2_BUCKET_NAME, "Key": object_key},
        ExpiresIn=expires_seconds,
    )


def check_object_exists(object_key: str) -> bool:
    client = get_s3_client()
    try:
        client.head_object(Bucket=settings.R2_BUCKET_NAME, Key=object_key)
        return True
    except Exception:
        return False
