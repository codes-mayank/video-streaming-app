from pydantic import BaseModel
from datetime import datetime


# Blog Schemas
class BlogBase(BaseModel):
    title: str
    tag: str
    body: str
    featured_photo: str

    class Config:
        orm_mode = True


class BlogCreate(BlogBase):
    pass


class BlogUpdate(BlogBase):
    pass


class BlogOut(BlogBase):
    id: int
    slug: str
    author_id: int
    created_at: datetime
    # likes_count: int


class BlogOutWithAuthor(BlogBase):
    id: int
    slug: str
    author_id: int
    tag: str
    created_at: datetime
    author_fullname: str
    author_username: str
    is_liked: bool = False
    likes_count: int = 0


# Token Schemas
class Token(BaseModel):
    sub: str
    user_id: int
    email: str


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


class UserLogin(BaseModel):
    username_or_email: str
    password: str

class LikeResponse(BaseModel):
    message: str
    blog_id: int
    likes_count: int
    is_liked_by_me: bool

    class Config:
        from_attributes = True