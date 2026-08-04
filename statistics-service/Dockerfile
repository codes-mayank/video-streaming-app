# Statistics service — Kafka batch worker
# Build for Azure / linux servers, e.g.:
#   docker build --platform linux/amd64 -t statistics-service .
FROM --platform=linux/amd64 python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .

USER appuser

CMD ["python", "-u", "worker.py"]
