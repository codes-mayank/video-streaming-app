from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.core.security import get_password_hash, create_access_token, verify_password, create_token_payload, get_current_user
from app.database import get_db
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.schemas import UserIn, UserLogin, UserOut, Token
from app.models import User
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
from google.oauth2 import id_token
from google.auth.transport import requests
import os
from pydantic import BaseModel


router = APIRouter()

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

class GoogleLoginRequest(BaseModel):
    token: str

@router.post("/google/login")
async def google_login(request: GoogleLoginRequest, response: Response, db: Session = Depends(get_db)):
    """Login or register user with Google OAuth"""
    
    try:
        # Verify the Google tokenresponse: Response
        idinfo = id_token.verify_oauth2_token(
            request.token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        
        email = idinfo['email']
        google_id = idinfo['sub']
        full_name = idinfo.get('name', '')
        # picture = idinfo.get('picture', '')
        
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
            # profile_picture=profile_picture,
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
    
    # Set cookie (same as your other endpoints)
    response.set_cookie(
        key=settings.ACCESS_TOKEN_COOKIE_NAME, 
        value=access_token,
        httponly=True
    )
    
    return user  # Return user object, matches your UserOut schema



    # Check if user exists by email
    # user = db.query(User).filter(
    #     or_(User.email == email, User.google_id == google_id)
    # ).first()
    
    # if user:
    #     # User exists - link Google account if not already linked
    #     if not user.google_id:
    #         user.google_id = google_id
    #         user.picture = picture  # Update picture from Google
    #         db.commit()
    # else:
    #     # Create new user with Google account
    #     user = User(
    #         email=email,
    #         username=email.split('@')[0],  # Generate username from email
    #         name=name,
    #         google_id=google_id,
    #         picture=picture,
    #         is_verified=True  # Google emails are already verified
    #     )
    #     db.add(user)
    #     db.commit()
    #     db.refresh(user)
    
    # # Generate your existing JWT token
    # access_token = create_access_token(data={"sub": user.email, "user_id": user.id})
    
    # return {
    #     "access_token": access_token,
    #     "token_type": "bearer",
    #     "user": {
    #         "id": user.id,
    #         "email": user.email,
    #         "username": user.username,
    #         "name": user.name,
    #         "picture": user.picture
    #     }
    # }



@router.post("/signup", response_model=UserOut)
async def signup(response: Response, user: UserIn, db: Session = Depends(get_db)):
    existing_name = db.query(User).filter(User.username == user.username).first()
    if existing_name:
        raise HTTPException(status_code=400, detail="Username already registered")
    existing_email = db.query(User).filter(User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password
    )
    # Check if user exists by email or google_id
    user = db.query(User).filter(
        or_(User.email == email, User.google_id == google_id)
    ).first()
    
    if user:
        # User exists - link Google account if not already linked
        if not user.google_id:
            user.google_id = google_id
        # if not user.profile_picture:
        #     user.profile_picture = profile_picture  # Update picture from Google
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
            # profile_picture=profile_picture,
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
    
    # Set cookie (same as your other endpoints)
    response.set_cookie(
        key=settings.ACCESS_TOKEN_COOKIE_NAME, 
        value=access_token,
        httponly=True
    )
    
    return user  # Return user object, matches your UserOut schema
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    access_token = create_access_token(data=create_token_payload(db_user).model_dump())
    response.set_cookie(
        key=settings.ACCESS_TOKEN_COOKIE_NAME, 
        value=access_token,
        httponly=True
    )
    return db_user

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
    response.delete_cookie(settings.ACCESS_TOKEN_COOKIE_NAME)
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
    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    
    access_token = create_access_token(data=create_token_payload(db_user).model_dump())
    response.set_cookie(
        key=settings.ACCESS_TOKEN_COOKIE_NAME, 
        value=access_token,
        httponly=True
    )
    return db_user