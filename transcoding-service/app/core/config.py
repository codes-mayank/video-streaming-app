from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_ENDPOINT_URL: str = ""
    AWS_REGION: str = "auto"
    AWS_BUCKET_NAME: str = "videos"

    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_VIDEO_TOPIC: str = "video-transcode-jobs"
    KAFKA_CONSUMER_GROUP: str = "video-transcoder-group"

    FFMPEG_BINARY: str = "ffmpeg"
    FFPROBE_BINARY: str = "ffprobe"
    TRANSCODE_WORKDIR: str = "/tmp/video-transcoder"
    # HLS segment length in seconds (smaller = more .ts chunk files, faster start).
    HLS_SEGMENT_SECONDS: int = 4

    VIDEO_SERVICE_BASE_URL: str = "http://127.0.0.1:8000"
    # Long transcodes can exceed default HTTP timeouts; increase if callbacks fail mid-job.
    VIDEO_SERVICE_TIMEOUT_SECONDS: int = 120


settings = Settings()
