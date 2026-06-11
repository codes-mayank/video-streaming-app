import boto3
from botocore.client import Config

from app.core.config import (
    settings,
)

ALLOWED_PROFILE_IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
}

def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION or "auto",
        config=Config(signature_version="s3v4"),
    )


def generate_presigned_upload_url(file_key: str, content_type: str) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.AWS_BUCKET_NAME,
            "Key": file_key,
            "ContentType": content_type,
        },
        ExpiresIn=settings.AWS_PRESIGNED_EXPIRES_SECONDS,
    )

def check_object_exists(file_key: str) -> bool:
    client = get_s3_client()
    try:
        client.head_object(Bucket=settings.AWS_BUCKET_NAME, Key=file_key)
        return True
    except Exception:
        return False

def generate_presigned_download_url(file_key: str, expires_seconds: int = 900) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_BUCKET_NAME, "Key": file_key},
        ExpiresIn=expires_seconds,
    )

def build_profile_photo_key(user_id: str, content_type: str) -> str:
    ext = ALLOWED_PROFILE_IMAGE_TYPES[content_type]
    return f"profile-photos/{user_id}/{uuid4()}.{ext}"


def build_public_url(file_key: str) -> str:
    if settings.AWS_PUBLIC_BASE_URL:
        return f"{settings.AWS_PUBLIC_BASE_URL.rstrip('/')}/{file_key}"
    return generate_presigned_download_url(file_key, expires_seconds=86400*7)

def is_supported_image_type(content_type: str) -> bool:
    return content_type in ALLOWED_PROFILE_IMAGE_TYPES