from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.categories import DEFAULT_VIDEO_CATEGORY, normalize_category


class VideoUploadInitRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    content_type: str = Field(..., min_length=1, max_length=100)
    size_bytes: int = Field(..., gt=0)
    user_id: str = Field(..., min_length=1, max_length=128)
    video_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="User-facing filename base (no extension); used in object key paths.",
    )
    uploaded_by: str | None = Field(default=None, max_length=255)
    thumbnail_content_type: str | None = Field(default=None, min_length=1, max_length=100)
    thumbnail_size_bytes: int | None = Field(default=None, gt=0)
    category: str = Field(default=DEFAULT_VIDEO_CATEGORY, max_length=50)

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        return normalize_category(value)


class VideoUploadInitResponse(BaseModel):
    video_id: int
    file_key: str
    storage_base_prefix: str
    upload_url: str
    thumbnail_key: str | None = None
    thumbnail_upload_url: str | None = None
    expires_in_seconds: int


class VideoCompleteUploadResponse(BaseModel):
    id: int
    status: str
    file_key: str | None = None
    bucket: str | None = None
    # Original upload lives at file_key; adaptive HLS (multi-res .ts chunks) is written under this prefix by transcoding-service.
    hls_output_prefix: str | None = None
    transcode_job_queued: bool = False
    transcode_queue_error: str | None = None


class VideoResponse(BaseModel):
    id: int
    title: str
    description: str | None
    file_key: str
    status: str
    content_type: str
    size_bytes: int
    uploaded_by: str | None
    user_id: str | None = None
    storage_base_prefix: str | None = None
    video_basename: str | None = None
    hls_master_key: str | None = None
    hls_prefix: str | None = None
    thumbnail_key: str | None = None
    thumbnail_content_type: str | None = None
    category: str = DEFAULT_VIDEO_CATEGORY
    views: int = 0
    duration_seconds: int | None = None
    created_at: datetime
    updated_at: datetime
    playback_url: str | None = None
    thumbnail_url: str | None = None
    like_count: int = 0
    liked: bool | None = None

    model_config = {"from_attributes": True}


class LikeStatusResponse(BaseModel):
    video_id: int
    like_count: int
    liked: bool


class CommentCreateRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


class CommentResponse(CommentCreateRequest):
    id: int
    video_id: int
    user_id: int
    username: str
    created_at: datetime
    is_owner: bool | None = None

    model_config = {"from_attributes": True}


class CommentListResponse(BaseModel):
    items: list[CommentResponse]
    limit: int
    next_cursor: int | None
    has_more: bool
    total: int


class VideoListResponse(BaseModel):
    items: list[VideoResponse]
    limit: int
    next_cursor: int | None
    has_more: bool


class TranscodeUpdateRequest(BaseModel):
    status: str = Field(..., min_length=1, max_length=50)
    hls_master_key: str | None = Field(default=None, max_length=500)
    hls_prefix: str | None = Field(default=None, max_length=500)
    duration_seconds: int | None = Field(default=None, ge=0)
    thumbnail_key: str | None = Field(default=None, max_length=500)
    thumbnail_content_type: str | None = Field(default=None, max_length=100)


class User(BaseModel):
    user_id: int
    username: str
    email: str
    role: str
    created_at: datetime
    updated_at: datetime

class SubscriptionResponse(BaseModel):
    user_id: int
    channel_id: int
    created_at: datetime | None = None

class UserListResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    profile_image_url: str | None = None
    disabled: bool
    profile_image_url: str | None = None