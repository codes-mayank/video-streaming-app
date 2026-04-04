from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "video-service"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+psycopg2://root:root@localhost/video_stream_app"

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_ENDPOINT_URL: str = ""
    AWS_REGION: str = "auto"
    AWS_BUCKET_NAME: str = "videos"
    AWS_PRESIGNED_EXPIRES_SECONDS: int = 900
    AWS_PUBLIC_BASE_URL: str = ""

    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_VIDEO_TOPIC: str = "video-transcode-jobs"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
