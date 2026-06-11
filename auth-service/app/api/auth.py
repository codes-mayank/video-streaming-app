from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.core.security import get_password_hash, create_access_token, verify_password, create_token_payload, get_current_user
from app.database import get_db
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.schemas import UserIn, UserLogin, UserOut, Token, GoogleLoginRequest, ProfileImageUploadInitRequest, ProfileImageUploadInitResponse, ProfileImageUploadCompleteRequest, ProfileImageUploadCompleteResponse, EditProfileRequest
from app.models import User
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
from google.oauth2 import id_token
from google.auth.transport import requests
from pydantic import BaseModel
from app.adapter.auth import AuthAdapter
import base64
import boto3
from app.services.s3 import check_object_exists, is_supported_image_type, build_profile_photo_key, build_public_url, generate_presigned_upload_url


router = APIRouter()

def _set_auth_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        key=settings.ACCESS_TOKEN_COOKIE_NAME,
        value=access_token,
        httponly=True,
        samesite="lax",
        path="/",
    )

def _require_storage_config() -> None:
    required_values = [
        settings.AWS_ACCESS_KEY_ID,
        settings.AWS_SECRET_ACCESS_KEY,
        settings.AWS_ENDPOINT_URL,
        settings.AWS_BUCKET_NAME,
    ]
    if not all(required_values):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Storage is not configured. Set AWS_* environment variables.",
        )

@router.post("/google/login")
async def google_login(request: GoogleLoginRequest, response: Response, db: Session = Depends(get_db)):
    """Login or register user with Google OAuth"""
    
    try:
        # Verify the Google tokenresponse: Response
        idinfo = id_token.verify_oauth2_token(
            request.token, 
            requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )
        
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        
        email = idinfo['email']
        google_id = idinfo['sub']
        full_name = idinfo.get('name', '')
        profile_image_url = idinfo.get('picture', '')
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )
    
    # Check if user exists by email or google_id
    user = db.query(User).filter(
        or_(User.email == email, User.google_id == google_id)
    ).first()
    
    if user:
        # User exists - link Google account if not already linked
        if not user.google_id:
            user.google_id = google_id
        user.profile_image_url = profile_image_url
        # if not user.profile_picture:
            # user.profile_picture = profile_picture  # Update picture from Google
        db.commit()
        db.refresh(user)
    else:
        # Create new user with Google account
        # Generate unique username from email
        base_username = email.split('@')[0]
        username = base_username
        counter = 1
        
        # Ensure username is unique
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1
        
        user = User(
            email=email,
            username=username,
            full_name=full_name,
            google_id=google_id,
            profile_image_url=profile_image_url,
            hashed_password=None  # No password for Google-only users
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Check if user is disabled
    if user.disabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    # Generate JWT token using your existing function
    access_token = create_access_token(data=create_token_payload(user).model_dump())
    
    _set_auth_cookie(response, access_token)
    
    return user  # Return user object, matches your UserOut schema



@router.post("/signup", response_model=UserOut)
async def signup(response: Response, user_in: UserIn, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(
        or_(
            User.username == user_in.username,
            User.email == user_in.email,
        )).all()
    
    AuthAdapter().validate_signup_user(existing_user, user_in)

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    _set_auth_cookie(
        response,
        create_access_token(data=create_token_payload(new_user).model_dump()),
    )

    return new_user
 
@router.post("/profile-photo-upload/initiate", response_model=ProfileImageUploadInitResponse)
async def profile_photo_upload_initiate(
    payload: ProfileImageUploadInitRequest,
    token: Token = Depends(get_current_user),
):
    _require_storage_config()
    if not is_supported_image_type(payload.content_type):
        raise HTTPException(400, detail="Unsupported image type")
    file_key = build_profile_photo_key(token.user_id, payload.content_type)
    upload_url = generate_presigned_upload_url(file_key, payload.content_type)

    return ProfileImageUploadInitResponse(
        file_key=file_key,
        upload_url=upload_url,
        expires_in_seconds=settings.AWS_PRESIGNED_EXPIRES_SECONDS,
    )

@router.post("/profile-photo-upload/complete", response_model=ProfileImageUploadCompleteResponse)
async def profile_photo_upload_complete(
    payload: ProfileImageUploadCompleteRequest,
    token: Token = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_storage_config()
    excepted_prefix = f"profile-photos/{token.user_id}/"
    if not payload.file_key.startswith(excepted_prefix):
        raise HTTPException(403, detail="Invalid file key")
    if not check_object_exists(payload.file_key):
        raise HTTPException(409, detail="Upload not found in storage.")
    
    user = db.query(User).filter(User.id == token.user_id).first()
    if not user:
        raise HTTPException(404, detail="User not found")
    profile_image_url = build_public_url(payload.file_key)
    user.profile_image_url = profile_image_url
    db.commit()

    return ProfileImageUploadCompleteResponse(profile_image_url=profile_image_url)
    
@router.patch("/edit-profile", response_model=UserOut)
async def edit_profile(
    payload: EditProfileRequest, 
    token: Token = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.username and payload.username != user.username:
        if db.query(User).filter(User.username == payload.username).first():
            raise HTTPException(400, detail="Username already exists")
        user.username = payload.username
    if payload.email and payload.email != user.email:
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(400, detail="Email already exists")
        user.email = payload.email
    if payload.full_name is not None:
        user.full_name = payload.full_name
    db.commit()
    db.refresh(user)
    return user
    return user

@router.get("/me", response_model=UserOut)
async def read_users_me(token: Token = Depends(get_current_user), db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).filter(User.id == token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user



@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(settings.ACCESS_TOKEN_COOKIE_NAME, path="/")
    return {"message": "Logged out successfully"}



@router.post("/login", response_model=UserOut)
async def login(response: Response, user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(
                    or_(
                        User.username == user.username_or_email, 
                        User.email == user.username_or_email
                    )
                ).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Incorrect username or email")
    if not db_user.hashed_password or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    
    access_token = create_access_token(data=create_token_payload(db_user).model_dump())
    _set_auth_cookie(response, access_token)
    return db_user