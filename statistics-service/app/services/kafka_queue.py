import json

from kafka import KafkaConsumer

from app.core.config import settings


def _bootstrap_servers() -> list[str]:
    return [item.strip() for item in settings.KAFKA_BOOTSTRAP_SERVERS.split(",") if item.strip()]


def _kafka_security_kwargs() -> dict:
    """Auth for Confluent Cloud (SASL_SSL + PLAIN). Local Docker stays PLAINTEXT."""
    protocol = (settings.KAFKA_SECURITY_PROTOCOL or "PLAINTEXT").strip().upper()
    kwargs: dict = {"security_protocol": protocol}
    if protocol.startswith("SASL"):
        username = (settings.KAFKA_SASL_USERNAME or "").strip()
        password = settings.KAFKA_SASL_PASSWORD or ""
        if not username or not password:
            raise RuntimeError(
                "KAFKA_SECURITY_PROTOCOL is SASL but KAFKA_SASL_USERNAME / "
                "KAFKA_SASL_PASSWORD are missing (required for Confluent Cloud)."
            )
        kwargs["sasl_mechanism"] = (settings.KAFKA_SASL_MECHANISM or "PLAIN").strip()
        kwargs["sasl_plain_username"] = username
        kwargs["sasl_plain_password"] = password
    return kwargs


def _base_consumer_kwargs() -> dict:
    return {
        "bootstrap_servers": _bootstrap_servers(),
        "auto_offset_reset": "earliest",
        "enable_auto_commit": False,
        "value_deserializer": lambda m: json.loads(m.decode("utf-8")),
        **_kafka_security_kwargs(),
    }


def get_subscription_events_consumer() -> KafkaConsumer:
    return KafkaConsumer(
        settings.KAFKA_SUBSCRIPTION_EVENTS_TOPIC,
        group_id=settings.KAFKA_CONSUMER_GROUP,
        **_base_consumer_kwargs(),
    )


def get_engagement_events_consumer() -> KafkaConsumer:
    return KafkaConsumer(
        settings.KAFKA_ENGAGEMENT_EVENTS_TOPIC,
        group_id=settings.KAFKA_ENGAGEMENT_CONSUMER_GROUP,
        **_base_consumer_kwargs(),
    )
