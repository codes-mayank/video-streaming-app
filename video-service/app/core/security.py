from typing import Optional

from fastapi import HTTPException, Request
from jose import JWTError, jwt

from app.core.config import settings


class AuthToken:
    def __init__(self, sub: str, user_id: int, email: str):
        self.sub = sub
        self.user_id = user_id
        self.email = email


def _decode_token(token: str) -> AuthToken:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return AuthToken(
            sub=payload["sub"],
            user_id=payload["user_id"],
            email=payload["email"],
        )
    except (JWTError, KeyError) as exc:
        raise HTTPException(status_code=401, detail="Could not validate credentials") from exc


def get_current_user(request: Request) -> AuthToken:
    token = request.cookies.get(settings.ACCESS_TOKEN_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return _decode_token(token)


def get_current_user_optional(request: Request) -> Optional[AuthToken]:
    token = request.cookies.get(settings.ACCESS_TOKEN_COOKIE_NAME)
    if not token:
        return None
    try:
        return _decode_token(token)
    except HTTPException:
        return None
