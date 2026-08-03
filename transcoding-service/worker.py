import sys
import traceback

import requests

from app.core.config import settings
from app.services.kafka_queue import get_consumer
from app.services.transcoder import transcode_to_hls


def notify_video_service(
    video_id: int,
    status: str,
    hls_master_key: str | None = None,
    hls_prefix: str | None = None,
    duration_seconds: int | None = None,
    thumbnail_key: str | None = None,
    thumbnail_content_type: str | None = None,
) -> None:
    url = f"{settings.VIDEO_SERVICE_BASE_URL.rstrip('/')}/videos/{video_id}/transcode-result"
    payload = {
        "status": status,
        "hls_master_key": hls_master_key,
        "hls_prefix": hls_prefix,
        "duration_seconds": duration_seconds,
        "thumbnail_key": thumbnail_key,
        "thumbnail_content_type": thumbnail_content_type,
    }
    r = requests.post(url, json=payload, timeout=settings.VIDEO_SERVICE_TIMEOUT_SECONDS)
    if not r.ok:
        print(f"[transcoder] callback failed {r.status_code}: {r.text[:500]}", flush=True)


def process_message(payload: dict) -> bool:
    """Transcode one Kafka payload. Returns True on success, False on failure."""
    video_id = int(payload["video_id"])
    source_key = payload["file_key"]
    output_base_prefix = payload.get("output_base_prefix") or f"hls/{video_id}"
    segment_basename = payload.get("segment_basename") or "video"
    thumbnail_output_key = payload.get("thumbnail_output_key")

    print(
        f"[transcoder] received job video_id={video_id} prefix={output_base_prefix} basename={segment_basename}",
        flush=True,
    )
    notify_video_service(video_id, "transcoding")
    try:
        prefix, master_key, duration_seconds, thumbnail_key = transcode_to_hls(
            video_id=video_id,
            source_key=source_key,
            bucket_name=settings.AWS_BUCKET_NAME,
            output_base_prefix=output_base_prefix,
            segment_basename=segment_basename,
            thumbnail_output_key=thumbnail_output_key,
        )
        notify_video_service(
            video_id,
            "ready",
            hls_master_key=master_key,
            hls_prefix=prefix,
            duration_seconds=duration_seconds,
            thumbnail_key=thumbnail_key,
            thumbnail_content_type="image/jpeg" if thumbnail_key else None,
        )
        print(f"[transcoder] done video_id={video_id}", flush=True)
        return True
    except Exception as exc:
        notify_video_service(video_id, "transcode_failed")
        print(f"[transcoder] failed video_id={video_id}: {exc}", flush=True)
        traceback.print_exc()
        return False


def main() -> int:
    """
    Batch-and-exit entrypoint for Azure Container Apps Jobs.

    - Processes up to MAX_MESSAGES_PER_RUN messages
    - Commits offsets only after successful work (unless COMMIT_ON_FAILURE)
    - Exits 0 when idle or all processed OK; exits 1 if any job failed
    """
    max_messages = max(1, settings.MAX_MESSAGES_PER_RUN)
    print(
        f"[transcoder] starting job run max_messages={max_messages} "
        f"consumer_timeout_ms={settings.KAFKA_CONSUMER_TIMEOUT_MS}",
        flush=True,
    )

    consumer = get_consumer()
    processed = 0
    failures = 0

    try:
        for msg in consumer:
            ok = process_message(msg.value)
            if ok or settings.COMMIT_ON_FAILURE:
                consumer.commit()
                if ok:
                    print("[transcoder] committed offset", flush=True)
                else:
                    print("[transcoder] committed offset after failure (COMMIT_ON_FAILURE)", flush=True)
                    failures += 1
            else:
                failures += 1
                print(
                    "[transcoder] left offset uncommitted so the message can be retried",
                    flush=True,
                )

            processed += 1
            if processed >= max_messages:
                break
    finally:
        consumer.close()

    if processed == 0:
        print("[transcoder] no messages; exiting", flush=True)
        return 0

    print(
        f"[transcoder] finished processed={processed} failures={failures}",
        flush=True,
    )
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
