import traceback

import requests

from app.core.config import settings
from app.services.kafka_queue import get_consumer
from app.services.transcoder import transcode_to_hls


def notify_video_service(video_id: int, status: str, hls_master_key: str | None = None, hls_prefix: str | None = None) -> None:
    url = f"{settings.VIDEO_SERVICE_BASE_URL.rstrip('/')}/videos/{video_id}/transcode-result"
    payload = {"status": status, "hls_master_key": hls_master_key, "hls_prefix": hls_prefix}
    r = requests.post(url, json=payload, timeout=settings.VIDEO_SERVICE_TIMEOUT_SECONDS)
    if not r.ok:
        print(f"[transcoder] callback failed {r.status_code}: {r.text[:500]}", flush=True)


def process_message(payload: dict) -> None:
    video_id = int(payload["video_id"])
    source_key = payload["file_key"]
    output_base_prefix = payload.get("output_base_prefix") or f"hls/{video_id}"
    segment_basename = payload.get("segment_basename") or "video"

    print(
        f"[transcoder] received job video_id={video_id} prefix={output_base_prefix} basename={segment_basename}",
        flush=True,
    )
    notify_video_service(video_id, "transcoding")
    try:
        prefix, master_key = transcode_to_hls(
            video_id=video_id,
            source_key=source_key,
            bucket_name=settings.AWS_BUCKET_NAME,
            output_base_prefix=output_base_prefix,
            segment_basename=segment_basename,
        )
        notify_video_service(video_id, "ready", hls_master_key=master_key, hls_prefix=prefix)
        print(f"[transcoder] done video_id={video_id}", flush=True)
    except Exception as exc:
        notify_video_service(video_id, "transcode_failed")
        print(f"[transcoder] failed video_id={video_id}: {exc}", flush=True)
        traceback.print_exc()


def main() -> None:
    print("[transcoder] starting consumer", flush=True)
    consumer = get_consumer()
    print("[transcoder] waiting for kafka jobs", flush=True)
    for msg in consumer:
        process_message(msg.value)


if __name__ == "__main__":
    main()
