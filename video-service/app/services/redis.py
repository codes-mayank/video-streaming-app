from redis import Redis
import json

redis_client = Redis(
    host="localhost",
    port=6379,
    decode_responses=True,
)

VIDEOS_LIST_CACHE_PREFIX = "videos_list:"
VIDEO_DETAIL_CACHE_PREFIX = "video:"
COMMENTS_CACHE_PREFIX = "comments:"
SEARCH_CACHE_PREFIX = "search:"
LIKES_COUNT_CACHE_PREFIX = "likes_count:"
LATEST_VIDEO_CACHE_KEY = "latest_video"

SEARCH_CACHE_TTL = 60
DEFAULT_CACHE_TTL = 300


def get_cache(key: str):
    value = redis_client.get(key)
    return json.loads(value) if value else None


def set_cache(key: str, value, ttl: int = DEFAULT_CACHE_TTL):
    redis_client.setex(key, ttl, json.dumps(value))


def delete_cache(key: str):
    redis_client.delete(key)


def delete_cache_pattern(pattern: str):
    keys = list(redis_client.scan_iter(match=pattern, count=100))
    if keys:
        redis_client.delete(*keys)


def invalidate_videos_list_cache():
    delete_cache_pattern(f"{VIDEOS_LIST_CACHE_PREFIX}*")
    delete_cache(LATEST_VIDEO_CACHE_KEY)
    delete_cache_pattern(f"{SEARCH_CACHE_PREFIX}*")


def invalidate_video_detail_cache(video_id: int):
    delete_cache(f"{VIDEO_DETAIL_CACHE_PREFIX}{video_id}")
    delete_cache(f"{LIKES_COUNT_CACHE_PREFIX}{video_id}")


def invalidate_comments_cache(video_id: int):
    delete_cache_pattern(f"{COMMENTS_CACHE_PREFIX}{video_id}:*")


def invalidate_video_caches(video_id: int):
    """Invalidate all caches that include this video's shared metadata/counts."""
    invalidate_videos_list_cache()
    invalidate_video_detail_cache(video_id)
