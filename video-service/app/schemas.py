from datetime import datetime

from pydantic import BaseModel, Field


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


class VideoUploadInitResponse(BaseModel):
    video_id: int
    file_key: str
    storage_base_prefix: str
    upload_url: str
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
    created_at: datetime
    updated_at: datetime
    playback_url: str | None = None

    model_config = {"from_attributes": True}


class VideoListResponse(BaseModel):
    items: list[VideoResponse]
    limit: int
    offset: int
    total: int


class VideoUploadJsonRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    content_type: str = Field(..., min_length=1, max_length=100)
    file_base64: str = Field(..., min_length=1)
    user_id: str = Field(..., min_length=1, max_length=128)
    video_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="User-facing filename base (no extension); used in object key paths.",
    )
    uploaded_by: str | None = Field(default=None, max_length=255)


class TranscodeUpdateRequest(BaseModel):
    status: str = Field(..., min_length=1, max_length=50)
    hls_master_key: str | None = Field(default=None, max_length=500)
    hls_prefix: str | None = Field(default=None, max_length=500)
