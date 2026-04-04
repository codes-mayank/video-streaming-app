from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import inspect, text

from app.api.videos import router as videos_router
from app.database import Base, engine
from app.core.config import settings


app = FastAPI(title="video-service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def ensure_schema_created() -> None:
    Base.metadata.create_all(bind=engine)


def ensure_video_columns() -> None:
    inspector = inspect(engine)
    if "videos" not in inspector.get_table_names():
        return
    existing = {c["name"] for c in inspector.get_columns("videos")}
    alters: list[str] = []
    if "user_id" not in existing:
        alters.append("ALTER TABLE videos ADD COLUMN user_id VARCHAR(128)")
    if "storage_base_prefix" not in existing:
        alters.append("ALTER TABLE videos ADD COLUMN storage_base_prefix VARCHAR(512)")
    if "video_basename" not in existing:
        alters.append("ALTER TABLE videos ADD COLUMN video_basename VARCHAR(255)")
    if alters:
        with engine.begin() as conn:
            for sql in alters:
                conn.execute(text(sql))


ensure_schema_created()
ensure_video_columns()

app.include_router(videos_router, prefix="/videos", tags=["Videos"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/upload", include_in_schema=False)
def upload_page():
    return FileResponse("frontend/upload.html")

@app.get("/print-envs")
def print_envs() -> dict[str, str]:
    return {
        "AWS_ACCESS_KEY_ID": settings.AWS_ACCESS_KEY_ID,
        "AWS_SECRET_ACCESS_KEY": settings.AWS_SECRET_ACCESS_KEY,
        "AWS_ENDPOINT_URL": settings.AWS_ENDPOINT_URL,
        "AWS_REGION": settings.AWS_REGION,
        "AWS_BUCKET_NAME": settings.AWS_BUCKET_NAME,
        "AWS_PRESIGNED_EXPIRES_SECONDS": str(settings.AWS_PRESIGNED_EXPIRES_SECONDS),
        "AWS_PUBLIC_BASE_URL": settings.AWS_PUBLIC_BASE_URL,
    }