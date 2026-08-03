import json

from kafka import KafkaConsumer

from app.core.config import settings


def _bootstrap_servers() -> list[str]:
    return [item.strip() for item in settings.KAFKA_BOOTSTRAP_SERVERS.split(",") if item.strip()]


def get_consumer() -> KafkaConsumer:
    """Kafka consumer tuned for Container Apps Jobs: poll, process, commit, exit."""
    return KafkaConsumer(
        settings.KAFKA_VIDEO_TOPIC,
        bootstrap_servers=_bootstrap_servers(),
        group_id=settings.KAFKA_CONSUMER_GROUP,
        auto_offset_reset="earliest",
        enable_auto_commit=False,
        consumer_timeout_ms=max(1000, settings.KAFKA_CONSUMER_TIMEOUT_MS),
        max_poll_interval_ms=max(60_000, settings.KAFKA_MAX_POLL_INTERVAL_MS),
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )
