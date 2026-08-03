# Transcoding service — Kafka worker + FFmpeg
# Build for Azure Container Apps (linux/amd64), e.g.:
#   docker build --platform linux/amd64 -t transcoding-service .
FROM --platform=linux/amd64 python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TRANSCODE_WORKDIR=/tmp/video-transcoder

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 --shell /usr/sbin/nologin appuser \
    && mkdir -p /tmp/video-transcoder \
    && chown appuser:appuser /tmp/video-transcoder

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .

USER appuser

CMD ["python", "-u", "worker.py"]
