from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_SERVICE_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILE = _SERVICE_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Prefer process env (Azure/ACA). Local .env is used when present.
        env_file=str(_ENV_FILE) if _ENV_FILE.is_file() else None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = ""

    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_SUBSCRIPTION_EVENTS_TOPIC: str = "subscription-events"
    KAFKA_ENGAGEMENT_EVENTS_TOPIC: str = "engagement-events"
    KAFKA_CONSUMER_GROUP: str = "statistics-service-group"
    KAFKA_ENGAGEMENT_CONSUMER_GROUP: str = "statistics-engagement-group"
    # Confluent Cloud: SASL_SSL + PLAIN + API key/secret. Local Docker: PLAINTEXT.
    KAFKA_SECURITY_PROTOCOL: str = "PLAINTEXT"
    KAFKA_SASL_MECHANISM: str = "PLAIN"
    KAFKA_SASL_USERNAME: str = ""
    KAFKA_SASL_PASSWORD: str = ""

    # Flush when either threshold is hit.
    SUBSCRIPTION_BATCH_SIZE: int = 50
    SUBSCRIPTION_BATCH_FLUSH_SECONDS: float = 5.0
    SUBSCRIPTION_POLL_TIMEOUT_MS: int = 1000

    ENGAGEMENT_BATCH_SIZE: int = 50
    ENGAGEMENT_BATCH_FLUSH_SECONDS: float = 5.0
    ENGAGEMENT_POLL_TIMEOUT_MS: int = 1000
    # Exit worker process after consecutive idle polls on both consumers.
    STATS_EXIT_ON_IDLE: bool = True
    STATS_MAX_IDLE_POLLS: int = 10

    # Optional — engagement counter sync is skipped if Redis is unreachable.
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0


settings = Settings()

if not settings.DATABASE_URL.strip():
    raise RuntimeError(
        "DATABASE_URL is not set. Set it in the environment or statistics-service/.env "
        "(use the same value as video-service)."
    )
