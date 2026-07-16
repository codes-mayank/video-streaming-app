from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql+psycopg2://mayank:root@localhost/video_stream_app"

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_ENDPOINT_URL: str = ""
    AWS_REGION: str = "auto"
    AWS_BUCKET_NAME: str = "videos"
    AWS_PRESIGNED_EXPIRES_SECONDS: int = 900
    AWS_PUBLIC_BASE_URL: str = ""

    # App Settings
    APP_NAME: str = "FastAPI App Backend"
    DEBUG: bool = False

    SECRET_KEY: str = "secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    ACCESS_TOKEN_COOKIE_NAME: str = "access_token"
    REFRESH_TOKEN_COOKIE_NAME: str = "refresh_token"
    GOOGLE_CLIENT_ID: Optional[str] = None


settings = Settings()
