from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    APP_NAME: str = "video-service"
    DEBUG: bool = False

    DATABASE_URL: str = ""

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_ENDPOINT_URL: str = ""
    AWS_REGION: str = "auto"
    AWS_BUCKET_NAME: str = "videos"
    AWS_PRESIGNED_EXPIRES_SECONDS: int = 900
    AWS_PUBLIC_BASE_URL: str = ""

    SECRET_KEY: str = "secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_COOKIE_NAME: str = "access_token"

    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_VIDEO_TOPIC: str = "video-transcode-jobs"
    KAFKA_SUBSCRIPTION_EVENTS_TOPIC: str = "subscription-events"
    KAFKA_ENGAGEMENT_EVENTS_TOPIC: str = "engagement-events"
    # Confluent Cloud: SASL_SSL + PLAIN + API key/secret. Local Docker: PLAINTEXT.
    KAFKA_SECURITY_PROTOCOL: str = "PLAINTEXT"
    KAFKA_SASL_MECHANISM: str = "PLAIN"
    KAFKA_SASL_USERNAME: str = ""
    KAFKA_SASL_PASSWORD: str = ""


settings = Settings()
