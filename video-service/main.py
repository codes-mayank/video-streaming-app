from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

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

Base.metadata.create_all(bind=engine)

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
        "R2_ACCESS_KEY_ID": settings.R2_ACCESS_KEY_ID,
        "R2_SECRET_ACCESS_KEY": settings.R2_SECRET_ACCESS_KEY,
        "R2_ENDPOINT_URL": settings.R2_ENDPOINT_URL,
        "R2_REGION": settings.R2_REGION,
        "R2_BUCKET_NAME": settings.R2_BUCKET_NAME,
        "R2_PUBLIC_BASE_URL": settings.R2_PUBLIC_BASE_URL,
        "AWS_ACCESS_KEY_ID": settings.AWS_ACCESS_KEY_ID,
        "AWS_SECRET_ACCESS_KEY": settings.AWS_SECRET_ACCESS_KEY,
        "AWS_ENDPOINT_URL": settings.AWS_ENDPOINT_URL,
        "AWS_REGION": settings.AWS_REGION
    }