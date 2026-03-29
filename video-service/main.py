from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.videos import router as videos_router
from app.database import Base, engine


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
