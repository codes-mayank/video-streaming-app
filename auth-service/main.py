from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import Base
from app.api.auth import router as auth_router
from app.core.config import settings
from app.database import Base, engine


def ensure_schema_created() -> None:
    Base.metadata.create_all(bind=engine)


app = FastAPI(title="auth-service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ensure_schema_created()


@app.get("/test")
def test():
    return {"message": "Name is Mayank"}


app.include_router(auth_router, prefix="/auth", tags=["Auth"])


@app.get("/")
def root():
    return {"message": "Welcome to the auth-service"}
