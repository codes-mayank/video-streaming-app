"""Reconcile engagement counters in Redis after DB writes."""

from __future__ import annotations

from redis import Redis
from sqlalchemy import func

from app.core.config import settings
from app.models import VideoComment, VideoLike

LIKES_COUNT_PREFIX = "likes_count:"
COMMENTS_COUNT_PREFIX = "comments_count:"
MOST_LIKED_VERSION_KEY = "most_liked_version"
VIDEO_DETAIL_PREFIX = "video:"
COUNTER_TTL = 86400

_redis: Redis | None = None


def create_redis_client() -> Redis:
    """
    Prefer REDIS_URL (Upstash: rediss://default:<TOKEN>@<host>:6379).
    Falls back to REDIS_HOST / PORT / DB / PASSWORD / SSL for local Redis.
    """
    common = {
        "decode_responses": True,
        "socket_connect_timeout": settings.REDIS_CONNECT_TIMEOUT,
        "socket_timeout": settings.REDIS_SOCKET_TIMEOUT,
    }
    url = (settings.REDIS_URL or "").strip()
    if url:
        return Redis.from_url(url, **common)

    password = (settings.REDIS_PASSWORD or "").strip() or None
    return Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        password=password,
        ssl=bool(settings.REDIS_SSL),
        **common,
    )


def get_redis() -> Redis | None:
    global _redis
    if _redis is not None:
        return _redis
    try:
        client = create_redis_client()
        client.ping()
        _redis = client
        return _redis
    except Exception as exc:
        print(f"[statistics] redis unavailable, skipping counter sync: {exc}", flush=True)
        return None


def reconcile_engagement_caches(db, *, like_video_ids: set[int], comment_video_ids: set[int]) -> None:
    client = get_redis()
    if client is None:
        return

    try:
        if like_video_ids:
            for video_id in like_video_ids:
                count = (
                    db.query(func.count(VideoLike.user_id))
                    .filter(VideoLike.video_id == video_id)
                    .scalar()
                    or 0
                )
                client.setex(f"{LIKES_COUNT_PREFIX}{video_id}", COUNTER_TTL, int(count))
                client.delete(f"{VIDEO_DETAIL_PREFIX}{video_id}")
            client.incr(MOST_LIKED_VERSION_KEY)

        for video_id in comment_video_ids:
            count = (
                db.query(func.count(VideoComment.id))
                .filter(VideoComment.video_id == video_id)
                .scalar()
                or 0
            )
            client.setex(f"{COMMENTS_COUNT_PREFIX}{video_id}", COUNTER_TTL, int(count))
            client.incr(f"comments_version:{video_id}")
            client.delete(f"{VIDEO_DETAIL_PREFIX}{video_id}")
    except Exception as exc:
        print(f"[statistics] redis counter sync failed: {exc}", flush=True)
