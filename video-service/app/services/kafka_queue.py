import json

from kafka import KafkaProducer

from app.core.config import settings


def _bootstrap_servers() -> list[str]:
    return [item.strip() for item in settings.KAFKA_BOOTSTRAP_SERVERS.split(",") if item.strip()]


def get_producer() -> KafkaProducer:
    return KafkaProducer(
        bootstrap_servers=_bootstrap_servers(),
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )


def publish_transcode_job(
    video_id: int,
    file_key: str,
    content_type: str,
    *,
    output_base_prefix: str | None = None,
    segment_basename: str | None = None,
) -> None:
    body: dict = {"video_id": video_id, "file_key": file_key, "content_type": content_type}
    if output_base_prefix:
        body["output_base_prefix"] = output_base_prefix
    if segment_basename:
        body["segment_basename"] = segment_basename
    producer = get_producer()
    try:
        producer.send(settings.KAFKA_VIDEO_TOPIC, body).get(timeout=10)
    finally:
        producer.flush()
        producer.close()


def try_publish_transcode_job(
    video_id: int,
    file_key: str,
    content_type: str,
    *,
    output_base_prefix: str | None = None,
    segment_basename: str | None = None,
) -> tuple[bool, str | None]:
    try:
        publish_transcode_job(
            video_id,
            file_key,
            content_type,
            output_base_prefix=output_base_prefix,
            segment_basename=segment_basename,
        )
        return True, None
    except Exception as exc:
        return False, str(exc)

