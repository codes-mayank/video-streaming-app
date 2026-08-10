import tempfile
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_TRANSCODE_WORKDIR = str(Path(tempfile.gettempdir()) / "video-transcoder")


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
    # Confluent Cloud: SASL_SSL + PLAIN + API key/secret. Local Docker: PLAINTEXT.
    KAFKA_SECURITY_PROTOCOL: str = "PLAINTEXT"
    KAFKA_SASL_MECHANISM: str = "PLAIN"
    KAFKA_SASL_USERNAME: str = ""
    KAFKA_SASL_PASSWORD: str = ""
    # Must exceed the longest expected transcode so the group does not rebalance mid-job.
    KAFKA_MAX_POLL_INTERVAL_MS: int = 7_200_000  # 2 hours

    # If true, commit offset after marking transcode_failed (avoids poison-message loops).
    COMMIT_ON_FAILURE: bool = False

    FFMPEG_BINARY: str = "ffmpeg"
    FFPROBE_BINARY: str = "ffprobe"
    TRANSCODE_WORKDIR: str = _DEFAULT_TRANSCODE_WORKDIR
    # HLS segment length in seconds (smaller = more .ts chunk files, faster start).
    HLS_SEGMENT_SECONDS: int = 4

    VIDEO_SERVICE_BASE_URL: str = "http://127.0.0.1:8000"
    # Long transcodes can exceed default HTTP timeouts; increase if callbacks fail mid-job.
    VIDEO_SERVICE_TIMEOUT_SECONDS: int = 120


settings = Settings()
