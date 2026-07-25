import json

from kafka import KafkaConsumer

from app.core.config import settings


def _bootstrap_servers():
    return [item.strip() for item in settings.KAFKA_BOOTSTRAP_SERVERS.split(",") if item.strip()]


def get_subscription_events_consumer() -> KafkaConsumer:
    return KafkaConsumer(
        settings.KAFKA_SUBSCRIPTION_EVENTS_TOPIC,
        bootstrap_servers=_bootstrap_servers(),
        group_id=settings.KAFKA_CONSUMER_GROUP,
        auto_offset_reset="earliest",
        enable_auto_commit=False,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )


def get_engagement_events_consumer() -> KafkaConsumer:
    return KafkaConsumer(
        settings.KAFKA_ENGAGEMENT_EVENTS_TOPIC,
        bootstrap_servers=_bootstrap_servers(),
        group_id=settings.KAFKA_ENGAGEMENT_CONSUMER_GROUP,
        auto_offset_reset="earliest",
        enable_auto_commit=False,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )
