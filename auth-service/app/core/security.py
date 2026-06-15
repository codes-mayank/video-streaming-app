import bcrypt
from fastapi import Request, HTTPException
from typing import Optional
from datetime import datetime, timedelta, timezone
from jose import jwt
from app.core.config import settings
from app.models import User
from app.schemas import Token


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_token_payload(user_db: User) -> Token:
    return Token(
        sub=user_db.username,
        user_id=user_db.id,
        email=user_db.email
    )

def verify_token(token: str) -> Optional[Token]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return Token(**payload)
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
def get_current_user(request: Request) -> Token:
    token = request.cookies.get(settings.ACCESS_TOKEN_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check for Bearer token in headers as fallback (optional but good practice)
    # auth_header = request.headers.get('Authorization')
    # if not token and auth_header and auth_header.startswith('Bearer '):
    #     token = auth_header.split(' ')[1]

    return verify_token(token)

def get_current_user_optional(request: Request) -> Optional[Token]:
    """
    Get current user if logged in, otherwise return None.
    This doesn't raise an error if user is not authenticated.
    """
    token = request.cookies.get(settings.ACCESS_TOKEN_COOKIE_NAME)
    
    if not token:
        return None