import re
import time
from unicodedata import normalize

from app.services.s3 import ALLOWED_VIDEO_CONTENT_TYPES


def slugify(segment: str, max_len: int = 120) -> str:
    s = normalize("NFKD", segment).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-zA-Z0-9._-]+", "_", s).strip("._-")
    return (s or "video")[:max_len]


def safe_user_id_for_path(user_id: str) -> str:
    return slugify(str(user_id), max_len=64)


def extension_for_content_type(content_type: str) -> str:
    ext = ALLOWED_VIDEO_CONTENT_TYPES.get(content_type)
    if not ext:
        raise ValueError("Unsupported content type.")
    return ext


def build_video_object_keys(user_id: str, user_video_name: str, content_type: str) -> tuple[str, str, str]:
    """
    Returns (raw_object_key, storage_base_prefix, video_basename).

    Layout:
      {storage_base_prefix}/raw/{video_basename}.{ext}
      {storage_base_prefix}/720p/... (written by transcoder)
    """
    basename = slugify(user_video_name, max_len=200)
    uid = safe_user_id_for_path(user_id)
    ext = extension_for_content_type(content_type)
    ts = int(time.time() * 1000)
    folder = f"{ts}_{basename}"
    storage_base_prefix = f"videos/user_{uid}/{folder}"
    raw_key = f"{storage_base_prefix}/raw/{basename}.{ext}"
    return raw_key, storage_base_prefix, basename
