from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_SERVICE_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILE = _SERVICE_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = ""

    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_SUBSCRIPTION_EVENTS_TOPIC: str = "subscription-events"
    KAFKA_ENGAGEMENT_EVENTS_TOPIC: str = "engagement-events"
    KAFKA_CONSUMER_GROUP: str = "statistics-service-group"
    KAFKA_ENGAGEMENT_CONSUMER_GROUP: str = "statistics-engagement-group"

    # Flush when either threshold is hit.
    SUBSCRIPTION_BATCH_SIZE: int = 50
    SUBSCRIPTION_BATCH_FLUSH_SECONDS: float = 5.0
    SUBSCRIPTION_POLL_TIMEOUT_MS: int = 1000

    ENGAGEMENT_BATCH_SIZE: int = 50
    ENGAGEMENT_BATCH_FLUSH_SECONDS: float = 5.0
    ENGAGEMENT_POLL_TIMEOUT_MS: int = 1000

    # Prefer REDIS_URL for Upstash (rediss://...). Host/port used when URL is empty.
    REDIS_URL: str = ""
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""
    REDIS_SSL: bool = False
    REDIS_CONNECT_TIMEOUT: float = 5.0
    REDIS_SOCKET_TIMEOUT: float = 5.0


settings = Settings()

if not settings.DATABASE_URL.strip():
    raise RuntimeError(
        f"DATABASE_URL is not set. Add it to {_ENV_FILE} "
        "(use the same value as video-service)."
    )
