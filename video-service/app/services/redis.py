import json

from redis import Redis

from app.core.config import settings


def create_redis_client() -> Redis:
    """Prefer REDIS_URL (Upstash rediss://). Fall back to host/port for local Redis."""
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


redis_client = create_redis_client()

VIDEOS_LIST_CACHE_PREFIX = "videos_list:"
VIDEO_DETAIL_CACHE_PREFIX = "video:"
COMMENTS_CACHE_PREFIX = "comments:"
COMMENTS_COUNT_CACHE_PREFIX = "comments_count:"
SEARCH_CACHE_PREFIX = "search:"
LIKES_COUNT_CACHE_PREFIX = "likes_count:"
LATEST_VIDEO_CACHE_KEY = "latest_video"

LIST_VERSION_KEY = "videos_list_version"
SEARCH_VERSION_KEY = "search_version"
MOST_LIKED_VERSION_KEY = "most_liked_version"

SEARCH_CACHE_TTL = 60
DEFAULT_CACHE_TTL = 300
COMMENTS_COUNT_CACHE_TTL = 300
COUNTER_TTL = 86400  # refresh absolute counts from DB at least daily


def get_cache(key: str):
    value = redis_client.get(key)
    if value is None:
        return None
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return value


def set_cache(key: str, value, ttl: int = DEFAULT_CACHE_TTL):
    redis_client.setex(key, ttl, json.dumps(value))


def delete_cache(key: str):
    redis_client.delete(key)


def _get_version(key: str) -> str:
    return redis_client.get(key) or "0"


def _bump_version(key: str) -> int:
    return int(redis_client.incr(key))


def list_cache_key(limit: int, cursor_id, category) -> str:
    version = _get_version(LIST_VERSION_KEY)
    return f"{VIDEOS_LIST_CACHE_PREFIX}{version}:{limit}:{cursor_id}:{category}"


def search_cache_key(query: str, limit: int, cursor_id) -> str:
    version = _get_version(SEARCH_VERSION_KEY)
    return f"{SEARCH_CACHE_PREFIX}{version}:{query}:{limit}:{cursor_id}"


def most_liked_cache_key(limit: int) -> str:
    version = _get_version(MOST_LIKED_VERSION_KEY)
    return f"{VIDEOS_LIST_CACHE_PREFIX}most_liked:{version}:{limit}"


def comments_cache_key(video_id: int, limit: int, cursor_id) -> str:
    version = _get_version(f"comments_version:{video_id}")
    return f"{COMMENTS_CACHE_PREFIX}{version}:{video_id}:{limit}:{cursor_id}"


def get_counter(key: str) -> int | None:
    value = redis_client.get(key)
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def set_counter(key: str, value: int, ttl: int = COUNTER_TTL) -> None:
    redis_client.setex(key, ttl, int(value))


def incr_counter(key: str, amount: int = 1, ttl: int = COUNTER_TTL) -> int | None:
    """Atomically adjust a counter if it already exists. Returns new value or None on miss."""
    if not redis_client.exists(key):
        return None
    value = redis_client.incrby(key, amount)
    if value < 0:
        value = 0
        redis_client.set(key, 0)
    redis_client.expire(key, ttl)
    return int(value)


def get_likes_count(video_id: int) -> int | None:
    return get_counter(f"{LIKES_COUNT_CACHE_PREFIX}{video_id}")


def set_likes_count(video_id: int, value: int) -> None:
    set_counter(f"{LIKES_COUNT_CACHE_PREFIX}{video_id}", value)


def adjust_likes_count(video_id: int, delta: int) -> int | None:
    return incr_counter(f"{LIKES_COUNT_CACHE_PREFIX}{video_id}", delta)


def get_comments_count(video_id: int) -> int | None:
    return get_counter(f"{COMMENTS_COUNT_CACHE_PREFIX}{video_id}")


def set_comments_count(video_id: int, value: int) -> None:
    set_counter(f"{COMMENTS_COUNT_CACHE_PREFIX}{video_id}", value, ttl=COMMENTS_COUNT_CACHE_TTL)


def adjust_comments_count(video_id: int, delta: int) -> int | None:
    return incr_counter(
        f"{COMMENTS_COUNT_CACHE_PREFIX}{video_id}",
        delta,
        ttl=COMMENTS_COUNT_CACHE_TTL,
    )


def invalidate_videos_list_cache():
    """Bump list/search generations so old keys expire via TTL (no SCAN)."""
    _bump_version(LIST_VERSION_KEY)
    _bump_version(SEARCH_VERSION_KEY)
    _bump_version(MOST_LIKED_VERSION_KEY)
    delete_cache(LATEST_VIDEO_CACHE_KEY)


def invalidate_most_liked_cache():
    _bump_version(MOST_LIKED_VERSION_KEY)


def invalidate_video_detail_cache(video_id: int):
    """Drop shared video payload only (not list/search caches)."""
    delete_cache(f"{VIDEO_DETAIL_CACHE_PREFIX}{video_id}")


def invalidate_likes_count(video_id: int):
    delete_cache(f"{LIKES_COUNT_CACHE_PREFIX}{video_id}")


def invalidate_comments_cache(video_id: int):
    """Bump per-video comments generation; drop cached count for rehydrate."""
    _bump_version(f"comments_version:{video_id}")
    delete_cache(f"{COMMENTS_COUNT_CACHE_PREFIX}{video_id}")


def invalidate_engagement_caches(video_id: int):
    """Like/unlike: refresh detail + ranking, keep homepage/search warm."""
    invalidate_video_detail_cache(video_id)
    invalidate_most_liked_cache()


def invalidate_video_caches(video_id: int):
    """Structural change (upload/delete/transcode): lists + this video."""
    invalidate_videos_list_cache()
    invalidate_video_detail_cache(video_id)
    invalidate_likes_count(video_id)
