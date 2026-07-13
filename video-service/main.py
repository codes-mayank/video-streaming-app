from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import inspect, text

from app.api.videos import router as videos_router
from app.database import Base, engine
from app.core.config import settings
from app.services.redis import redis_client


app = FastAPI(title="video-service", version="1.0.0")
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    if "thumbnail_key" not in existing:
        alters.append("ALTER TABLE videos ADD COLUMN thumbnail_key VARCHAR(500)")
    if "thumbnail_content_type" not in existing:
        alters.append("ALTER TABLE videos ADD COLUMN thumbnail_content_type VARCHAR(100)")
    if "category" not in existing:
        alters.append("ALTER TABLE videos ADD COLUMN category VARCHAR(50) DEFAULT 'other' NOT NULL")
    if alters:
        with engine.begin() as conn:
            for sql in alters:
                conn.execute(text(sql))


def ensure_video_likes_table() -> None:
    inspector = inspect(engine)
    if "video_likes" in inspector.get_table_names():
        return
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE video_likes (
                    user_id INTEGER NOT NULL,
                    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, video_id)
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX idx_video_likes_video_id ON video_likes (video_id)"))
        if "users" in inspector.get_table_names():
            conn.execute(
                text(
                    """
                    ALTER TABLE video_likes
                    ADD CONSTRAINT fk_video_likes_user
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    """
                )
            )


def ensure_video_comments_table() -> None:
    inspector = inspect(engine)
    if "video_comments" in inspector.get_table_names():
        return
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE video_comments (
                    id SERIAL PRIMARY KEY,
                    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL,
                    username VARCHAR(50) NOT NULL,
                    body TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX idx_video_comments_video_id ON video_comments (video_id)"))
        conn.execute(text("CREATE INDEX idx_video_comments_user_id ON video_comments (user_id)"))


ensure_schema_created()
ensure_video_columns()
ensure_video_likes_table()
ensure_video_comments_table()

app.include_router(videos_router, prefix='/videos', tags=["Videos"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/redis-test")
def redis_test():
    redis_client.set("hello", "Mayank")
    value = redis_client.get("hello")

    return {
        "redis": value
    }

@app.get("/upload", include_in_schema=False)
def upload_page():
    return FileResponse("frontend/upload.html")


@app.get("/player", include_in_schema=False)
def player_page():
    return FileResponse("frontend/player.html")