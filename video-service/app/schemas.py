from datetime import datetime

from pydantic import BaseModel, Field


class VideoUploadInitRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    content_type: str = Field(..., min_length=1, max_length=100)
    size_bytes: int = Field(..., gt=0)
    uploaded_by: str | None = Field(default=None, max_length=255)


class VideoUploadInitResponse(BaseModel):
    video_id: int
    file_key: str
    upload_url: str
    expires_in_seconds: int


class VideoCompleteUploadResponse(BaseModel):
    id: int
    status: str
    file_key: str | None = None
    bucket: str | None = None


class VideoResponse(BaseModel):
    id: int
    title: str
    description: str | None
    file_key: str
    status: str
    content_type: str
    size_bytes: int
    uploaded_by: str | None
    created_at: datetime
    updated_at: datetime
    playback_url: str | None = None

    model_config = {"from_attributes": True}


class VideoListResponse(BaseModel):
    items: list[VideoResponse]
    limit: int
    offset: int
    total: int


class VideoProxyUploadRequest(BaseModel):
    content_type: str = Field(..., min_length=1, max_length=100)
    file_base64: str = Field(..., min_length=1)


class VideoUploadJsonRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    content_type: str = Field(..., min_length=1, max_length=100)
    file_base64: str = Field(..., min_length=1)
    uploaded_by: str | None = Field(default=None, max_length=255)
