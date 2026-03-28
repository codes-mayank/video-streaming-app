from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+psycopg2://root:root@localhost/test"

    # App Settings
    APP_NAME: str = "FastAPI App Backend"
    DEBUG: bool = False

    SECRET_KEY: str = 'secret-key'
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    ACCESS_TOKEN_COOKIE_NAME: str = "access_token"
    GOOGLE_CLIENT_ID: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()