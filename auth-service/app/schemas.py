from pydantic import BaseModel
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    sub: str
    user_id: int
    email: str

class GoogleLoginRequest(BaseModel):
    token: str

# User Schemas
class UserBase(BaseModel):
    username: str
    email: str | None = None
    full_name: str | None = None


class UserIn(UserBase):
    password: str
    

class UserInDB(UserBase):
    id: int
    hashed_password: str
    disabled: bool | None = None


class UserOut(UserBase):
    id: int
    profile_image_url: str | None = None

    model_config = {
        "from_attributes": True
    }

# Profile Image Upload Schemas
class ProfileImageUploadInitRequest(BaseModel):
    content_type: str

class ProfileImageUploadInitResponse(BaseModel):
    file_key: str
    upload_url: str
    expires_in_seconds: int

class ProfileImageUploadCompleteRequest(BaseModel):
    file_key: str

class ProfileImageUploadCompleteResponse(BaseModel):
    profile_image_url: str

#Edit Profile Schemas
class EditProfileRequest(BaseModel):
    username: str | None = None
    email: str | None = None
    full_name: str | None = None

# User Login Schemas
class UserLogin(BaseModel):
    username_or_email: str
    password: str
