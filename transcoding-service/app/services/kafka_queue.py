import json

from kafka import KafkaConsumer

from app.core.config import settings


def _bootstrap_servers() -> list[str]:
    return [item.strip() for item in settings.KAFKA_BOOTSTRAP_SERVERS.split(",") if item.strip()]


def get_consumer() -> KafkaConsumer:
    return KafkaConsumer(
        settings.KAFKA_VIDEO_TOPIC,
        bootstrap_servers=_bootstrap_servers(),
        group_id=settings.KAFKA_CONSUMER_GROUP,
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )
