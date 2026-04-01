from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "video-service"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+psycopg2://root:root@localhost/video_stream_app"

    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_ENDPOINT_URL: str = ""
    R2_REGION: str = "auto"
    R2_BUCKET_NAME: str = "videos"
    R2_PRESIGNED_EXPIRES_SECONDS: int = 900
    R2_PUBLIC_BASE_URL: str = ""

    # Backward-compatible aliases (if existing env uses AWS_* names).
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_ENDPOINT_URL: str = ""
    AWS_REGION: str = "auto"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()


def effective_r2_access_key_id() -> str:
    return settings.R2_ACCESS_KEY_ID or settings.AWS_ACCESS_KEY_ID


def effective_r2_secret_access_key() -> str:
    return settings.R2_SECRET_ACCESS_KEY or settings.AWS_SECRET_ACCESS_KEY


def effective_r2_endpoint_url() -> str:
    return settings.R2_ENDPOINT_URL or settings.AWS_ENDPOINT_URL


def effective_r2_region() -> str:
    return settings.R2_REGION or settings.AWS_REGION or "auto"
