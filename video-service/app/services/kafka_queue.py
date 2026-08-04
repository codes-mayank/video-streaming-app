import json

from kafka import KafkaProducer

from app.core.config import settings


def _bootstrap_servers() -> list[str]:
    return [item.strip() for item in settings.KAFKA_BOOTSTRAP_SERVERS.split(",") if item.strip()]


def _kafka_security_kwargs() -> dict:
    """Auth for Confluent Cloud (SASL_SSL + PLAIN). Local Docker stays PLAINTEXT."""
    protocol = (settings.KAFKA_SECURITY_PROTOCOL or "PLAINTEXT").strip().upper()
    kwargs: dict = {"security_protocol": protocol}
    if protocol.startswith("SASL"):
        kwargs["sasl_mechanism"] = (settings.KAFKA_SASL_MECHANISM or "PLAIN").strip()
        kwargs["sasl_plain_username"] = settings.KAFKA_SASL_USERNAME
        kwargs["sasl_plain_password"] = settings.KAFKA_SASL_PASSWORD
    return kwargs


def get_producer() -> KafkaProducer:
    return KafkaProducer(
        bootstrap_servers=_bootstrap_servers(),
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        **_kafka_security_kwargs(),
    )


def publish_transcode_job(
    video_id: int,
    file_key: str,
    content_type: str,
    *,
    output_base_prefix: str | None = None,
    segment_basename: str | None = None,
    thumbnail_output_key: str | None = None,
) -> None:
    body: dict = {"video_id": video_id, "file_key": file_key, "content_type": content_type}
    if output_base_prefix:
        body["output_base_prefix"] = output_base_prefix
    if segment_basename:
        body["segment_basename"] = segment_basename
    if thumbnail_output_key:
        body["thumbnail_output_key"] = thumbnail_output_key
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
    thumbnail_output_key: str | None = None,
) -> tuple[bool, str | None]:
    try:
        publish_transcode_job(
            video_id,
            file_key,
            content_type,
            output_base_prefix=output_base_prefix,
            segment_basename=segment_basename,
            thumbnail_output_key=thumbnail_output_key,
        )
        return True, None
    except Exception as exc:
        return False, str(exc)


def publish_subscription_event(
    *,
    event_type: str,
    user_id: int,
    channel_id: int,
) -> None:
    body = {
        "event_type": event_type,
        "user_id": user_id,
        "channel_id": channel_id,
    }
    producer = get_producer()
    try:
        producer.send(settings.KAFKA_SUBSCRIPTION_EVENTS_TOPIC, body).get(timeout=10)
    finally:
        producer.flush()
        producer.close()


def try_publish_subscription_event(
    *,
    event_type: str,
    user_id: int,
    channel_id: int,
) -> tuple[bool, str | None]:
    try:
        publish_subscription_event(
            event_type=event_type,
            user_id=user_id,
            channel_id=channel_id,
        )
        return True, None
    except Exception as exc:
        return False, str(exc)


def publish_engagement_event(**payload) -> None:
    producer = get_producer()
    try:
        producer.send(settings.KAFKA_ENGAGEMENT_EVENTS_TOPIC, payload).get(timeout=10)
    finally:
        producer.flush()
        producer.close()


def try_publish_engagement_event(**payload) -> tuple[bool, str | None]:
    try:
        publish_engagement_event(**payload)
        return True, None
    except Exception as exc:
        return False, str(exc)
